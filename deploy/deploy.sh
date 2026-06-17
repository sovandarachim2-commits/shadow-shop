#!/bin/bash
set -e

echo "=== Shadow Shop Deployment Script ==="
APP_DIR="/var/www/shadow_shop"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "1. Pulling latest code..."
cd $APP_DIR
git pull origin main

echo "2. Backend: Install dependencies..."
source $APP_DIR/venv/bin/activate
pip install -r $BACKEND_DIR/requirements.txt

echo "3. Backend: Run migrations..."
cd $BACKEND_DIR
python manage.py migrate --settings=config.settings.production

echo "4. Backend: Collect static files..."
python manage.py collectstatic --noinput --settings=config.settings.production

echo "5. Frontend: Install & Build..."
cd $FRONTEND_DIR
npm install
npm run build

echo "6. Restarting services..."
sudo systemctl restart shadow_shop
sudo systemctl reload nginx

echo "=== Deployment Complete ==="
sudo systemctl status shadow_shop --no-pager
