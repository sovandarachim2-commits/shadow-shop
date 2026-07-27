from io import BytesIO
from pathlib import PurePosixPath

from django.core.files.base import ContentFile
from PIL import Image, ImageOps


CARD_IMAGE_MAX_PX = 720
UPLOAD_IMAGE_MAX_PX = 1600
CARD_IMAGE_QUALITY = 78
UPLOAD_IMAGE_QUALITY = 84


def _webp_name(name, suffix):
    path = PurePosixPath(name)
    return str(path.with_name(f'{path.stem}{suffix}.webp'))


def _prepare_image(source, max_px, quality):
    image = Image.open(source)
    image = ImageOps.exif_transpose(image)
    if image.mode not in ('RGB', 'RGBA'):
      image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
    image.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)

    output = BytesIO()
    image.save(output, format='WEBP', quality=quality, method=6)
    output.seek(0)
    return output


def optimize_uploaded_image(uploaded_file, max_px=UPLOAD_IMAGE_MAX_PX, quality=UPLOAD_IMAGE_QUALITY):
    try:
        uploaded_file.seek(0)
        output = _prepare_image(uploaded_file, max_px=max_px, quality=quality)
    except Exception:
        try:
            uploaded_file.seek(0)
        except Exception:
            pass
        return uploaded_file

    optimized = ContentFile(output.read())
    optimized.name = _webp_name(getattr(uploaded_file, 'name', 'image'), '')
    return optimized


def ensure_card_variant(image_field, max_px=CARD_IMAGE_MAX_PX, quality=CARD_IMAGE_QUALITY):
    if not image_field:
        return None

    storage = image_field.storage
    variant_name = _webp_name(image_field.name, '__card')
    if storage.exists(variant_name):
        return variant_name

    try:
        with image_field.open('rb') as source:
            output = _prepare_image(source, max_px=max_px, quality=quality)
        storage.save(variant_name, ContentFile(output.read()))
        return variant_name
    except Exception:
        return None


def card_variant_url(image_field, request=None):
    if not image_field:
        return None

    storage = image_field.storage
    variant_name = _webp_name(image_field.name, '__card')
    name = variant_name if storage.exists(variant_name) else image_field.name
    url = storage.url(name)
    return request.build_absolute_uri(url) if request else url
