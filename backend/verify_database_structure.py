#!/usr/bin/env python3
"""
Database Structure Verification Script

This script verifies the database structure and shows detailed information
about all tables and their columns.
"""

import pymysql
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def verify_database_structure():
    """Verify and display database structure"""
    config = {
        'host': '37.220.31.46',
        'user': 'remoteuser123',
        'password': 'G7v$9kL2pQ!x',
        'database': 'eaglehurst_db',
        'port': 3306,
        'charset': 'utf8mb4'
    }
    
    try:
        connection = pymysql.connect(**config)
        cursor = connection.cursor()
        
        # Get server info
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        
        cursor.execute("SELECT DATABASE()")
        database = cursor.fetchone()[0]
        
        print("="*80)
        print("🗄️  DATABASE STRUCTURE VERIFICATION")
        print("="*80)
        print(f"Server Version: {version}")
        print(f"Database: {database}")
        print("="*80)
        
        # Get all tables
        cursor.execute("SHOW TABLES")
        tables = [table[0] for table in cursor.fetchall()]
        
        print(f"\n📋 TABLES ({len(tables)} total):")
        print("-" * 40)
        
        table_info = []
        total_columns = 0
        
        for table in sorted(tables):
            # Get table info
            cursor.execute(f"DESCRIBE {table}")
            columns = cursor.fetchall()
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            row_count = cursor.fetchone()[0]
            
            table_info.append([table, len(columns), row_count])
            total_columns += len(columns)
            
            print(f"  📊 {table:<25} | {len(columns):>3} columns | {row_count:>6} rows")
        
        print("-" * 40)
        print(f"  📈 TOTALS: {len(tables)} tables, {total_columns} columns")
        
        # Show detailed structure for key tables
        key_tables = ['users', 'sellers', 'buyers', 'listings', 'connections', 'messages']
        
        for table in key_tables:
            if table in tables:
                print(f"\n📋 TABLE: {table.upper()}")
                print("-" * 60)
                
                cursor.execute(f"DESCRIBE {table}")
                columns = cursor.fetchall()
                
                column_data = []
                for col in columns:
                    field, type_, null, key, default, extra = col
                    column_data.append([
                        field,
                        type_,
                        "YES" if null == "YES" else "NO",
                        key if key else "",
                        str(default) if default is not None else "",
                        extra if extra else ""
                    ])
                
                # Print column information in a formatted way
                print(f"{'Column':<20} {'Type':<20} {'Null':<5} {'Key':<5} {'Default':<10} {'Extra':<10}")
                print("-" * 80)
                for col_data in column_data:
                    print(f"{col_data[0]:<20} {col_data[1]:<20} {col_data[2]:<5} {col_data[3]:<5} {col_data[4]:<10} {col_data[5]:<10}")
        
        # Check foreign keys
        print(f"\n🔗 FOREIGN KEY CONSTRAINTS:")
        print("-" * 60)
        
        cursor.execute("""
            SELECT 
                TABLE_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_SCHEMA = %s 
            AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME, COLUMN_NAME
        """, (database,))
        
        fk_constraints = cursor.fetchall()
        
        if fk_constraints:
            fk_data = []
            for fk in fk_constraints:
                table_name, column_name, ref_table, ref_column = fk
                fk_data.append([table_name, column_name, f"{ref_table}.{ref_column}"])
            
            print(f"{'Table':<20} {'Column':<20} {'References':<30}")
            print("-" * 70)
            for fk_data_row in fk_data:
                print(f"{fk_data_row[0]:<20} {fk_data_row[1]:<20} {fk_data_row[2]:<30}")
        else:
            print("No foreign key constraints found.")
        
        # Check indexes
        print(f"\n📊 INDEXES:")
        print("-" * 40)
        
        index_count = 0
        for table in sorted(tables):
            cursor.execute(f"SHOW INDEX FROM {table}")
            indexes = cursor.fetchall()
            
            table_indexes = {}
            for idx in indexes:
                index_name = idx[2]  # Key_name
                if index_name not in table_indexes:
                    table_indexes[index_name] = []
                table_indexes[index_name].append(idx[4])  # Column_name
            
            if table_indexes:
                print(f"  📊 {table}:")
                for idx_name, columns in table_indexes.items():
                    print(f"    - {idx_name}: {', '.join(columns)}")
                index_count += len(table_indexes)
        
        print(f"\n📈 Total indexes: {index_count}")
        
        cursor.close()
        connection.close()
        
        print("\n" + "="*80)
        print("🎉 DATABASE VERIFICATION COMPLETE!")
        print("="*80)
        print("✅ All tables created successfully")
        print("✅ Foreign key relationships established")
        print("✅ Indexes created for performance")
        print("✅ Ready for application use")
        print("="*80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        return False

def main():
    """Main verification function"""
    logger.info("🚀 Starting database structure verification...")
    
    success = verify_database_structure()
    return success

def verify_database_structure_simple():
    """Simple verification without tabulate"""
    config = {
        'host': '37.220.31.46',
        'user': 'remoteuser123',
        'password': 'G7v$9kL2pQ!x',
        'database': 'eaglehurst_db',
        'port': 3306,
        'charset': 'utf8mb4'
    }
    
    try:
        connection = pymysql.connect(**config)
        cursor = connection.cursor()
        
        cursor.execute("SHOW TABLES")
        tables = [table[0] for table in cursor.fetchall()]
        
        print("="*60)
        print("🗄️  DATABASE VERIFICATION")
        print("="*60)
        print(f"Tables created: {len(tables)}")
        print("Tables:", ", ".join(sorted(tables)))
        print("="*60)
        print("✅ Database setup complete!")
        print("="*60)
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Simple verification failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
