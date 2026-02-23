from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models


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
    phone_number = models.CharField(
        max_length=16,
        blank=True,
        null=True,
    )
    profile_picture = models.ImageField(upload_to="profile_pictures/", blank=True, null=True)
    license_file = models.FileField(upload_to="license_uploads/", blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.account_type})"


class Product(models.Model):
    vin_validator = RegexValidator(
        regex=r"^[A-HJ-NPR-Z0-9]{17}$",
        message="VIN must be exactly 17 characters (letters and numbers, excluding I, O, and Q).",
    )

    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=160)
    vin = models.CharField(max_length=17, unique=True, validators=[vin_validator], db_index=True)
    category = models.CharField(max_length=80, db_index=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    initial_stock = models.PositiveIntegerField()
    current_stock = models.PositiveIntegerField(null=True, blank=True)
    reorder_level = models.PositiveIntegerField(default=0)
    description = models.TextField()
    product_image = models.ImageField(upload_to="product_images/")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["vendor", "category"]),
            models.Index(fields=["vendor", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["vendor", "name"], name="unique_vendor_product_name"),
        ]

    def clean(self):
        super().clean()

        if self.vin:
            self.vin = self.vin.strip().upper()

        if self.description:
            self.description = self.description.strip()

        if not self.description:
            raise ValidationError({"description": "Description is required."})

        if len(self.description) < 10:
            raise ValidationError({"description": "Description must be at least 10 characters."})

        if len(self.description) > 500:
            raise ValidationError({"description": "Description must be 500 characters or less."})

        if not self.vendor_id:
            raise ValidationError({"vendor": "Vendor is required."})

        account = getattr(self.vendor, "account_registration", None)
        if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_SELLER:
            raise ValidationError({"vendor": "Only seller accounts can create products."})

        if self.current_stock is None:
            self.current_stock = self.initial_stock

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.vin})"


class ProductRating(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="product_ratings")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="ratings")
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"], name="unique_user_product_rating"
            )
        ]
        indexes = [
            models.Index(fields=["product", "created_at"], name="App_product_product_925d9a_idx"),
        ]

    def __str__(self):
        return f"{self.user.username} rated {self.product.name} ({self.rating})"


class Order(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="orders")
    quantity = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_delivered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} - {self.product.name} x {self.quantity} for {self.buyer.username}"
        return f"Order #{self.id} - {self.product.name} x {self.quantity} for {self.buyer.username}"


class ProductCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class ContactMessage(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_messages",
    )
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=254)
    subject = models.CharField(max_length=180)
    message_body = models.TextField()
    message_seen = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.name} - {self.subject}"
