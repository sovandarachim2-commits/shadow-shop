from django.core.management.base import BaseCommand

from apps.products.models import ProductImage, ProductSetImage
from utils.image_optimization import ensure_card_variant


class Command(BaseCommand):
    help = 'Generate optimized card-size WebP variants for existing product images.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=0, help='Maximum images per image type to process.')

    def handle(self, *args, **options):
        limit = options['limit']
        total_created = 0

        for label, model in (('product', ProductImage), ('product set', ProductSetImage)):
            queryset = model.objects.exclude(image='').order_by('id')
            if limit:
                queryset = queryset[:limit]

            created = 0
            checked = 0
            iterator = queryset if limit else queryset.iterator()
            for item in iterator:
                checked += 1
                if ensure_card_variant(item.image):
                    created += 1

            total_created += created
            self.stdout.write(self.style.SUCCESS(f'{label}: checked {checked}, variants ready {created}'))

        self.stdout.write(self.style.SUCCESS(f'Done. Variants ready: {total_created}'))
