import json
import re

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import serializers


SECTION_KEYS = {'highlights', 'services', 'story', 'stores', 'partners', 'contact', 'telegram'}
CONTACT_LIMITS = {'name': 200, 'phone': 80, 'email': 254, 'address': 2000, 'telegram_url': 500}


def validate_about_page(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('About Us content must be valid JSON.')
    if not isinstance(value, dict) or set(value) - {'content', 'sections', 'contact'}:
        raise serializers.ValidationError('Use content, sections, and contact objects for About Us settings.')

    content = value.get('content', {})
    sections = value.get('sections', {})
    contact = value.get('contact', {})
    if not isinstance(content, dict) or set(content) - {'en', 'km'}:
        raise serializers.ValidationError('Content must contain English (en) and/or Khmer (km) objects.')
    for language, fields in content.items():
        if not isinstance(fields, dict) or len(fields) > 120:
            raise serializers.ValidationError(f'{language} content must be an object with at most 120 fields.')
        for key, text in fields.items():
            if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,79}', key) or not isinstance(text, str) or len(text) > 6000:
                raise serializers.ValidationError(f'{language}.{key}: use plain text up to 6000 characters.')
    if not isinstance(sections, dict) or set(sections) - SECTION_KEYS or any(type(flag) is not bool for flag in sections.values()):
        raise serializers.ValidationError('Section visibility must use the supported section names and true/false values.')
    if not isinstance(contact, dict) or set(contact) - CONTACT_LIMITS.keys():
        raise serializers.ValidationError('Contact details contain an unsupported field.')
    for key, text in contact.items():
        if not isinstance(text, str) or len(text) > CONTACT_LIMITS[key]:
            raise serializers.ValidationError(f'Contact {key} must be text up to {CONTACT_LIMITS[key]} characters.')
    if contact.get('email'):
        try:
            validate_email(contact['email'])
        except ValidationError:
            raise serializers.ValidationError('Enter a valid contact email address.')
    if contact.get('telegram_url') and not re.fullmatch(
        r'(?:@[A-Za-z0-9_]+|(?:https://)?(?:t\.me|telegram\.me)/\S+)', contact['telegram_url'], re.IGNORECASE,
    ):
        raise serializers.ValidationError('Telegram contact must be @username or a t.me / telegram.me link.')
    return value
