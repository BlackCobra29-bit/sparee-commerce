from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import FormView, TemplateView
from django_htmx.http import HttpResponseClientRedirect

from .forms import ForgotPasswordForm, LoginForm, SignupForm
from .models import AccountRegistration


class HomeView(TemplateView):
    template_name = "index.html"


class VendorDashboardView(TemplateView):
    template_name = "vendors/index.html"


class VendorOrdersView(TemplateView):
    template_name = "vendors/orders.html"


class VendorProductsView(TemplateView):
    template_name = "vendors/products.html"


class VendorAnalyticsView(TemplateView):
    template_name = "vendors/analytics.html"


class HtmxTemplateMixin:
    full_template_name = ""
    partial_template_name = ""

    def get_template_names(self):
        if getattr(self.request, "htmx", False):
            return [self.partial_template_name]
        return [self.full_template_name]

    def client_redirect(self, url):
        if getattr(self.request, "htmx", False):
            return HttpResponseClientRedirect(url)
        return HttpResponseRedirect(url)


class LoginView(HtmxTemplateMixin, FormView):
    full_template_name = "auth/login.html"
    partial_template_name = "auth/partials/login_content.html"
    form_class = LoginForm
    success_url = reverse_lazy("home")

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect("home")
        return super().dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["request"] = self.request
        return kwargs

    def form_valid(self, form):
        user = form.get_user()
        login(self.request, user)
        if not form.cleaned_data.get("remember"):
            self.request.session.set_expiry(0)
        messages.success(self.request, f"Welcome back, {user.username}.")
        return self.client_redirect(str(self.success_url))

    def form_invalid(self, form):
        for error in form.non_field_errors():
            messages.error(self.request, error)
        return super().form_invalid(form)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        form = kwargs.get("form")
        ctx["prefill_username"] = (form.data.get("username") if form else "") or ""
        return ctx


class SignupView(HtmxTemplateMixin, FormView):
    full_template_name = "auth/signup.html"
    partial_template_name = "auth/partials/signup_content.html"
    form_class = SignupForm
    success_url = reverse_lazy("home")

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect("home")
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        account_type = form.cleaned_data["account_type"]
        license_file = form.cleaned_data.get("license_file")

        user = User.objects.create_user(
            username=form.cleaned_data["username"],
            email=form.cleaned_data["email"],
            password=form.cleaned_data["password"],
            first_name=form.cleaned_data["first_name"].strip(),
            last_name=form.cleaned_data["last_name"].strip(),
        )

        AccountRegistration.objects.create(
            user=user,
            account_type=account_type,
            license_file=license_file if account_type == "seller" else None,
        )

        login(self.request, user)
        if account_type == "seller":
            messages.success(
                self.request,
                "Your seller account was created successfully. License uploaded.",
            )
        else:
            messages.success(self.request, "Your buyer account was created successfully.")
        return self.client_redirect(self.get_success_url())

    def form_invalid(self, form):
        for error in form.non_field_errors():
            messages.error(self.request, error)
        return super().form_invalid(form)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        form = kwargs.get("form")
        data = form.data if form else {}
        ctx["prefill"] = {
            "account_type": data.get("account_type", ""),
            "first_name": data.get("first_name", ""),
            "last_name": data.get("last_name", ""),
            "username": data.get("username", ""),
            "email": data.get("email", ""),
        }
        return ctx


class ForgotPasswordView(HtmxTemplateMixin, FormView):
    full_template_name = "auth/forgot_password.html"
    partial_template_name = "auth/partials/forgot_password_content.html"
    form_class = ForgotPasswordForm
    success_url = reverse_lazy("forgot_password")

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect("home")
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        email = form.cleaned_data["email"]
        User.objects.filter(email__iexact=email).exists()
        messages.success(
            self.request,
            "If an account exists for that email, a reset link has been sent.",
        )
        return self.client_redirect(self.get_success_url())
