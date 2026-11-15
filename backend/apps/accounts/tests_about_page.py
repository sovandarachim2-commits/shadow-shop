import json
from io import BytesIO
from unittest.mock import patch

from PIL import Image
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Permission, RolePermission, SiteSettings


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class AboutPageSettingsTests(TestCase):
    url = '/api/auth/about-page/'

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = get_user_model().objects.create_user(username='about-admin', password='test-only', role='admin')
        self.settings = SiteSettings.objects.create(store_name='Original Store', footer_menus={'information': {'title': 'Information'}})

    def test_public_can_read_content_but_cannot_open_or_edit_admin_endpoint(self):
        self.assertEqual(self.client.get('/api/auth/site-settings/').status_code, 200)
        self.assertIn(self.client.get(self.url).status_code, (401, 403))
        self.assertIn(self.client.patch(self.url, {'about_page': {}}, format='json').status_code, (401, 403))

    def test_save_reload_and_public_cache_refresh_preserve_other_settings(self):
        self.client.get('/api/auth/site-settings/')
        self.client.force_authenticate(self.admin)
        content = {
            'content': {'en': {'welcome': 'Meet our shop'}, 'km': {'welcome': 'សូមស្វាគមន៍'}},
            'sections': {'services': False, 'telegram': True},
            'contact': {'telegram_url': '@example_shop', 'email': 'shop@example.com'},
        }
        response = self.client.patch(self.url, {'about_page': content}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.client.get(self.url).data['about_page'], content)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/auth/site-settings/').data['about_page'], content)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.store_name, 'Original Store')
        self.assertEqual(self.settings.footer_menus['information']['title'], 'Information')

    def test_view_and_edit_permissions_are_separate_and_limited_to_about_page(self):
        user = get_user_model().objects.create_user(username='about-editor', password='test-only', role='seller')
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        permission = Permission.objects.get(module='settings_about', action='view')
        RolePermission.objects.create(role='seller', permission=permission)
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertEqual(self.client.patch(self.url, {'about_page': {}}, format='json').status_code, 403)
        permission = Permission.objects.get(module='settings_about', action='edit')
        RolePermission.objects.create(role='seller', permission=permission)
        response = self.client.patch(self.url, {'about_page': {'sections': {'stores': False}}, 'store_name': 'Not allowed'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.store_name, 'Original Store')
        self.assertFalse(self.settings.about_page['sections']['stores'])
        self.assertEqual(self.client.patch('/api/auth/site-settings/', {'store_name': 'Not allowed'}, format='json').status_code, 403)

    def test_invalid_content_and_contacts_are_rejected_without_saving(self):
        self.client.force_authenticate(self.admin)
        for invalid in [
            {'content': {'en': {'welcome': ['not text']}}},
            {'sections': {'services': 'false'}},
            {'contact': {'telegram_url': 'javascript:alert(1)'}},
            {'contact': {'email': 'not-an-email'}},
            {'private_config': 'not public content'},
        ]:
            with self.subTest(invalid=invalid):
                response = self.client.patch(self.url, {'about_page': invalid}, format='json')
                self.assertEqual(response.status_code, 400, response.data)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.about_page, {})

    def test_multipart_image_upload_and_return_to_default(self):
        self.client.force_authenticate(self.admin)
        image_bytes = BytesIO()
        Image.new('RGB', (4, 4), 'pink').save(image_bytes, format='PNG')
        upload = SimpleUploadedFile('about.png', image_bytes.getvalue(), content_type='image/png')
        response = self.client.patch(self.url, {
            'about_page': json.dumps({'content': {'en': {'subtitle': 'A new introduction'}}}),
            'about_hero_image': upload,
        }, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('about.png', response.data['about_hero_image_url'])
        response = self.client.patch(self.url, {'clear_about_hero_image': True}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data['about_hero_image_url'])
        self.assertEqual(response.data['about_page']['content']['en']['subtitle'], 'A new introduction')

    @patch('apps.accounts.about_settings.translate_about_fields')
    def test_translation_in_both_directions_is_returned_as_a_draft(self, translate):
        self.client.force_authenticate(self.admin)
        for source, target, text, result in [
            ('en', 'km', 'Shop online', 'ទិញតាមអនឡាញ'),
            ('km', 'en', 'ទិញតាមអនឡាញ', 'Shop online'),
        ]:
            with self.subTest(source=source):
                translate.reset_mock()
                translate.return_value = {'welcome': result}
                response = self.client.post(self.url + 'translate/', {
                    'source_language': source, 'target_language': target,
                    'fields': {'welcome': text, 'subtitle': '   '},
                }, format='json')
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data, {'target_language': target, 'fields': {'welcome': result}})
                translate.assert_called_once_with({'welcome': text}, source, target)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.about_page, {})

    @patch('apps.accounts.about_settings.translate_about_fields')
    def test_translation_requires_edit_permission(self, translate):
        payload = {'source_language': 'en', 'target_language': 'km', 'fields': {'welcome': 'Hello'}}
        self.assertIn(self.client.post(self.url + 'translate/', payload, format='json').status_code, (401, 403))
        viewer = get_user_model().objects.create_user(username='about-viewer', password='test-only', role='seller')
        RolePermission.objects.create(role='seller', permission=Permission.objects.get(module='settings_about', action='view'))
        self.client.force_authenticate(viewer)
        self.assertEqual(self.client.post(self.url + 'translate/', payload, format='json').status_code, 403)
        translate.assert_not_called()

    @patch('apps.accounts.about_settings.translate_about_fields')
    def test_translation_rejects_invalid_requests_before_contacting_provider(self, translate):
        self.client.force_authenticate(self.admin)
        for payload in [
            {'source_language': 'en', 'target_language': 'en', 'fields': {'title': 'Hello'}},
            {'source_language': 'fr', 'target_language': 'km', 'fields': {'title': 'Hello'}},
            {'source_language': 'en', 'target_language': 'km', 'fields': {}},
            {'source_language': 'en', 'target_language': 'km', 'fields': {f'field_{index}': 'Hello' for index in range(33)}},
            {'source_language': 'en', 'target_language': 'km', 'fields': {f'field_{index}': 'A' * 6000 for index in range(4)}},
        ]:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post(self.url + 'translate/', payload, format='json').status_code, 400)
        translate.assert_not_called()

    @patch('apps.accounts.about_settings.translate_about_fields', side_effect=RuntimeError('Provider unavailable'))
    def test_translation_failure_keeps_saved_content(self, _translate):
        self.settings.about_page = {'content': {'en': {'welcome': 'Saved introduction'}}}
        self.settings.save(update_fields=['about_page'])
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.url + 'translate/', {
            'source_language': 'en', 'target_language': 'km', 'fields': {'welcome': 'Unsaved introduction'},
        }, format='json')
        self.assertEqual(response.status_code, 502)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.about_page['content']['en']['welcome'], 'Saved introduction')
