import json

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.models import User
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import redirect
from django.db import transaction
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.views.generic import FormView, TemplateView, View
from django_htmx.http import HttpResponseClientRedirect

from .forms import ForgotPasswordForm, LoginForm, ProductForm, SignupForm
from .models import AccountRegistration, Product


class HomeView(TemplateView):
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        products = (
            Product.objects.filter(is_active=True)
            .select_related("vendor", "vendor__account_registration")
            .only(
                "vin",
                "name",
                "category",
                "price",
                "current_stock",
                "description",
                "product_image",
                "vendor__username",
                "vendor__first_name",
                "vendor__last_name",
                "vendor__account_registration__profile_picture",
            )
            .order_by("-created_at")
        )

        category_options = []
        for value, label in Product.CATEGORY_CHOICES:
            category_options.append({"value": label, "label": label})

        shop_products = []
        for product in products:
            image_url = product.product_image.url if product.product_image else ""
            stock = product.current_stock if product.current_stock is not None else 0
            seller_name = product.vendor.get_full_name().strip() or product.vendor.username
            seller_photo = ""
            try:
                account = product.vendor.account_registration
                if account and account.profile_picture:
                    seller_photo = account.profile_picture.url
            except AccountRegistration.DoesNotExist:
                seller_photo = ""
            stock_badges = []
            if stock <= 5:
                stock_badges.append("Low Stock")

            shop_products.append(
                {
                    "sku": product.vin,
                    "name": product.name,
                    "category": product.get_category_display(),
                    "brand": seller_name,
                    "seller_name": seller_name,
                    "seller_photo": seller_photo,
                    "condition": "New",
                    "rating": 4.5,
                    "reviews": 0,
                    "price": float(product.price),
                    "stock": stock,
                    "badges": stock_badges,
                    "oem": product.vin,
                    "img": image_url,
                    "desc": product.description,
                }
            )

        context["shop_products"] = shop_products
        context["shop_category_options"] = category_options
        context["shop_brand_options"] = sorted({p["brand"] for p in shop_products})
        return context


class VendorAccessMixin(LoginRequiredMixin):
    login_url = reverse_lazy("login")


class VendorDashboardView(VendorAccessMixin, TemplateView):
    template_name = "vendors/index.html"


class VendorOrdersView(VendorAccessMixin, TemplateView):
    template_name = "vendors/orders.html"


class VendorProductsView(VendorAccessMixin, TemplateView):
    template_name = "vendors/products.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["products"] = (
            self.request.user.products.only(
                "id",
                "name",
                "category",
                "vin",
                "current_stock",
                "initial_stock",
                "reorder_level",
                "price",
                "description",
                "product_image",
            )
            .order_by("-created_at")
        )
        return context


class VendorProductRowsView(VendorAccessMixin, View):
    http_method_names = ["get"]

    def get(self, request, *args, **kwargs):
        products = (
            request.user.products.only(
                "id",
                "name",
                "category",
                "current_stock",
                "initial_stock",
                "reorder_level",
                "price",
                "description",
                "vin",
                "product_image",
            )
            .order_by("-created_at")
        )
        rows_html = render_to_string(
            "vendors/partials/product_rows.html",
            {"products": products},
            request=request,
        )
        return HttpResponse(rows_html)


def _vendor_products_queryset(user):
    return (
        user.products.only(
            "id",
            "name",
            "category",
            "current_stock",
            "initial_stock",
            "reorder_level",
            "price",
            "description",
            "vin",
            "product_image",
        )
        .order_by("-created_at")
    )


class VendorAnalyticsView(VendorAccessMixin, TemplateView):
    template_name = "vendors/analytics.html"


class VendorProductCreateView(VendorAccessMixin, View):
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        is_htmx = getattr(request, "htmx", False)
        is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"
        account = (
            AccountRegistration.objects.filter(user_id=request.user.id)
            .only("account_type")
            .first()
        )
        if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_SELLER:
            error_text = "Only seller accounts can add products."
            if is_htmx:
                response = HttpResponse("", status=403)
                response["HX-Trigger"] = json.dumps({"product:create:error": {"message": error_text}})
                return response
            if is_ajax:
                return JsonResponse({"ok": False, "message": error_text}, status=403)
            messages.error(request, error_text)
            return redirect("vendor_products")

        form = ProductForm(request.POST, request.FILES, vendor=request.user)
        if not form.is_valid():
            first_error = next(iter(form.errors.values()))[0] if form.errors else "Please check your input and try again."
            if is_htmx:
                response = HttpResponse("", status=422)
                response["HX-Trigger"] = json.dumps({"product:create:error": {"message": str(first_error)}})
                return response
            if is_ajax:
                return JsonResponse({"ok": False, "message": str(first_error)}, status=422)
            messages.error(request, first_error)
            return redirect("vendor_products")

        with transaction.atomic():
            product = form.save()

        success_message = f"Product '{product.name}' was added successfully."
        if is_htmx:
            row_html = render_to_string(
                "vendors/partials/product_row.html",
                {"product": product},
                request=request,
            )
            response = HttpResponse(row_html)
            response["HX-Trigger"] = json.dumps({"product:create:success": {"message": success_message}})
            return response
        if is_ajax:
            products = _vendor_products_queryset(request.user)
            rows_html = render_to_string(
                "vendors/partials/product_rows.html",
                {"products": products},
                request=request,
            )
            return JsonResponse(
                {
                    "ok": True,
                    "message": success_message,
                    "rows_html": rows_html,
                    "count": products.count(),
                }
            )
        messages.success(request, success_message)
        return redirect("vendor_products")


