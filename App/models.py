from django.db import models
from django.contrib.auth.models import User


class AccountRegistration(models.Model):
    ACCOUNT_TYPE_BUYER = "buyer"
    ACCOUNT_TYPE_SELLER = "seller"
    ACCOUNT_TYPE_CHOICES = (
        (ACCOUNT_TYPE_BUYER, "Buyer"),
        (ACCOUNT_TYPE_SELLER, "Seller"),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="account_registration",
    )
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    license_file = models.FileField(upload_to="license_uploads/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.account_type})"
