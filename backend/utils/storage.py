from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings
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
