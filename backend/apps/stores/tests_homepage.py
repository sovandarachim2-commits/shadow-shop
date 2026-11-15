from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Store, StoreMembership


class StoreHomepageTests(TestCase):
    list_url = '/api/stores/public/list/'

    def setUp(self):
        self.client = APIClient()
        self.admin = get_user_model().objects.create_user(username='store-home-admin', role='super_admin')
        self.owner = get_user_model().objects.create_user(username='store-home-owner', role='store_owner')

    def store(self, name, **fields):
        data = dict(status='active', is_published=True, is_public_approved=True, show_on_homepage=True)
        data.update(fields)
        return Store.objects.create(name=name, **data)

    def test_homepage_requires_every_visibility_condition(self):
        visible = self.store('Visible', is_verified=False, category='Beauty')
        for name, fields in [
            ('Inactive', {'status': 'inactive'}), ('Draft', {'is_published': False}),
            ('Unapproved', {'is_public_approved': False}), ('Not on homepage', {'show_on_homepage': False}),
        ]:
            self.store(name, **fields)
        response = self.client.get(self.list_url, {'homepage': 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data['results']], [visible.id])
        self.assertFalse(response.data['results'][0]['is_verified'])
        self.assertEqual(response.data['results'][0]['category'], 'Beauty')
        self.assertNotIn('pending_name', response.data['results'][0])

    def test_featured_stores_then_display_order_and_all_stores_directory(self):
        later = self.store('Later', homepage_display_order=8)
        first = self.store('First', homepage_display_order=1)
        featured = self.store('Featured', is_featured=True, homepage_display_order=10)
        directory_only = self.store('Directory only', show_on_homepage=False, homepage_display_order=0)
        home = self.client.get(self.list_url, {'homepage': 1}).data['results']
        self.assertEqual([row['id'] for row in home], [featured.id, first.id, later.id])
        directory = self.client.get(self.list_url).data['results']
        self.assertIn(directory_only.id, [row['id'] for row in directory])

    def test_hidden_stores_cannot_be_opened_by_slug(self):
        hidden = self.store('Unpublished', is_published=False)
        self.assertEqual(self.client.get(f'/api/stores/public/{hidden.slug}/').status_code, 404)
        visible = self.store('Open store', show_on_homepage=False)
        self.assertEqual(self.client.get(f'/api/stores/public/{visible.slug}/').status_code, 200)

    def test_owner_cannot_publish_approve_or_feature_their_store(self):
        store = self.store('Owner store', is_published=False, is_public_approved=False)
        StoreMembership.objects.create(store=store, user=self.owner, role='owner')
        self.client.force_authenticate(self.owner)
        for field in ('is_published', 'is_public_approved', 'show_on_homepage', 'is_featured', 'is_verified', 'homepage_display_order'):
            response = self.client.patch(f'/api/stores/admin/stores/{store.id}/', {field: 1}, format='json')
            self.assertEqual(response.status_code, 400, (field, response.data))
        store.refresh_from_db()
        self.assertFalse(store.is_published)
        self.assertFalse(store.is_public_approved)
        response = self.client.patch('/api/stores/admin/stores/my-store/', {'is_public_approved': True}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        response = self.client.patch('/api/stores/admin/stores/my-store/', {'category': 'Skincare'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['category'], 'Skincare')

    def test_admin_save_reload_and_public_visibility_without_creating_duplicates(self):
        store = self.store('Managed', is_published=False, is_public_approved=False, show_on_homepage=False)
        before = Store.objects.count()
        self.client.force_authenticate(self.admin)
        url = f'/api/stores/admin/stores/{store.id}/'
        payload = {'is_published': True, 'is_public_approved': True, 'show_on_homepage': True,
                   'is_featured': True, 'homepage_display_order': 3, 'category': 'Cosmetics'}
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        reloaded = self.client.get(url).data
        for key, value in payload.items():
            self.assertEqual(reloaded[key], value)
        self.assertEqual(Store.objects.count(), before)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.list_url, {'homepage': 1}).data['results'][0]['id'], store.id)

    def test_negative_order_is_rejected_and_search_uses_store_fields(self):
        store = self.store('Muru Beauty', category='Cosmetics')
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f'/api/stores/admin/stores/{store.id}/', {'homepage_display_order': -1}, format='json')
        self.assertEqual(response.status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.list_url, {'search': 'Cosmetics'}).data['count'], 1)
        self.assertEqual(self.client.get(self.list_url, {'search': 'Not present'}).data['count'], 0)
