"""Text translation shared by storefront content editors."""

import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from html import unescape

import requests


_primary_retry_after = 0


def translate_text(text, source_lang='en', target_lang='km'):
    cleaned = str(text or '').strip()
    if not cleaned:
        return ''
    response = requests.get(
        'https://translate.googleapis.com/translate_a/single',
        params={'client': 'gtx', 'sl': source_lang, 'tl': target_lang, 'dt': 't', 'q': cleaned},
        timeout=5,
    )
    response.raise_for_status()
    data = response.json()
    return ''.join(part[0] for part in (data[0] or []) if part and part[0]).strip()


def _utf8_chunks(text, limit=480):
    remaining = text.strip()
    chunks = []
    while len(remaining.encode('utf-8')) > limit:
        used = 0
        end = 0
        for character in remaining:
            size = len(character.encode('utf-8'))
            if used + size > limit:
                break
            used += size
            end += 1
        space = remaining.rfind(' ', 0, end)
        if space > end // 2:
            end = space
        while end > 0 and unicodedata.category(remaining[end]).startswith('M'):
            end -= 1
        if end == 0:
            raise ValueError('Content cannot be split for translation.')
        chunks.append(remaining[:end].strip())
        remaining = remaining[end:].lstrip()
    if remaining:
        chunks.append(remaining)
    return chunks


def _translate_mymemory_segment(text, source_lang, target_lang):
    results = []
    for chunk in _utf8_chunks(text):
        response = requests.get(
            'https://api.mymemory.translated.net/get',
            params={'q': chunk, 'langpair': f'{source_lang}|{target_lang}'},
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        translated = (payload.get('responseData') or {}).get('translatedText', '')
        if str(payload.get('responseStatus')) != '200' or not isinstance(translated, str) or not translated.strip():
            raise ValueError('The fallback translation service is unavailable.')
        results.append(unescape(translated).strip())
    return ' '.join(results)


def _translate_fallback_text(text, source_lang, target_lang):
    result = []
    for part in re.split(r'(\{\{\s*\w+\s*\}\})', text):
        if re.fullmatch(r'\{\{\s*\w+\s*\}\}', part) or not re.search(r'\w', part):
            result.append(part)
            continue
        leading = part[:len(part) - len(part.lstrip())]
        trailing = part[len(part.rstrip()):]
        result.append(leading + _translate_mymemory_segment(part.strip(), source_lang, target_lang) + trailing)
    return ''.join(result)


def _translate_with_placeholders(text, source_lang, target_lang):
    global _primary_retry_after
    placeholders = {}

    def protect(match):
        marker = f'ZXQPH{len(placeholders)}QXZ'
        placeholders[marker] = match.group(0)
        return marker

    protected = re.sub(r'\{\{\s*\w+\s*\}\}', protect, text)
    translated = ''
    if time.monotonic() >= _primary_retry_after:
        try:
            translated = translate_text(protected, source_lang, target_lang)
            if not translated or any(marker not in translated for marker in placeholders):
                raise ValueError('The primary service did not preserve the content.')
            for marker, original in placeholders.items():
                translated = translated.replace(marker, original)
        except (requests.RequestException, ValueError, IndexError, TypeError) as error:
            if isinstance(error, requests.HTTPError) and error.response is not None and error.response.status_code == 429:
                _primary_retry_after = time.monotonic() + 300
            translated = ''
    if not translated:
        translated = _translate_fallback_text(text, source_lang, target_lang)
    if not translated.strip():
        raise ValueError('The translation service returned empty text.')
    if len(translated) > 6000:
        raise ValueError('Translated content is too long for this field.')
    return translated


def translate_about_fields(fields, source_lang, target_lang):
    if not fields:
        return {}
    texts = list(dict.fromkeys(fields.values()))
    with ThreadPoolExecutor(max_workers=min(4, len(texts))) as executor:
        translated = list(executor.map(
            lambda text: _translate_with_placeholders(text, source_lang, target_lang), texts,
        ))
    by_text = dict(zip(texts, translated))
    return {key: by_text[text] for key, text in fields.items()}
