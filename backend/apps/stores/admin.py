from django.contrib import admin
from .models import PartnerInquiry, Store, StoreContract, StoreMembership, StorePayout

class StoreContractInline(admin.TabularInline):
    model = StoreContract
    extra = 0
    fields = ('contract_number', 'start_date', 'end_date', 'commission_rate', 'monthly_fee', 'is_active', 'contract_file')

class StoreMembershipInline(admin.TabularInline):
    model = StoreMembership
    extra = 0
    fields = ('user', 'role', 'is_active', 'assigned_at')
    readonly_fields = ('assigned_at',)

@admin.register(PartnerInquiry)
class PartnerInquiryAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'contact_person', 'phone', 'category', 'status', 'created_at')
    list_filter = ('status', 'category', 'created_at')
    search_fields = ('business_name', 'contact_person', 'phone', 'telegram')

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'slug', 'store_type', 'status', 'is_verified', 'is_published', 'is_public_approved', 'show_on_homepage', 'is_featured', 'homepage_display_order')
    list_filter = ('store_type', 'status', 'is_verified', 'is_published', 'is_public_approved', 'show_on_homepage', 'is_featured')
    search_fields = ('name', 'code', 'slug', 'phone', 'email')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [StoreContractInline, StoreMembershipInline]

@admin.register(StoreContract)
class StoreContractAdmin(admin.ModelAdmin):
    list_display = ('contract_number', 'store', 'start_date', 'end_date', 'commission_rate', 'is_active')
    list_filter = ('is_active', 'start_date', 'end_date')
    search_fields = ('contract_number', 'store__name', 'bank_account_name', 'bank_account_number')

@admin.register(StoreMembership)
class StoreMembershipAdmin(admin.ModelAdmin):
    list_display = ('store', 'user', 'role', 'is_active', 'assigned_at')
    list_filter = ('role', 'is_active', 'store')
    search_fields = ('store__name', 'user__username', 'user__email')

@admin.register(StorePayout)
class StorePayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'period_start', 'period_end', 'total_sales', 'commission_deducted', 'net_payout_amount', 'status', 'settled_at')
    list_filter = ('status', 'period_start', 'period_end')
    search_fields = ('store__name',)

