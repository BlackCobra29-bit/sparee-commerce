"""
URL configuration for WebApp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from App.views import (
    AdminDashboardView,
    AdminProductCategoryCreateView,
    AdminProductCategoryVisibilityUpdateView,
    AdminPricingOversightView,
    AdminProductSkuControlView,
    AdminSellerManagementView,
    AdminSellerVerificationUpdateView,
    AdminMessagesInboxView,
    AdminSystemControlsView,
    ForgotPasswordView,
    HomeView,
    LoginView,
    LogoutView,
    AccountSettingsView,
    ContactMessageCreateView,
    OrderCreateView,
    ProductRatingCreateView,
    BuyerOrderCancelView,
    BuyerDashboardView,
    BuyerOrdersView,
    CategoryProductsView,
    SearchProductsView,
    VendorOrderDeliveredUpdateView,
    VendorOrderUnacceptView,
    VendorProductDeleteView,
    VendorProductCreateView,
    VendorProductRowsView,
    VendorProductUpdateView,
    VendorAnalyticsView,
    VendorOrdersView,
    VendorProductsView,
    SignupView,
    VendorDashboardView,
)

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('categories/', CategoryProductsView.as_view(), name='category_products'),
    path('search/', SearchProductsView.as_view(), name='search_products'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('account/settings/', AccountSettingsView.as_view(), name='account_settings'),
    path('vendor/', VendorDashboardView.as_view(), name='vendor_dashboard'),
    path('vendor/dashboard/', VendorDashboardView.as_view(), name='vendor_dashboard_home'),
    path('vendor/orders/', VendorOrdersView.as_view(), name='vendor_orders'),
    path('vendor/orders/<int:pk>/delivered/', VendorOrderDeliveredUpdateView.as_view(), name='vendor_order_delivered_update'),
    path('vendor/orders/<int:pk>/unaccept/', VendorOrderUnacceptView.as_view(), name='vendor_order_unaccept'),
    path('vendor/products/', VendorProductsView.as_view(), name='vendor_products'),
    path('vendor/products/rows/', VendorProductRowsView.as_view(), name='vendor_product_rows'),
    path('vendor/products/create/', VendorProductCreateView.as_view(), name='vendor_product_create'),
    path('vendor/products/<int:pk>/update/', VendorProductUpdateView.as_view(), name='vendor_product_update'),
    path('vendor/products/<int:pk>/delete/', VendorProductDeleteView.as_view(), name='vendor_product_delete'),
    path('vendor/analytics/', VendorAnalyticsView.as_view(), name='vendor_analytics'),
    path('buyer/dashboard/', BuyerDashboardView.as_view(), name='buyer_dashboard'),
    path('buyer/orders/', BuyerOrdersView.as_view(), name='buyer_orders'),
    path('orders/create/', OrderCreateView.as_view(), name='order_create'),
    path('contact/messages/create/', ContactMessageCreateView.as_view(), name='contact_message_create'),
    path('products/<str:sku>/rate/', ProductRatingCreateView.as_view(), name='product_rate'),
    path('orders/<int:pk>/cancel/', BuyerOrderCancelView.as_view(), name='buyer_order_cancel'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('admin/seller-management/', AdminSellerManagementView.as_view(), name='admin_seller_management'),
    path('admin/seller-management/<int:pk>/verification/', AdminSellerVerificationUpdateView.as_view(), name='admin_seller_verification_update'),
    path('admin/product-sku-control/', AdminProductSkuControlView.as_view(), name='admin_product_sku_control'),
    path('admin/pricing-oversight/', AdminPricingOversightView.as_view(), name='admin_pricing_oversight'),
    path('admin/messages/', AdminMessagesInboxView.as_view(), name='admin_messages_inbox'),
    path('admin/system-controls/', AdminSystemControlsView.as_view(), name='admin_system_controls'),
    path('admin/system-controls/categories/create/', AdminProductCategoryCreateView.as_view(), name='admin_product_category_create'),
    path('admin/system-controls/categories/<int:pk>/visibility/', AdminProductCategoryVisibilityUpdateView.as_view(), name='admin_product_category_visibility_update'),
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
