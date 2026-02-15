#!/usr/bin/env python3
"""
Simple MariaDB Connection Test

This script tests the connection to the remote MariaDB server
and creates the database if it doesn't exist.
"""

import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_with_pymysql():
    """Test connection using pymysql directly"""
    try:
        import pymysql
        
        # Connection parameters
        config = {
            'host': '37.220.31.46',
            'user': 'remoteuser123',
            'password': 'G7v$9kL2pQ!x',
            'port': 3306,
            'charset': 'utf8mb4'
        }
        
        logger.info("🔌 Testing connection with pymysql...")
        
        # Test connection without database
        connection = pymysql.connect(**config)
        cursor = connection.cursor()
        
        # Get server version
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        logger.info(f"✅ Connected to MariaDB/MySQL version: {version}")
        
        # Check if database exists
        database_name = 'eaglehurst_db'
        cursor.execute(f"SHOW DATABASES LIKE '{database_name}'")
        result = cursor.fetchone()
        
        if result:
            logger.info(f"✅ Database '{database_name}' already exists")
        else:
            # Create database
            cursor.execute(f"CREATE DATABASE {database_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            logger.info(f"✅ Created database '{database_name}'")
        
        # Test connection to the specific database
        cursor.execute(f"USE {database_name}")
        logger.info(f"✅ Successfully connected to database '{database_name}'")
        
        # Show existing tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        if tables:
            logger.info(f"📋 Found {len(tables)} existing tables: {[table[0] for table in tables]}")
        else:
            logger.info("📋 No tables found in database (empty database)")
        
        cursor.close()
        connection.close()
        
        logger.info("🎉 Connection test successful!")
        
        print("\n" + "="*50)
        print("🎉 CONNECTION TEST SUCCESSFUL!")
        print("="*50)
        print(f"Host: {config['host']}")
        print(f"Port: {config['port']}")
        print(f"Database: {database_name}")
        print(f"Server Version: {version}")
        print("="*50)
        
        return True
        
    except ImportError:
        logger.error("❌ pymysql not installed. Install with: pip install pymysql")
        return False
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

def test_with_sqlalchemy():
    """Test connection using SQLAlchemy"""
    try:
        from sqlalchemy import create_engine, text
        
        database_url = "mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"
        
        logger.info("🔌 Testing connection with SQLAlchemy...")
        
        engine = create_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"charset": "utf8mb4"}
        )
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            version = result.fetchone()[0]
            logger.info(f"✅ SQLAlchemy connection successful! Version: {version}")
        
        engine.dispose()
        return True
        
    except ImportError as e:
        logger.error(f"❌ SQLAlchemy or pymysql not available: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ SQLAlchemy connection failed: {e}")
        return False

def main():
    """Main test function"""
    logger.info("🚀 Starting MariaDB connection test...")
    
    # Test with pymysql first
    if test_with_pymysql():
        logger.info("✅ pymysql test passed")
    else:
        logger.error("❌ pymysql test failed")
        return False
    
    # Test with SQLAlchemy
    if test_with_sqlalchemy():
        logger.info("✅ SQLAlchemy test passed")
    else:
        logger.warning("⚠️  SQLAlchemy test failed (but pymysql works)")
    
    logger.info("🎉 All tests completed!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
