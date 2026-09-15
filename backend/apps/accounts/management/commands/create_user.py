#!/usr/bin/env python
"""
Create a Shadow Shop user with a specific role.

Usage:
    python manage.py create_user
    python manage.py create_user --username seller1 --email seller@example.com --password "Pass123" --role seller
    python manage.py create_user --username cashier1 --role cashier --first-name John --last-name Doe
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create a user with a specified role.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='', help='Login username')
        parser.add_argument('--email', default='', help='Email address')
        parser.add_argument('--password', default='', help='Password (prompted if omitted)')
        parser.add_argument('--role', default='customer', help='Role: super_admin, admin, seller, cashier, warehouse, scanner, delivery, customer')
        parser.add_argument('--first-name', default='', help='First name')
        parser.add_argument('--last-name', default='', help='Last name')
        parser.add_argument('--phone', default='', help='Phone number')
        parser.add_argument('--no-staff', action='store_true', help='Set is_staff=False (default: True for non-customer roles)')

    def handle(self, *args, **options):
        User = get_user_model()

        VALID_ROLES = ['super_admin', 'admin', 'seller', 'cashier', 'warehouse', 'scanner', 'delivery', 'customer']

        username = (options['username'] or '').strip() or input('Username: ').strip()
        email = (options['email'] or '').strip() or input('Email: ').strip()
        role = (options['role'] or '').strip().lower()

        if role not in VALID_ROLES:
            raise CommandError(f'Invalid role "{role}". Choose from: {", ".join(VALID_ROLES)}')

        password = options['password'] or ''
        if not password:
            from getpass import getpass
            password = getpass('Password: ')
            confirm = getpass('Password (again): ')
            if password != confirm:
                raise CommandError('Passwords do not match.')

        if not username:
            raise CommandError('Username is required.')
        if not password:
            raise CommandError('Password is required.')

        if User.objects.filter(username=username).exists():
            raise CommandError(f'User "{username}" already exists.')

        # Determine is_staff and is_superuser
        is_staff = role in ['super_admin', 'admin', 'seller', 'cashier', 'warehouse', 'scanner', 'delivery']
        is_superuser = role == 'super_admin'

        if options['no_staff']:
            is_staff = False

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=options['first_name'],
            last_name=options['last_name'],
            phone=options['phone'],
            role=role,
            is_staff=is_staff,
            is_superuser=is_superuser,
            is_active=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'Created user: id={user.id} username={user.username} role={user.role} is_staff={user.is_staff}'
        ))
