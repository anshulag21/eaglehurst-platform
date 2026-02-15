#!/bin/bash
set -e

echo "🏗️  Setting up Local MySQL for Eaglehurst Development"
echo "============================================================"

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo "🚀 Starting MySQL service..."
    brew services start mysql
    sleep 3
fi

echo "🔧 Setting up MySQL database and user..."
echo "Please enter your MySQL root password when prompted (or press Enter if no password)"

# Create database and user
mysql -u root -p << 'EOF'
CREATE DATABASE IF NOT EXISTS eaglehurst_local;
CREATE USER IF NOT EXISTS 'eaglehurst_user'@'localhost' IDENTIFIED BY 'eaglehurst_pass';
GRANT ALL PRIVILEGES ON eaglehurst_local.* TO 'eaglehurst_user'@'localhost';
FLUSH PRIVILEGES;
SELECT 'Database setup completed!' as status;
EOF

echo "✅ MySQL database setup completed!"

# Test the connection
echo "🔍 Testing database connection..."
mysql -u eaglehurst_user -peaglehurst_pass -e "USE eaglehurst_local; SELECT 'Connection successful!' as status;"

echo ""
echo "✅ Database connection test successful!"
echo ""
echo "📋 Database Details:"
echo "- Host: localhost"
echo "- Port: 3306" 
echo "- Database: eaglehurst_local"
echo "- Username: eaglehurst_user"
echo "- Password: eaglehurst_pass"
echo ""
echo "🔄 Next: Update your backend .env file and run migrations"
