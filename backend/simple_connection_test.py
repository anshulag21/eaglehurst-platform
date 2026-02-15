#!/usr/bin/env python3
"""
Simple MariaDB Connection Test using socket

This script tests basic network connectivity to the MariaDB server
without requiring additional dependencies.
"""

import socket
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_network_connectivity():
    """Test basic network connectivity to MariaDB server"""
    host = '37.220.31.46'
    port = 3306
    timeout = 10
    
    logger.info(f"🔌 Testing network connectivity to {host}:{port}...")
    
    try:
        # Create socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        
        # Attempt connection
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            logger.info(f"✅ Network connectivity successful to {host}:{port}")
            return True
        else:
            logger.error(f"❌ Network connectivity failed to {host}:{port} (error code: {result})")
            return False
            
    except socket.gaierror as e:
        logger.error(f"❌ DNS resolution failed for {host}: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Network test failed: {e}")
        return False

def generate_mysql_commands():
    """Generate MySQL commands for manual execution"""
    logger.info("📝 Generating MySQL commands for manual execution...")
    
    commands = [
        "-- Connect to MariaDB server",
        "-- mysql -h 37.220.31.46 -u remoteuser123 -p",
        "",
        "-- Create database if it doesn't exist",
        "CREATE DATABASE IF NOT EXISTS eaglehurst_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
        "",
        "-- Use the database",
        "USE eaglehurst_db;",
        "",
        "-- Show current database",
        "SELECT DATABASE();",
        "",
        "-- Show server version",
        "SELECT VERSION();",
        "",
        "-- Show existing tables",
        "SHOW TABLES;",
    ]
    
    print("\n" + "="*60)
    print("📝 MANUAL MYSQL COMMANDS")
    print("="*60)
    for command in commands:
        print(command)
    print("="*60)
    
    return commands

def create_database_url():
    """Create and display the database URL"""
    config = {
        'host': '37.220.31.46',
        'user': 'remoteuser123',
        'password': 'G7v$9kL2pQ!x',
        'database': 'eaglehurst_db',
        'port': 3306
    }
    
    database_url = f"mysql+pymysql://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
    
    print("\n" + "="*60)
    print("🔗 DATABASE CONNECTION URL")
    print("="*60)
    print("Add this to your .env file:")
    print(f'DATABASE_URL="{database_url}"')
    print("="*60)
    
    return database_url

def main():
    """Main test function"""
    logger.info("🚀 Starting MariaDB connection test...")
    
    # Test network connectivity
    if test_network_connectivity():
        logger.info("✅ Network connectivity test passed")
        
        # Generate manual commands
        generate_mysql_commands()
        
        # Create database URL
        create_database_url()
        
        print("\n" + "="*60)
        print("🎉 NEXT STEPS")
        print("="*60)
        print("1. Install MySQL client dependencies:")
        print("   pip install pymysql cryptography")
        print("")
        print("2. Run the full migration script:")
        print("   python migrate_to_mariadb.py")
        print("")
        print("3. Or manually connect and create tables:")
        print("   mysql -h 37.220.31.46 -u remoteuser123 -p")
        print("="*60)
        
        return True
    else:
        logger.error("❌ Network connectivity test failed")
        
        print("\n" + "="*60)
        print("❌ CONNECTION FAILED")
        print("="*60)
        print("Possible issues:")
        print("1. Server is not accessible from your network")
        print("2. Firewall blocking port 3306")
        print("3. MariaDB server is not running")
        print("4. Incorrect host/port configuration")
        print("="*60)
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
