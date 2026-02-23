import os

from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import AccountRegistration, Product, ProductCategory


class LoginForm(forms.Form):
    username = forms.CharField(max_length=150)
    password = forms.CharField(widget=forms.PasswordInput)
    remember = forms.BooleanField(required=False)

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop("request", None)
        self.user_cache = None
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        username = (cleaned_data.get("username") or "").strip()
        password = cleaned_data.get("password") or ""
        if not username or not password:
            return cleaned_data

        self.user_cache = authenticate(
            self.request,
            username=username,
            password=password,
        )
        if self.user_cache is None:
            raise forms.ValidationError("Invalid credentials. Please try again.")
        return cleaned_data

    def get_user(self):
        return self.user_cache


class SignupForm(forms.Form):
    account_type = forms.ChoiceField(
        choices=AccountRegistration.ACCOUNT_TYPE_CHOICES,
        required=True,
    )
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)
    username = forms.CharField(max_length=150)
    email = forms.EmailField(max_length=254)
    phone = forms.CharField(max_length=16)
    password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)
    profile_picture = forms.ImageField(required=True)
    license_file = forms.FileField(required=False)
    terms = forms.BooleanField(required=True)

    def clean_username(self):
        username = (self.cleaned_data.get("username") or "").strip()
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError("That username is already taken.")
        return username

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("That email is already registered.")
        return email

    def clean_phone(self):
        phone = (self.cleaned_data.get("phone") or "").strip()
        if not phone:
            raise forms.ValidationError("Phone number is required.")
        return phone

    def clean_license_file(self):
        license_file = self.cleaned_data.get("license_file")
        if not license_file:
            return license_file
        allowed_ext = {".pdf", ".png", ".jpg", ".jpeg"}
        ext = os.path.splitext(license_file.name)[1].lower()
        if ext not in allowed_ext:
            raise forms.ValidationError("License file must be PDF, PNG, JPG, or JPEG.")
        if license_file.size > 5 * 1024 * 1024:
            raise forms.ValidationError("License file must be 5MB or smaller.")
        return license_file

    def clean_profile_picture(self):
        profile_picture = self.cleaned_data.get("profile_picture")
        if not profile_picture:
            raise forms.ValidationError("Profile picture is required.")
        allowed_ext = {".png", ".jpg", ".jpeg"}
        ext = os.path.splitext(profile_picture.name)[1].lower()
        if ext not in allowed_ext:
            raise forms.ValidationError("Profile picture must be PNG, JPG, or JPEG.")
        if profile_picture.size > 5 * 1024 * 1024:
            raise forms.ValidationError("Profile picture must be 5MB or smaller.")
        return profile_picture

    def clean(self):
        cleaned_data = super().clean()
        account_type = cleaned_data.get("account_type")
        license_file = cleaned_data.get("license_file")
        password = cleaned_data.get("password") or ""
        confirm_password = cleaned_data.get("confirm_password") or ""
        if account_type == "seller" and not license_file:
            self.add_error(
                "license_file",
                "Business/company license file is required for seller accounts.",
            )
        if password and len(password) < 8:
            self.add_error("password", "Password must be at least 8 characters.")
        if password and confirm_password and password != confirm_password:
            self.add_error("confirm_password", "Passwords do not match.")
        return cleaned_data


class ForgotPasswordForm(forms.Form):
    email = forms.EmailField(max_length=254)

    def clean_email(self):
        return (self.cleaned_data.get("email") or "").strip().lower()


class ProductForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        self.vendor = kwargs.pop("vendor", None)
        super().__init__(*args, **kwargs)
        if self.vendor is not None:
            self.instance.vendor = self.vendor
        available_categories = ProductCategory.objects.filter(is_visible=True).order_by("name")
        self.fields["category"] = forms.ChoiceField(
            choices=[(category.name, category.name) for category in available_categories],
            required=True,
        )

    class Meta:
        model = Product
        fields = (
            "name",
            "vin",
            "category",
            "price",
            "initial_stock",
            "current_stock",
            "reorder_level",
            "description",
            "product_image",
        )

    def clean_vin(self):
        return (self.cleaned_data.get("vin") or "").strip().upper()

    def clean_description(self):
        return (self.cleaned_data.get("description") or "").strip()

    def clean_category(self):
        category_name = (self.cleaned_data.get("category") or "").strip()
        if not ProductCategory.objects.filter(name=category_name).exists():
            raise forms.ValidationError("Please select a valid product category.")
        return category_name

    def clean_product_image(self):
        image = self.cleaned_data.get("product_image")
        if not image:
            if self.instance and self.instance.pk and self.instance.product_image:
                return self.instance.product_image
            raise forms.ValidationError("Product image is required.")

        allowed_ext = {".jpg", ".jpeg", ".png"}
        ext = os.path.splitext(image.name)[1].lower()
        if ext not in allowed_ext:
            raise forms.ValidationError("Only JPG or PNG files are allowed.")
        if image.size > 5 * 1024 * 1024:
            raise forms.ValidationError("Image must be 5MB or smaller.")
        return image

    def clean(self):
        cleaned_data = super().clean()
        if self.vendor is None:
            raise forms.ValidationError("Authenticated vendor is required.")
        return cleaned_data

    def save(self, commit=True):
        product = super().save(commit=False)
        product.vendor = self.vendor
        if product.current_stock is None:
            product.current_stock = product.initial_stock
        if commit:
            product.save()
        return product


class ProductCategoryForm(forms.ModelForm):
    class Meta:
        model = ProductCategory
        fields = ("name", "description")

    def clean_name(self):
        return (self.cleaned_data.get("name") or "").strip()

    def clean_description(self):
        return (self.cleaned_data.get("description") or "").strip()
