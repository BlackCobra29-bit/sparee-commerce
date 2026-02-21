from decimal import Decimal, InvalidOperation

from django import template
from django.contrib.humanize.templatetags.humanize import intcomma

register = template.Library()


@register.filter
def number_separator(value):
    if value in (None, ""):
        return ""

    try:
        raw = str(value).replace(",", "").strip()
        number = Decimal(raw)
    except (InvalidOperation, TypeError, ValueError):
        return value

    if number == number.to_integral_value():
        return intcomma(int(number))

    return f"{number:,.2f}".rstrip("0").rstrip(".")

