#!/bin/bash
set -e

echo "=== Shadow Shop Initial Setup ==="

# Install system dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.13 python3.13-venv python3-pip \
    nginx mysql-server redis-server git curl nodejs npm certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/shadow_shop
sudo mkdir -p /var/log/shadow_shop
sudo chown -R www-data:www-data /var/log/shadow_shop

# Setup MySQL
echo "Creating MySQL database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS shadow_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'shadow_user'@'localhost' IDENTIFIED BY 'your-db-password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON shadow_shop.* TO 'shadow_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Setup Python virtual environment
cd /var/www/shadow_shop
python3.13 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Copy environment file
cp backend/.env.example backend/.env
echo "IMPORTANT: Edit /var/www/shadow_shop/backend/.env with your settings!"

# Setup Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/shadow_shop
sudo ln -sf /etc/nginx/sites-available/shadow_shop /etc/nginx/sites-enabled/shadow_shop
sudo nginx -t && sudo systemctl reload nginx

# Setup systemd service
sudo cp deploy/shadow_shop.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable shadow_shop

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Edit /var/www/shadow_shop/backend/.env"
echo "2. Run: python manage.py migrate --settings=config.settings.production"
echo "3. Run: python manage.py createsuperuser"
echo "4. Run: sudo systemctl start shadow_shop"
echo "5. Setup SSL: certbot --nginx -d your-domain.com"
