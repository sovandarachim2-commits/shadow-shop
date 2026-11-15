from unittest.mock import Mock, patch

from django.test import SimpleTestCase
import requests

from utils.translation import _utf8_chunks, translate_about_fields, translate_text


class ContentTranslationTests(SimpleTestCase):
    def setUp(self):
        primary_timer = patch('utils.translation._primary_retry_after', 0)
        primary_timer.start()
        self.addCleanup(primary_timer.stop)

    @patch('utils.translation.requests.get')
    def test_provider_segments_are_joined_and_direction_is_sent(self, get):
        get.return_value = Mock(json=Mock(return_value=[[
            ['Hello ', 'សួស្ដី', None], ['shop', 'ហាង', None],
        ]]))
        self.assertEqual(translate_text('សួស្ដីហាង', 'km', 'en'), 'Hello shop')
        self.assertEqual(get.call_args.kwargs['params']['sl'], 'km')
        self.assertEqual(get.call_args.kwargs['params']['tl'], 'en')

    @patch('utils.translation.translate_text', side_effect=lambda text, source, target: f'Translated {text}')
    def test_placeholders_are_preserved_and_duplicate_text_is_requested_once(self, translate):
        result = translate_about_fields({'intro': 'Sell with {{storeName}}', 'description': 'Sell with {{storeName}}'}, 'en', 'km')
        self.assertEqual(result['intro'], 'Translated Sell with {{storeName}}')
        self.assertEqual(result['description'], result['intro'])
        self.assertEqual(translate.call_count, 1)

    @patch('utils.translation._translate_mymemory_segment', side_effect=lambda text, source, target: f'Translated {text}')
    @patch('utils.translation.translate_text', return_value='Missing placeholder')
    def test_lost_placeholder_uses_fallback_without_exposing_the_placeholder(self, _translate, fallback):
        result = translate_about_fields({'intro': 'Sell with {{storeName}}.'}, 'en', 'km')
        self.assertEqual(result['intro'], 'Translated Sell with {{storeName}}.')
        fallback.assert_called_once_with('Sell with', 'en', 'km')

    @patch('utils.translation._translate_fallback_text', return_value='')
    @patch('utils.translation.translate_text', return_value='')
    def test_empty_provider_result_rejects_translation(self, _translate, _fallback):
        with self.assertRaises(ValueError):
            translate_about_fields({'intro': 'Welcome'}, 'en', 'km')

    @patch('utils.translation.translate_text', return_value='Shop online')
    def test_khmer_to_english_direction(self, translate):
        self.assertEqual(translate_about_fields({'title': 'ទិញតាមអនឡាញ'}, 'km', 'en'), {'title': 'Shop online'})
        translate.assert_called_once_with('ទិញតាមអនឡាញ', 'km', 'en')

    @patch('utils.translation._translate_mymemory_segment', return_value='Fallback translation')
    @patch('utils.translation.translate_text')
    def test_rate_limit_uses_fallback_and_avoids_repeated_primary_requests(self, translate, fallback):
        translate.side_effect = requests.HTTPError(response=Mock(status_code=429))
        self.assertEqual(translate_about_fields({'title': 'Shop'}, 'en', 'km')['title'], 'Fallback translation')
        self.assertEqual(translate_about_fields({'title': 'Welcome'}, 'en', 'km')['title'], 'Fallback translation')
        self.assertEqual(translate.call_count, 1)
        self.assertEqual(fallback.call_count, 2)

    def test_khmer_chunks_respect_provider_byte_limit(self):
        text = 'សូមស្វាគមន៍ ' * 200
        chunks = _utf8_chunks(text)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk.encode('utf-8')) <= 480 for chunk in chunks))
        self.assertEqual(' '.join(chunks), text.strip())
