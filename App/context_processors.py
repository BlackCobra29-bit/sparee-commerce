from .models import AccountRegistration, ContactMessage, Order


def seller_order_notifications(request):
    context = {
        "seller_notification_count": 0,
        "seller_notifications": [],
        "superadmin_notification_count": 0,
        "superadmin_notifications": [],
        "superadmin_unseen_message_count": 0,
    }

    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return context

    account = (
        AccountRegistration.objects.filter(user_id=user.id)
        .only("account_type")
        .first()
    )
    if account and account.account_type == AccountRegistration.ACCOUNT_TYPE_SELLER:
        orders_qs = (
            Order.objects.filter(product__vendor_id=user.id, is_delivered=False)
            .select_related("buyer", "product")
            .only(
                "id",
                "quantity",
                "is_delivered",
                "created_at",
                "buyer__username",
                "buyer__first_name",
                "buyer__last_name",
                "product__name",
            )
            .order_by("-created_at")
        )

        context["seller_notification_count"] = orders_qs.count()

        notifications = []
        for order in orders_qs[:5]:
            buyer_name = order.buyer.get_full_name().strip() or order.buyer.username
            notifications.append(
                {
                    "id": order.id,
                    "buyer_name": buyer_name,
                    "product_name": order.product.name,
                    "quantity": order.quantity,
                    "created_at": order.created_at,
                }
            )

        context["seller_notifications"] = notifications

    if user.is_superuser:
        pending_sellers_qs = (
            AccountRegistration.objects.filter(
                account_type=AccountRegistration.ACCOUNT_TYPE_SELLER,
                is_verified=False,
                user__is_active=True,
            )
            .select_related("user")
            .only(
                "id",
                "created_at",
                "user__username",
                "user__first_name",
                "user__last_name",
                "user__email",
            )
            .order_by("-created_at")
        )
        context["superadmin_notification_count"] = pending_sellers_qs.count()
        context["superadmin_notifications"] = [
            {
                "id": account.id,
                "full_name": account.user.get_full_name().strip() or account.user.username,
                "email": account.user.email or "-",
                "created_at": account.created_at,
            }
            for account in pending_sellers_qs[:10]
        ]
        context["superadmin_unseen_message_count"] = ContactMessage.objects.filter(
            message_seen=False
        ).count()

    return context
