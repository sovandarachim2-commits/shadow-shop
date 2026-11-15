from rest_framework import generics, viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from utils.permissions import IsAdminOrSuperAdmin, IsStaff
from .models import PartnerInquiry, Store, StoreContract, StoreMembership, StorePayout
from .serializers import (
    PartnerInquirySerializer,
    StoreSerializer,
    PublicStoreSerializer,
    StoreContractSerializer,
    StoreMembershipSerializer,
    StorePayoutSerializer,
)


class PublicPartnerInquiryCreateView(generics.CreateAPIView):
    """Public endpoint for vendors to submit 'Sell With Us' inquiries."""
    queryset = PartnerInquiry.objects.all()
    serializer_class = PartnerInquirySerializer
    permission_classes = [AllowAny]


class PublicStoreListView(generics.ListAPIView):
    """Published and approved stores, with a separate homepage visibility filter."""
    serializer_class = PublicStoreSerializer
    permission_classes = [AllowAny]
    search_fields = ['name', 'category', 'province', 'district']

    def get_queryset(self):
        queryset = Store.objects.filter(status='active')
        if str(self.request.query_params.get('homepage', '')).lower() in ('1', 'true'):
            queryset = queryset.filter(show_on_homepage=True)
        return queryset.order_by('-is_featured', 'homepage_display_order', 'name', 'pk')


class PublicStoreDetailView(generics.RetrieveAPIView):
    """Public endpoint to view a specific store by slug (e.g. /store/:slug)."""
    queryset = Store.objects.filter(status='active')
    serializer_class = PublicStoreSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