class VendorProductUpdateView(VendorAccessMixin, View):
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        is_htmx = getattr(request, "htmx", False)
        is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"
        account = (
            AccountRegistration.objects.filter(user_id=request.user.id)
            .only("account_type")
            .first()
        )
        if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_SELLER:
            error_text = "Only seller accounts can update products."
            if is_htmx:
                response = HttpResponse("", status=403)
                response["HX-Trigger"] = json.dumps({"product:update:error": {"message": error_text}})
                return response
            if is_ajax:
                return JsonResponse({"ok": False, "message": error_text}, status=403)
            messages.error(request, error_text)
            return redirect("vendor_products")

        product = get_object_or_404(request.user.products, pk=kwargs.get("pk"))
        form = ProductForm(request.POST, request.FILES, vendor=request.user, instance=product)
        if not form.is_valid():
            first_error = next(iter(form.errors.values()))[0] if form.errors else "Please check your input and try again."
            if is_htmx:
                response = HttpResponse("", status=422)
                response["HX-Trigger"] = json.dumps({"product:update:error": {"message": str(first_error)}})
                return response
            if is_ajax:
                return JsonResponse({"ok": False, "message": str(first_error)}, status=422)
            messages.error(request, first_error)
            return redirect("vendor_products")

        with transaction.atomic():
            product = form.save()

        success_message = f"Product '{product.name}' was updated successfully."
        if is_htmx:
            products = _vendor_products_queryset(request.user)
            rows_html = render_to_string(
                "vendors/partials/product_rows.html",
                {"products": products},
                request=request,
            )
            response = HttpResponse(rows_html)
            response["HX-Trigger"] = json.dumps({"product:update:success": {"message": success_message}})
            return response
        if is_ajax:
            products = _vendor_products_queryset(request.user)
            rows_html = render_to_string(
                "vendors/partials/product_rows.html",
                {"products": products},
                request=request,
            )
            return JsonResponse(
                {
                    "ok": True,
                    "message": success_message,
                    "rows_html": rows_html,
                    "count": products.count(),
                }
            )
        messages.success(request, success_message)
        return redirect("vendor_products")


class VendorProductDeleteView(VendorAccessMixin, View):
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        is_htmx = getattr(request, "htmx", False)
        is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"
        account = (
            AccountRegistration.objects.filter(user_id=request.user.id)
            .only("account_type")
            .first()
        )
        if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_SELLER:
            error_text = "Only seller accounts can delete products."
            if is_htmx:
                response = HttpResponse("", status=403)
                response["HX-Trigger"] = json.dumps({"product:delete:error": {"message": error_text}})
                return response
            if is_ajax:
                return JsonResponse({"ok": False, "message": error_text}, status=403)
            messages.error(request, error_text)
            return redirect("vendor_products")

        product = get_object_or_404(request.user.products.only("id", "name"), pk=kwargs.get("pk"))
        product_name = product.name
        product.delete()

        success_message = f"Product '{product_name}' was deleted successfully."
        if is_htmx:
            products = _vendor_products_queryset(request.user)
            rows_html = render_to_string(
                "vendors/partials/product_rows.html",
                {"products": products},
                request=request,
            )
            response = HttpResponse(rows_html)
            response["HX-Trigger"] = json.dumps({"product:delete:success": {"message": success_message}})
            return response
        if is_ajax:
            products = _vendor_products_queryset(request.user)
            rows_html = render_to_string(
                "vendors/partials/product_rows.html",
                {"products": products},
                request=request,
            )
            return JsonResponse(
                {
                    "ok": True,
                    "message": success_message,
                    "rows_html": rows_html,
                    "count": products.count(),
                }
            )
        messages.success(request, success_message)
        return redirect("vendor_products")


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
    success_url = reverse_lazy("vendor_dashboard")

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect("vendor_dashboard")
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
        for field_name, errors in form.errors.items():
            if field_name == "__all__":
                for error in errors:
                    messages.error(self.request, error)
                continue
            field_label = form.fields[field_name].label or field_name.replace("_", " ").title()
            for error in errors:
                messages.error(self.request, f"{field_label}: {error}")
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
        profile_picture = form.cleaned_data["profile_picture"]
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
            profile_picture=profile_picture,
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
        for field_name, errors in form.errors.items():
            if field_name == "__all__":
                for error in errors:
                    messages.error(self.request, error)
                continue
            field_label = form.fields[field_name].label or field_name.replace("_", " ").title()
            for error in errors:
                messages.error(self.request, f"{field_label}: {error}")
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


class LogoutView(LoginRequiredMixin, View):
    login_url = reverse_lazy("login")
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        logout(request)
        messages.success(request, "You have been signed out successfully.")
        return redirect("login")
