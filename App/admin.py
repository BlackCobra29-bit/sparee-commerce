from django.contrib import admin
from .models import AccountRegistration, ContactMessage, Order, Product, ProductRating


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


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "buyer", "product", "quantity", "total_price", "is_delivered", "created_at")
    list_filter = ("created_at",)
    search_fields = ("buyer__username", "buyer__email", "product__name", "product__vin")
    readonly_fields = ("created_at",)


@admin.register(ProductRating)
class ProductRatingAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("product__name", "product__vin", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "subject", "message_seen", "created_at")
    list_filter = ("message_seen", "created_at")
    search_fields = ("name", "email", "subject", "message_body")
    readonly_fields = ("created_at",)