class AdminPartnerInquiryViewSet(viewsets.ModelViewSet):
    """Super Admin management of partner inquiry leads."""
    queryset = PartnerInquiry.objects.all()
    serializer_class = PartnerInquirySerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class AdminStoreViewSet(viewsets.ModelViewSet):
    """Super Admin & Store Owner management of stores."""
    queryset = Store.objects.all().select_related('created_by').prefetch_related('contracts', 'memberships', 'products')
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        qs = Store.objects.all().select_related('created_by').prefetch_related('contracts', 'memberships', 'products')
        if user.is_authenticated and user.role in ['seller', 'store_owner', 'store_manager']:
            return qs.filter(memberships__user=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
        try:
            from utils.storefront_cache import bump_storefront_cache
            bump_storefront_cache()
        except Exception:
            pass

    def perform_update(self, serializer):
        serializer.save()
        try:
            from utils.storefront_cache import bump_storefront_cache
            bump_storefront_cache()
        except Exception:
            pass

    def perform_destroy(self, instance):
        instance.delete()
        from utils.storefront_cache import bump_storefront_cache
        bump_storefront_cache()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        today = timezone.now().date()
        in_30_days = today + timedelta(days=30)
        user = request.user
        
        base_stores = self.get_queryset()
        total_stores = base_stores.count()
        active_stores = base_stores.filter(status='active').count()

        contract_qs = StoreContract.objects.all()
        if user.is_authenticated and user.role in ['seller', 'store_owner', 'store_manager']:
            contract_qs = contract_qs.filter(store__memberships__user=user)

        expiring_soon = contract_qs.filter(
            is_active=True,
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=in_30_days
        ).count()
        expired_contracts = contract_qs.filter(
            is_active=True,
            end_date__isnull=False,
            end_date__lt=today
        ).count()
        new_inquiries = PartnerInquiry.objects.filter(status='new').count() if user.role in ['super_admin', 'admin'] else 0
        pending_name_changes = base_stores.filter(name_change_status='pending').count()

        return Response({
            'total_stores': total_stores,
            'active_stores': active_stores,
            'expiring_soon': expiring_soon,
            'expired_contracts': expired_contracts,
            'new_inquiries': new_inquiries,
            'pending_name_changes': pending_name_changes,
        })

    @action(detail=False, methods=['get', 'patch'], url_path='my-store')
    def my_store(self, request):
        user = request.user
        membership = user.store_memberships.filter(is_active=True).select_related('store').first()
        if not membership or not membership.store:
            if user.role in ['super_admin', 'admin']:
                store = Store.objects.first()
                if not store:
                    return Response({'detail': 'No store found.'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'detail': 'No active store found for this account.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            store = membership.store

        if request.method == 'PATCH':
            requested_name = request.data.get('name')
            cancel_name = request.data.get('cancel_name_change')

            serializer = StoreSerializer(store, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            if user.role not in ['super_admin', 'admin']:
                serializer.validated_data.pop('is_verified', None)
                serializer.validated_data.pop('name', None)
                serializer.validated_data.pop('code', None)
                serializer.validated_data.pop('slug', None)
                serializer.validated_data.pop('store_type', None)

                if cancel_name:
                    store.pending_name = ''
                    store.name_change_status = 'none'
                    store.name_change_requested_at = None
                    store.save(update_fields=['pending_name', 'name_change_status', 'name_change_requested_at'])
                elif requested_name and str(requested_name).strip() and str(requested_name).strip() != store.name:
                    store.pending_name = str(requested_name).strip()
                    store.name_change_status = 'pending'
                    store.name_change_requested_at = timezone.now()
                    store.name_change_note = request.data.get('name_change_note', '')
                    store.save(update_fields=['pending_name', 'name_change_status', 'name_change_requested_at', 'name_change_note'])

            serializer.save()
            try:
                from utils.storefront_cache import bump_storefront_cache
                bump_storefront_cache()
            except Exception:
                pass
            return Response(serializer.data)

        serializer = StoreSerializer(store)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='approve-name-change')
    def approve_name_change(self, request, pk=None):
        if request.user.role not in ['super_admin', 'admin']:
            return Response({'detail': 'Only platform administrators can approve store name changes.'}, status=status.HTTP_403_FORBIDDEN)
        store = self.get_object()
        if not store.pending_name:
            return Response({'detail': 'No pending name change for this store.'}, status=status.HTTP_400_BAD_REQUEST)

        old_name = store.name
        new_name = store.pending_name
        store.name = new_name
        store.pending_name = ''
        store.name_change_status = 'approved'
        store.save(update_fields=['name', 'pending_name', 'name_change_status', 'updated_at'])

        try:
            from utils.storefront_cache import bump_storefront_cache
            bump_storefront_cache()
        except Exception:
            pass

        return Response({
            'detail': f"Store name change approved! Store renamed from '{old_name}' to '{new_name}'.",
            'store': StoreSerializer(store).data
        })

    @action(detail=True, methods=['post'], url_path='reject-name-change')
    def reject_name_change(self, request, pk=None):
        if request.user.role not in ['super_admin', 'admin']:
            return Response({'detail': 'Only platform administrators can reject store name changes.'}, status=status.HTTP_403_FORBIDDEN)
        store = self.get_object()
        reason = request.data.get('reason', 'Name change request was rejected by platform administrator.').strip()
        store.name_change_status = 'rejected'
        store.name_change_note = reason
        store.pending_name = ''
        store.save(update_fields=['pending_name', 'name_change_status', 'name_change_note', 'updated_at'])

        return Response({
            'detail': 'Store name change rejected.',
            'store': StoreSerializer(store).data
        })


class AdminStoreContractViewSet(viewsets.ModelViewSet):
    """Super Admin management of store contracts."""
    queryset = StoreContract.objects.all()
    serializer_class = StoreContractSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class AdminStoreMembershipViewSet(viewsets.ModelViewSet):
    """Super Admin & Store Owner management of store staff and memberships."""
    queryset = StoreMembership.objects.all().select_related('store', 'user')
    serializer_class = StoreMembershipSerializer
    permission_classes = [IsAuthenticated, IsStaff]

    def get_queryset(self):
        user = self.request.user
        qs = StoreMembership.objects.all().select_related('store', 'user')
        if user.is_authenticated and user.role in ['seller', 'store_owner', 'store_manager']:
            qs = qs.filter(store__memberships__user=user)
        store_id = self.request.query_params.get('store')
        if store_id:
            qs = qs.filter(store_id=store_id)
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    def perform_create(self, serializer):
        membership = serializer.save()
        user = membership.user
        if user:
            if membership.role == 'owner':
                user.role = 'store_owner'
            elif membership.role == 'manager':
                user.role = 'store_manager'
            elif membership.role == 'cashier':
                user.role = 'cashier'
            elif user.role == 'customer':
                user.role = 'seller'
            user.is_staff = True
            user.save(update_fields=['role', 'is_staff'])

    @action(detail=False, methods=['post'], url_path='create-user-and-assign')
    def create_user_and_assign(self, request):
        store_id = request.data.get('store')
        if not store_id:
            return Response({'store': 'Store ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        store = get_object_or_404(Store, id=store_id)

        username = (request.data.get('username') or '').strip()
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        email = (request.data.get('email') or '').strip()
        phone = (request.data.get('phone') or '').strip()
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        role = request.data.get('role', 'owner')

        # Validation
        if not password:
            return Response({'password': 'Password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if confirm_password is not None and password != confirm_password:
            return Response({'confirm_password': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 6:
            return Response({'password': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()

        # Generate username if not provided
        if not username:
            base = (first_name or (email.split('@')[0] if email else 'user')).lower()
            base = ''.join(c for c in base if c.isalnum()) or 'user'
            import uuid
            username = f"{base}_{uuid.uuid4().hex[:4]}"

        if User.objects.filter(username__iexact=username).exists():
            return Response({'username': f'Username "{username}" is already taken.'}, status=status.HTTP_400_BAD_REQUEST)

        if email and User.objects.filter(email__iexact=email).exists():
            return Response({'email': f'Email "{email}" is already registered.'}, status=status.HTTP_400_BAD_REQUEST)

        if phone and User.objects.filter(phone=phone).exists():
            return Response({'phone': f'Phone number "{phone}" is already registered.'}, status=status.HTTP_400_BAD_REQUEST)

        # Set user system role based on store membership role
        system_role = 'seller'
        if role == 'owner':
            system_role = 'store_owner'
        elif role == 'manager':
            system_role = 'store_manager'
        elif role == 'cashier':
            system_role = 'cashier'

        user = User(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            role=system_role,
            is_staff=True,
            is_active=True,
        )
        user.set_password(password)
        user.save()

        # Create store membership
        membership = StoreMembership.objects.create(
            store=store,
            user=user,
            role=role,
            is_active=True,
        )

        return Response(StoreMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class AdminStorePayoutViewSet(viewsets.ModelViewSet):
    """Super Admin management of vendor settlements and payouts."""
    queryset = StorePayout.objects.all()
    serializer_class = StorePayoutSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    @action(detail=True, methods=['post'])
    def mark_settled(self, request, pk=None):
        payout = self.get_object()
        payout.status = 'completed'
        payout.settled_by = request.user
        payout.settled_at = timezone.now()
        if 'notes' in request.data:
            payout.notes = request.data['notes']
        payout.save()
        return Response(StorePayoutSerializer(payout).data)

