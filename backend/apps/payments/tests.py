from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.payments.services import _bakong_response_is_paid, _mark_bakong_paid


class BakongPaymentStatusTests(SimpleTestCase):
    def test_production_transaction_payload_is_paid(self):
        self.assertTrue(_bakong_response_is_paid({
            'responseCode': 0,
            'data': {
                'transactionId': 'txn-123',
                'fromAccountId': 'customer@bank',
                'toAccountId': 'merchant@bank',
                'amount': '12.50',
            },
        }))

    def test_empty_success_response_is_not_paid(self):
        self.assertFalse(_bakong_response_is_paid({
            'responseCode': 0,
            'data': {},
        }))


class BakongPaymentTelegramTests(SimpleTestCase):
    def test_mark_paid_queues_order_confirmation_and_payment_notification_after_commit(self):
        order = SimpleNamespace(
            id=321,
            payment_status='unpaid',
            payment_method='',
            grand_total=12.50,
            save=Mock(),
        )
        payment = SimpleNamespace(
            status='pending',
            paid_at=None,
            pending_checkout_id=None,
            order_id=order.id,
            order=order,
            md5='abc123',
        )
        user = SimpleNamespace(id=7)
        on_commit_callbacks = []

        with (
            patch('apps.payments.services.award_points_for_paid_order') as award_points,
            patch('apps.payments.services.Revenue.objects.get_or_create') as create_revenue,
            patch('apps.payments.services.transaction.on_commit', side_effect=on_commit_callbacks.append),
            patch('apps.payments.services.TelegramService') as telegram_service,
        ):
            _mark_bakong_paid(
                payment,
                {'responseCode': '0', 'data': {'hash': 'txn-123'}},
                user=user,
            )

            self.assertEqual(payment.status, 'paid')
            self.assertEqual(order.payment_status, 'paid')
            self.assertEqual(order.payment_method, 'bakong')
            award_points.assert_called_once_with(order)
            create_revenue.assert_called_once()
            self.assertEqual(len(on_commit_callbacks), 2)
            telegram_service.confirm_order_after_payment_async.assert_not_called()
            telegram_service.return_value.notify_payment_received.assert_not_called()

            for callback in on_commit_callbacks:
                callback()

            telegram_service.confirm_order_after_payment_async.assert_called_once_with(order.id, user.id)
            telegram_service.return_value.notify_payment_received.assert_called_once_with(order)
