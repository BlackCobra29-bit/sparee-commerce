from django import template


register = template.Library()


@register.simple_tag(takes_context=True)
def t(context, key, default=""):
    ui_text = context.get("ui_text") or {}
    if key in ui_text:
        return ui_text[key]
    if default:
        return default
    return key
