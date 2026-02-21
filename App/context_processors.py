from .models import AccountRegistration, Order


def seller_order_notifications(request):
    context = {
        "seller_notification_count": 0,
        "seller_notifications": [],
    }

    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return context

    account = (
        AccountRegistration.objects.filter(user_id=user.id)
        .only("account_type")
        .first()
    )
    if not account or account.account_type != AccountRegistration.ACCOUNT_TYPE_SELLER:
        return context

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
    return context
