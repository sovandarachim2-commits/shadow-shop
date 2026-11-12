from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage
from urllib.parse import urlparse


def _public_domain():
    parsed = urlparse(settings.R2_PUBLIC_URL)
    return parsed.netloc or parsed.path


class R2MediaStorage(S3Boto3Storage):
    bucket_name = settings.R2_BUCKET_NAME
    custom_domain = _public_domain()
    default_acl = None
    file_overwrite = False
    querystring_auth = False


class LocalServerMediaStorage(FileSystemStorage):
    """Store files on the local server disk under MEDIA_ROOT even when R2 is active."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('location', settings.MEDIA_ROOT)
        kwargs.setdefault('base_url', getattr(settings, 'LOCAL_MEDIA_URL', '/media/'))
        super().__init__(*args, **kwargs)


def get_local_media_storage():
    """Callable storage factory for model fields stored directly on the VPS server."""
    return LocalServerMediaStorage()
