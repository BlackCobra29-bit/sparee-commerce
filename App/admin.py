from django.contrib import admin
from .models import AccountRegistration


@admin.register(AccountRegistration)
class AccountRegistrationAdmin(admin.ModelAdmin):
    list_display = ("user", "account_type", "created_at", "updated_at")
    list_filter = ("account_type", "created_at")
    search_fields = ("user__username", "user__email")
