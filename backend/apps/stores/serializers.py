from rest_framework import serializers
from .models import PartnerInquiry, Store, StoreContract, StoreMembership, StorePayout

class PartnerInquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerInquiry
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class StoreContractSerializer(serializers.ModelSerializer):
    days_remaining = serializers.ReadOnlyField()
    store_name = serializers.ReadOnlyField(source='store.name')
    store_code = serializers.ReadOnlyField(source='store.code')
    end_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = StoreContract
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class StoreMembershipSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')
    user_full_name = serializers.SerializerMethodField()
    phone = serializers.ReadOnlyField(source='user.phone')
    store_name = serializers.ReadOnlyField(source='store.name')

    class Meta:
        model = StoreMembership
        fields = '__all__'
        read_only_fields = ('id', 'assigned_at')

    def get_user_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username


class StoreSerializer(serializers.ModelSerializer):
    current_contract = StoreContractSerializer(read_only=True)
    is_contract_valid = serializers.ReadOnlyField()
    memberships = StoreMembershipSerializer(many=True, read_only=True)
    staff_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    def get_staff_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_products_count(self, obj):
        return getattr(obj, 'products', None) and obj.products.filter(is_active=True).count() or 0

    code = serializers.CharField(required=False, allow_blank=True)
    slug = serializers.SlugField(required=False, allow_blank=True)

    # Optional write-only contract fields for atomic 1-step creation
    contract_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    contract_start_date = serializers.DateField(write_only=True, required=False)
    contract_end_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2, write_only=True, required=False)
    bank_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    bank_account_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    bank_account_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Store
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        # Handle string URLs or empty strings for ImageFields so DRF doesn't fail with
        # "The submitted data was not a file. Check the encoding type on the form."
        if hasattr(data, '_mutable'):
            data = data.copy()
        elif isinstance(data, dict):
            data = data.copy()

        for field in ('logo', 'banner'):
            if field in data:
                val = data[field]
                if isinstance(val, str):
                    clean_val = val.strip()
                    if (
                        not clean_val
                        or clean_val.startswith('http://')
                        or clean_val.startswith('https://')
                        or clean_val.startswith('/media/')
                        or clean_val.startswith('blob:')
                    ):
                        data.pop(field, None)
                    elif clean_val in ('null', 'None'):
                        data[field] = None
                elif val is None:
                    data[field] = None

        return super().to_internal_value(data)

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        platform_admin = bool(user and (getattr(user, 'is_superuser', False) or getattr(user, 'role', '') in ('admin', 'super_admin')))
        controlled = {'is_published', 'is_public_approved', 'show_on_homepage', 'is_featured', 'homepage_display_order', 'is_verified'}
        if not platform_admin and controlled.intersection(attrs):
            raise serializers.ValidationError({field: 'Only platform administrators can manage public store visibility.' for field in controlled.intersection(attrs)})
        return attrs

    def create(self, validated_data):
        contract_number = validated_data.pop('contract_number', None)
        contract_start_date = validated_data.pop('contract_start_date', None)
        contract_end_date = validated_data.pop('contract_end_date', None)
        commission_rate = validated_data.pop('commission_rate', None)
        bank_name = validated_data.pop('bank_name', 'ABA Bank')
        bank_account_name = validated_data.pop('bank_account_name', '')
        bank_account_number = validated_data.pop('bank_account_number', '')

        store = super().create(validated_data)

        if contract_number and contract_start_date:
            StoreContract.objects.create(
                store=store,
                contract_number=contract_number,
                start_date=contract_start_date,
                end_date=contract_end_date or None,
                commission_rate=5.00 if commission_rate is None else commission_rate,
                bank_name=bank_name or 'ABA Bank',
                bank_account_name=bank_account_name,
                bank_account_number=bank_account_number,
                is_active=True,
            )
        return store


class PublicStoreSerializer(serializers.ModelSerializer):
    """Safe serializer for public website storefronts."""
    class Meta:
        model = Store
        fields = (
            'id', 'name', 'code', 'slug', 'store_type', 'status',
            'logo', 'banner', 'phone', 'telegram_username', 'email', 'province',
            'district', 'address', 'description', 'bio', 'is_verified', 'category',
            'is_published', 'is_public_approved', 'show_on_homepage',
            'is_featured', 'homepage_display_order',
        )


class StorePayoutSerializer(serializers.ModelSerializer):
    store_name = serializers.ReadOnlyField(source='store.name')

    class Meta:
        model = StorePayout
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

