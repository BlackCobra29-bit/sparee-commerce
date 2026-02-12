import os

from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import AccountRegistration


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
    password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)
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
