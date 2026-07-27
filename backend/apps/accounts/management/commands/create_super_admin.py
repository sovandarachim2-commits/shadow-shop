#!/usr/bin/env python
"""
Create one Shadow Shop super admin (role=super_admin).

Usage:
    python manage.py create_super_admin
    python manage.py create_super_admin --username admin --email admin@example.com --password "YourStrongPass"
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create a user with role=super_admin (is_staff + is_superuser).'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='', help='Login username')
        parser.add_argument('--email', default='', help='Email address')
        parser.add_argument('--password', default='', help='Password (prompted if omitted)')
        parser.add_argument('--first-name', default='Super', help='First name')
        parser.add_argument('--last-name', default='Admin', help='Last name')

    def handle(self, *args, **options):
        User = get_user_model()

        username = (options['username'] or '').strip() or input('Username: ').strip()
        email = (options['email'] or '').strip() or input('Email: ').strip()
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

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=options['first_name'],
            last_name=options['last_name'],
            role='super_admin',
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.stdout.write(self.style.SUCCESS(
            f'Created super_admin: id={user.id} username={user.username} email={user.email}'
        ))
