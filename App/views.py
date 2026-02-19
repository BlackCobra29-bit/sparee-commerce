import json

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import redirect
from django.db import transaction
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.views.generic import FormView, TemplateView, View
from django_htmx.http import HttpResponseClientRedirect

from .forms import ForgotPasswordForm, LoginForm, ProductForm, SignupForm
from .models import AccountRegistration, Order, Product


def _redirect_superuser_home(request):
    if request.user.is_authenticated and request.user.is_superuser:
        messages.error(request, "You are loggd in as a system admin")
        return redirect("home")
    return None


class HomeView(TemplateView):
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        nav_user_name = ""
        nav_user_photo_url = ""
        show_nav_user = self.request.user.is_authenticated
        if show_nav_user:
            nav_user_name = (
                self.request.user.get_full_name().strip() or self.request.user.username
            )
            account = (
                AccountRegistration.objects.filter(user_id=self.request.user.id)
                .only("profile_picture")
                .first()
            )
            if account and account.profile_picture:
                nav_user_photo_url = account.profile_picture.url

        products = (
            Product.objects.filter(is_active=True, current_stock__gt=0)
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
        context["show_nav_user"] = show_nav_user
        context["nav_user_name"] = nav_user_name
        context["nav_user_photo_url"] = nav_user_photo_url
        return context


class VendorAccessMixin(LoginRequiredMixin):
    login_url = reverse_lazy("login")


class SellerAccountRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        superuser_redirect = _redirect_superuser_home(request)
        if superuser_redirect:
            return superuser_redirect

        if not request.user.is_authenticated:
            return self.handle_no_permission()

        account = (
            AccountRegistration.objects.filter(user_id=request.user.id)
            .only("account_type")
            .first()
        )
        if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_SELLER:
            messages.error(request, "Only seller accounts can access this page.")
            return redirect("login")

        return super().dispatch(request, *args, **kwargs)


class BuyerAccountRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        superuser_redirect = _redirect_superuser_home(request)
        if superuser_redirect:
            return superuser_redirect

        if not request.user.is_authenticated:
            return self.handle_no_permission()

        account = (
            AccountRegistration.objects.filter(user_id=request.user.id)
            .only("account_type")
            .first()
        )
        if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_BUYER:
            messages.error(request, "Only buyer accounts can access this page.")
            return redirect("login")

        return super().dispatch(request, *args, **kwargs)


class VendorDashboardView(SellerAccountRequiredMixin, VendorAccessMixin, TemplateView):
    template_name = "vendors/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        active_products = self.request.user.products.filter(is_active=True)
        context["total_stock_quantity"] = active_products.aggregate(
            total=Coalesce(Sum(Coalesce("current_stock", "initial_stock")), 0)
        )["total"]
        context["total_products_count"] = active_products.count()
        context["product_types_count"] = active_products.values("category").distinct().count()
        context["low_stock_count"] = active_products.filter(
            current_stock__isnull=False,
            current_stock__lte=F("reorder_level"),
        ).count()
        return context


class VendorOrdersView(SellerAccountRequiredMixin, VendorAccessMixin, TemplateView):
    template_name = "vendors/orders.html"


class VendorProductsView(SellerAccountRequiredMixin, VendorAccessMixin, TemplateView):
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


class VendorProductRowsView(SellerAccountRequiredMixin, VendorAccessMixin, View):
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


class VendorAnalyticsView(SellerAccountRequiredMixin, VendorAccessMixin, TemplateView):
    template_name = "vendors/analytics.html"


class BuyerDashboardView(BuyerAccountRequiredMixin, VendorAccessMixin, TemplateView):
    template_name = "vendors/buyer/buyer_dashboard.html"
    paginate_by = 20

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orders_qs = (
            Order.objects.filter(buyer_id=self.request.user.id)
            .select_related("product__vendor__account_registration")
            .only(
                "id",
                "quantity",
                "total_price",
                "created_at",
                "product__name",
                "product__vin",
                "product__vendor__username",
                "product__vendor__first_name",
                "product__vendor__last_name",
                "product__vendor__email",
                "product__vendor__account_registration__phone_number",
                "product__vendor__account_registration__profile_picture",
            )
            .order_by("-created_at")
        )
        paginator = Paginator(orders_qs, self.paginate_by)
        page_obj = paginator.get_page(self.request.GET.get("page"))

        buyer_orders = []
        for order in page_obj.object_list:
            seller = order.product.vendor
            seller_name = seller.get_full_name().strip() or seller.username
            seller_account = getattr(seller, "account_registration", None)
            seller_phone = (
                seller_account.phone_number
                if seller_account and seller_account.phone_number
                else "-"
            )
            seller_photo_url = (
                seller_account.profile_picture.url
                if seller_account and seller_account.profile_picture
                else ""
            )

            buyer_orders.append(
                {
                    "seller_name": seller_name,
                    "seller_email": seller.email or "-",
                    "seller_phone": seller_phone,
                    "seller_photo_url": seller_photo_url,
                    "product_name": order.product.name,
                    "quantity": order.quantity,
                    "total_price": order.total_price,
                    "vin": order.product.vin,
                }
            )

        context["buyer_orders"] = buyer_orders
        context["page_obj"] = page_obj
        context["is_paginated"] = page_obj.has_other_pages()
        context["orders_total"] = paginator.count
        return context


class OrderCreateView(View):
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_superuser:
            return JsonResponse(
                {"error": "You are loggd in as a system admin"},
                status=403,
            )

        if not request.user.is_authenticated:
            return JsonResponse(
                {
                    "error": "Please log in to submit an order.",
                    "login_url": str(reverse_lazy("login")),
                },
                status=401,
            )

        account = (
            AccountRegistration.objects.filter(user_id=request.user.id)
            .only("account_type")
            .first()
        )
        if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_BUYER:
            return JsonResponse(
                {"error": "Only buyer accounts can submit orders."},
                status=403,
            )

        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid request payload."}, status=400)

        items = payload.get("items")
        if not isinstance(items, list) or not items:
            return JsonResponse({"error": "Cart is empty."}, status=400)

        quantity_by_sku = {}
        for item in items:
            if not isinstance(item, dict):
                continue
            sku = str(item.get("sku", "")).strip().upper()
            qty_raw = item.get("qty", 1)
            try:
                qty = int(qty_raw)
            except (TypeError, ValueError):
                qty = 0
            if not sku or qty <= 0:
                continue
            quantity_by_sku[sku] = quantity_by_sku.get(sku, 0) + qty

        if not quantity_by_sku:
            return JsonResponse({"error": "No valid order items found."}, status=400)

        with transaction.atomic():
            products = (
                Product.objects.select_for_update()
                .filter(vin__in=quantity_by_sku.keys(), is_active=True)
                .only("id", "vin", "name", "price", "current_stock", "initial_stock")
            )
            products_by_vin = {product.vin: product for product in products}
            missing_skus = [sku for sku in quantity_by_sku.keys() if sku not in products_by_vin]
            if missing_skus:
                return JsonResponse(
                    {"error": f"Some items are unavailable: {', '.join(missing_skus)}."},
                    status=400,
                )

            stock_errors = []
            for sku, qty in quantity_by_sku.items():
                product = products_by_vin[sku]
                available = (
                    product.current_stock
                    if product.current_stock is not None
                    else product.initial_stock
                )
                if qty > available:
                    stock_errors.append(
                        f"{product.name} (VIN: {sku}) has only {available} in stock."
                    )

            if stock_errors:
                return JsonResponse(
                    {"error": "Insufficient stock.", "details": stock_errors},
                    status=400,
                )

            for sku, qty in quantity_by_sku.items():
                product = products_by_vin[sku]
                available = (
                    product.current_stock
                    if product.current_stock is not None
                    else product.initial_stock
                )
                new_stock = available - qty
                Product.objects.filter(pk=product.pk).update(current_stock=new_stock)

                Order.objects.create(
                    buyer=request.user,
                    product=product,
                    quantity=qty,
                    total_price=product.price * qty,
                )

        return JsonResponse(
            {
                "message": "Order submitted successfully.",
                "created_count": len(quantity_by_sku),
            }
        )


class VendorProductCreateView(SellerAccountRequiredMixin, VendorAccessMixin, View):
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


class VendorProductUpdateView(SellerAccountRequiredMixin, VendorAccessMixin, View):
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


class VendorProductDeleteView(SellerAccountRequiredMixin, VendorAccessMixin, View):
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

    @staticmethod
    def get_dashboard_url_for_user(user):
        account = (
            AccountRegistration.objects.filter(user_id=user.id)
            .only("account_type")
            .first()
        )
        if account and account.account_type == AccountRegistration.ACCOUNT_TYPE_BUYER:
            return reverse_lazy("buyer_dashboard")
        return reverse_lazy("vendor_dashboard")

    def dispatch(self, request, *args, **kwargs):
        superuser_redirect = _redirect_superuser_home(request)
        if superuser_redirect:
            return superuser_redirect

        if request.user.is_authenticated:
            return redirect(self.get_dashboard_url_for_user(request.user))
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
        return self.client_redirect(str(self.get_dashboard_url_for_user(user)))

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
        superuser_redirect = _redirect_superuser_home(request)
        if superuser_redirect:
            return superuser_redirect

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
            phone_number=form.cleaned_data["phone"],
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
            "phone": data.get("phone", ""),
        }
        return ctx


class ForgotPasswordView(HtmxTemplateMixin, FormView):
    full_template_name = "auth/forgot_password.html"
    partial_template_name = "auth/partials/forgot_password_content.html"
    form_class = ForgotPasswordForm
    success_url = reverse_lazy("forgot_password")

    def dispatch(self, request, *args, **kwargs):
        superuser_redirect = _redirect_superuser_home(request)
        if superuser_redirect:
            return superuser_redirect

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

    def dispatch(self, request, *args, **kwargs):
        superuser_redirect = _redirect_superuser_home(request)
        if superuser_redirect:
            return superuser_redirect
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        logout(request)
        messages.success(request, "You have been signed out successfully.")
        return redirect("login")
