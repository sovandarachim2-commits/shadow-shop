from apps.accounts.models import SiteSettings


def get_payment_methods_config() -> dict:
    settings_obj = SiteSettings.objects.first()
    if not settings_obj:
        return {}
    return dict(settings_obj.payment_methods or {})


def is_payment_method_allowed(method: str, province: str = '', payment_methods: dict | None = None) -> bool:
    """Return True if payment method is enabled and allowed for the province zone.

    Rules:
    - Missing config ⇒ allowed (legacy default).
    - Method boolean False ⇒ not allowed.
    - allowed_zones[method] missing/empty ⇒ all zones.
    - Otherwise province must be in that list.
    """
    config = payment_methods if payment_methods is not None else get_payment_methods_config()
    if not config:
        return True
    if config.get(method) is False:
        return False

    allowed_zones = config.get('allowed_zones') or {}
    zones = allowed_zones.get(method)
    if not zones:
        return True
    if not isinstance(zones, (list, tuple, set)):
        return True
    clean_zones = {str(zone).strip() for zone in zones if str(zone).strip()}
    if not clean_zones:
        return True
    return str(province or '').strip() in clean_zones
