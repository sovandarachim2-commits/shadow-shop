import re

from rest_framework import serializers

CAMBODIA_PHONE_RE = re.compile(r'^0[1-9]\d{7,8}$')
CAMBODIA_PHONE_ERROR = 'Enter a Cambodia phone number starting with 0 (9–10 digits).'


def normalize_cambodia_phone(value: str) -> str:
    digits = re.sub(r'\D', '', str(value or ''))
    if digits.startswith('855'):
        digits = f'0{digits[3:]}'
    return digits[:10]


def validate_cambodia_phone(value: str, allow_blank: bool = False) -> str:
    raw = str(value or '').strip()
    if not raw:
        if allow_blank:
            return ''
        raise serializers.ValidationError(CAMBODIA_PHONE_ERROR)

    normalized = normalize_cambodia_phone(raw)
    if not CAMBODIA_PHONE_RE.fullmatch(normalized):
        raise serializers.ValidationError(CAMBODIA_PHONE_ERROR)
    return normalized
