from django.contrib import admin
from .models import AccountRegistration, Product


@admin.register(AccountRegistration)
class AccountRegistrationAdmin(admin.ModelAdmin):
    list_display = ("user", "account_type", "created_at", "updated_at")
    list_filter = ("account_type", "created_at")
    search_fields = ("user__username", "user__email")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "vendor",
        "vin",
        "category",
        "price",
        "current_stock",
        "reorder_level",
        "is_active",
        "updated_at",
    )
    list_filter = ("category", "is_active", "created_at")
    search_fields = ("name", "vin", "vendor__username", "vendor__email")
    readonly_fields = ("created_at", "updated_at")
