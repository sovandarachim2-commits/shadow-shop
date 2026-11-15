import re

from rest_framework import generics, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission, IsAuthenticated

from utils.permissions import user_has_module_permission
from utils.storefront_cache import bump_storefront_cache
from utils.translation import translate_about_fields
from .about_page import validate_about_page
from .models import SiteSettings


class AboutPageSettingsSerializer(serializers.ModelSerializer):
    about_hero_image_url = serializers.SerializerMethodField()
    clear_about_hero_image = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = SiteSettings
        fields = ('about_page', 'about_hero_image', 'about_hero_image_url', 'clear_about_hero_image')
        extra_kwargs = {'about_hero_image': {'write_only': True, 'required': False}}

    def get_about_hero_image_url(self, obj):
        if not obj.about_hero_image:
            return None
        url = obj.about_hero_image.url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def validate_about_page(self, value):
        return validate_about_page(value)

    def validate_about_hero_image(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Choose an image smaller than 5 MB.')
        return value

    def update(self, instance, validated_data):
        clear_image = validated_data.pop('clear_about_hero_image', False)
        if clear_image and 'about_hero_image' not in validated_data:
            validated_data['about_hero_image'] = None
        return super().update(instance, validated_data)


class CanManageAboutPage(BasePermission):
    def has_permission(self, request, view):
        action = 'view' if request.method in ('GET', 'HEAD', 'OPTIONS') else 'edit'
        return user_has_module_permission(request.user, 'settings_about', action)


class AboutPageSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = AboutPageSettingsSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated, CanManageAboutPage]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return SiteSettings.get_solo()

    def perform_update(self, serializer):
        serializer.save()
        bump_storefront_cache()


class AboutPageTranslationSerializer(serializers.Serializer):
    source_language = serializers.ChoiceField(choices=('en', 'km'))
    target_language = serializers.ChoiceField(choices=('en', 'km'))
    fields = serializers.DictField(child=serializers.CharField(max_length=6000, allow_blank=True))

    def validate_fields(self, fields):
        if len(fields) > 32 or any(not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,79}', key) for key in fields):
            raise serializers.ValidationError('Translate up to 32 content fields at a time.')
        cleaned = {key: text.strip() for key, text in fields.items() if text.strip()}
        if not cleaned:
            raise serializers.ValidationError('Enter content in the source language first.')
        if sum(len(text) for text in cleaned.values()) > 20000:
            raise serializers.ValidationError('Translate up to 20,000 characters at a time.')
        return cleaned

    def validate(self, attrs):
        if attrs['source_language'] == attrs['target_language']:
            raise serializers.ValidationError('Choose different source and target languages.')
        return attrs


class AboutPageTranslateView(APIView):
    permission_classes = [IsAuthenticated, CanManageAboutPage]

    def post(self, request):
        serializer = AboutPageTranslationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            translated = translate_about_fields(data['fields'], data['source_language'], data['target_language'])
        except Exception:
            return Response(
                {'detail': 'Auto-translation is temporarily unavailable. Your content has not changed. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({'target_language': data['target_language'], 'fields': translated})
