from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, RolePermission
from apps.products.models import Announcement
from utils.storefront_cache import ANNOUNCEMENTS_PUBLIC_CACHE_KEY, get_storefront_revision, safe_cache_get

User = get_user_model()


class AnnouncementBarTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='ann_admin',
            password='Password123!',
            role='admin',
            email='ann_admin@example.com',
        )
        self.customer = User.objects.create_user(
            username='ann_customer',
            password='Password123!',
            role='customer',
            email='ann_customer@example.com',
        )
        self.seller = User.objects.create_user(
            username='ann_seller',
            password='Password123!',
            role='seller',
            email='ann_seller@example.com',
        )

    def _base_payload(self, **overrides):
        data = {
            'title': 'Free Shipping Banner',
            'message_en': 'Free delivery on orders over $30!',
            'message_km': 'ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញចាប់ពី $30!',
            'mobile_message_en': 'Free delivery $30+',
            'mobile_message_km': 'ដឹកឥតគិតថ្លៃ $30+',
            'icon': 'truck',
            'link_url': '/shop',
            'link_text': 'Shop Now',
            'link_text_km': 'ទិញឥឡូវ',
            'open_in_new_tab': False,
            'background_color': '#111827',
            'text_color': '#FFFFFF',
            'font_size': 14,
            'font_weight': 'bold',
            'alignment': 'center',
            'height': 42,
            'padding_x': 16,
            'border_radius': 0,
            'icon_size': 16,
            'icon_color': '#F472B6',
            'show_close_button': True,
            'animation_type': 'slide',
            'animation_speed': 6,
            'animation_direction': 'left',
            'transition_duration': 350,
            'rotation_delay': 4500,
            'reduced_motion': False,
            'is_active': True,
            'priority': 0,
            'language_rule': 'all',
            'page_display_mode': 'all',
            'target_pages': [],
            'target_stores': [],
            'target_delivery_areas': [],
        }
        data.update(overrides)
        return data

    def test_create_draft_does_not_appear_publicly_until_published(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/products/announcements/', self._base_payload(save_mode='draft'), format='json')
        self.assertEqual(res.status_code, 201, res.data)
        ann_id = res.data['id']
        self.assertEqual(res.data['status'], 'draft')

        self.client.force_authenticate(user=None)
        pub = self.client.get('/api/products/announcements/public/')
        self.assertEqual(pub.status_code, 200)
        self.assertEqual(pub.data, [])

        self.client.force_authenticate(user=self.admin)
        pub_action = self.client.post(f'/api/products/announcements/{ann_id}/publish/')
        self.assertEqual(pub_action.status_code, 200)
        self.assertEqual(pub_action.data['status'], 'published')

        self.client.force_authenticate(user=None)
        pub_after = self.client.get('/api/products/announcements/public/')
        self.assertEqual(pub_after.status_code, 200)
        self.assertEqual(len(pub_after.data), 1)
        self.assertEqual(pub_after.data[0]['message_en'], 'Free delivery on orders over $30!')
        self.assertEqual(pub_after.data[0]['message_km'], 'ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញចាប់ពី $30!')

    def test_draft_edits_to_published_announcement_do_not_affect_live_storefront(self):
        self.client.force_authenticate(user=self.admin)
        created = self.client.post('/api/products/announcements/', self._base_payload(save_mode='publish'), format='json')
        self.assertEqual(created.status_code, 201)
        ann_id = created.data['id']

        # Edit and save as draft -> live storefront must still show original published text/color
        draft_edit = self.client.patch(
            f'/api/products/announcements/{ann_id}/',
            {'message_en': 'UNPUBLISHED DRAFT TEXT', 'background_color': '#DC2626', 'save_mode': 'draft'},
            format='json',
        )
        self.assertEqual(draft_edit.status_code, 200)
        self.assertTrue(draft_edit.data['has_unpublished_changes'])

        self.client.force_authenticate(user=None)
        live = self.client.get('/api/products/announcements/public/')
        self.assertEqual(len(live.data), 1)
        self.assertEqual(live.data[0]['message_en'], 'Free delivery on orders over $30!')
        self.assertEqual(live.data[0]['background_color'], '#111827')

        # Now publish -> live storefront updates
        self.client.force_authenticate(user=self.admin)
        published = self.client.post(f'/api/products/announcements/{ann_id}/publish/')
        self.assertEqual(published.status_code, 200)
        self.assertFalse(published.data['has_unpublished_changes'])

        self.client.force_authenticate(user=None)
        live_updated = self.client.get('/api/products/announcements/public/')
        self.assertEqual(live_updated.data[0]['message_en'], 'UNPUBLISHED DRAFT TEXT')
        self.assertEqual(live_updated.data[0]['background_color'], '#DC2626')

    def test_scheduling_and_expiration_filtering(self):
        now = timezone.now()
        self.client.force_authenticate(user=self.admin)
        # Future scheduled announcement
        self.client.post(
            '/api/products/announcements/',
            self._base_payload(
                title='Future',
                message_en='Starts tomorrow',
                start_at=(now + timedelta(days=1)).isoformat(),
                end_at=(now + timedelta(days=3)).isoformat(),
                save_mode='publish',
            ),
            format='json',
        )
        # Expired announcement
        self.client.post(
            '/api/products/announcements/',
            self._base_payload(
                title='Expired',
                message_en='Ended yesterday',
                start_at=(now - timedelta(days=3)).isoformat(),
                end_at=(now - timedelta(days=1)).isoformat(),
                save_mode='publish',
            ),
            format='json',
        )
        # Currently active scheduled announcement
        self.client.post(
            '/api/products/announcements/',
            self._base_payload(
                title='Current',
                message_en='Active right now',
                start_at=(now - timedelta(hours=2)).isoformat(),
                end_at=(now + timedelta(hours=2)).isoformat(),
                save_mode='publish',
            ),
            format='json',
        )

        self.client.force_authenticate(user=None)
        pub = self.client.get('/api/products/announcements/public/')
        self.assertEqual(pub.status_code, 200)
        self.assertEqual(len(pub.data), 1)
        self.assertEqual(pub.data[0]['message_en'], 'Active right now')

    def test_reorder_duplicate_toggle_unpublish_and_cache_invalidation(self):
        self.client.force_authenticate(user=self.admin)
        a1 = self.client.post('/api/products/announcements/', self._base_payload(title='First', message_en='First msg', priority=0, save_mode='publish'), format='json').data
        a2 = self.client.post('/api/products/announcements/', self._base_payload(title='Second', message_en='Second msg', priority=1, save_mode='publish'), format='json').data

        rev_before = get_storefront_revision()
        self.client.post('/api/products/announcements/reorder/', {'ordered_ids': [a2['id'], a1['id']]}, format='json')
        self.assertGreater(get_storefront_revision(), rev_before)

        pub = self.client.get('/api/products/announcements/public/')
        self.assertEqual([item['message_en'] for item in pub.data], ['Second msg', 'First msg'])
        self.assertIsNotNone(safe_cache_get(ANNOUNCEMENTS_PUBLIC_CACHE_KEY))

        # Disable a2
        toggle = self.client.post(f"/api/products/announcements/{a2['id']}/toggle-active/", {'is_active': False}, format='json')
        self.assertEqual(toggle.status_code, 200)
        self.assertFalse(toggle.data['is_active'])
        pub_after_toggle = self.client.get('/api/products/announcements/public/')
        self.assertEqual([item['message_en'] for item in pub_after_toggle.data], ['First msg'])

        # Duplicate a1 -> creates inactive draft copy
        dup = self.client.post(f"/api/products/announcements/{a1['id']}/duplicate/")
        self.assertEqual(dup.status_code, 201)
        self.assertEqual(dup.data['status'], 'draft')
        self.assertFalse(dup.data['is_active'])
        self.assertIn('(Copy)', dup.data['title'])

        # Unpublish a1 -> no public announcements left
        unpub = self.client.post(f"/api/products/announcements/{a1['id']}/unpublish/")
        self.assertEqual(unpub.status_code, 200)
        pub_empty = self.client.get('/api/products/announcements/public/')
        self.assertEqual(pub_empty.data, [])

    def test_security_validation_rejects_unsafe_urls_scripts_and_css(self):
        self.client.force_authenticate(user=self.admin)

        bad_url = self.client.post('/api/products/announcements/', self._base_payload(link_url='javascript:alert(1)'), format='json')
        self.assertEqual(bad_url.status_code, 400)
        self.assertIn('link_url', bad_url.data)

        bad_proto_rel = self.client.post('/api/products/announcements/', self._base_payload(link_url='//evil.example.com'), format='json')
        self.assertEqual(bad_proto_rel.status_code, 400)

        bad_script = self.client.post('/api/products/announcements/', self._base_payload(message_en='<script>alert(1)</script>Sale'), format='json')
        self.assertEqual(bad_script.status_code, 400)
        self.assertIn('message_en', bad_script.data)

        bad_gradient = self.client.post(
            '/api/products/announcements/',
            self._base_payload(use_gradient=True, gradient_css='url(https://evil.test/x.png)'),
            format='json',
        )
        self.assertEqual(bad_gradient.status_code, 400)
        self.assertIn('gradient_css', bad_gradient.data)

        now = timezone.now()
        bad_dates = self.client.post(
            '/api/products/announcements/',
            self._base_payload(start_at=now.isoformat(), end_at=(now - timedelta(hours=1)).isoformat()),
            format='json',
        )
        self.assertEqual(bad_dates.status_code, 400)
        self.assertIn('end_at', bad_dates.data)

    def test_role_permissions_enforce_access_control(self):
        # Anonymous cannot list admin endpoints
        self.assertEqual(self.client.get('/api/products/announcements/').status_code, 401)
        self.assertEqual(self.client.post('/api/products/announcements/', self._base_payload(), format='json').status_code, 401)

        # Customer cannot access admin endpoints
        self.client.force_authenticate(user=self.customer)
        self.assertEqual(self.client.get('/api/products/announcements/').status_code, 403)
        self.assertEqual(self.client.post('/api/products/announcements/', self._base_payload(), format='json').status_code, 403)

        # Seller without marketing_announcements permission is denied
        self.client.force_authenticate(user=self.seller)
        self.assertEqual(self.client.get('/api/products/announcements/').status_code, 403)

        # Grant view-only permission to seller
        view_perm, _ = Permission.objects.get_or_create(module='marketing_announcements', action='view')
        RolePermission.objects.get_or_create(role='seller', permission=view_perm, defaults={'granted': True})

        self.assertEqual(self.client.get('/api/products/announcements/').status_code, 200)
        self.assertEqual(self.client.post('/api/products/announcements/', self._base_payload(), format='json').status_code, 403)

        ann = Announcement.objects.create(message_en='Admin item', status='draft')
        self.assertEqual(self.client.post(f'/api/products/announcements/{ann.id}/publish/').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/products/announcements/{ann.id}/').status_code, 403)

