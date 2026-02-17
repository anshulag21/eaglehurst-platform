import psycopg2
import random
import time

# New PostgreSQL connection details provided by user
conn_string = "postgresql://postgres:vIGZUYMlHipTLnKyyyvReDPwSoDPIbYI@centerbeam.proxy.rlwy.net:27160/railway"

def populate_analytics_postgres():
    print(f"Connecting to PostgreSQL at centerbeam.proxy.rlwy.net:27160...")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(conn_string)
            print("Connected successfully to PostgreSQL!")
            
            cursor = conn.cursor()
            
            # Get listing IDs
            cursor.execute("SELECT id FROM listings")
            listings = cursor.fetchall()
            print(f"Found {len(listings)} listings. Updating metrics...")
            
            for listing in listings:
                lid = listing[0]
                # Generate random plausible counts
                vc = random.randint(150, 1200)
                cc = random.randint(10, 45)
                
                # Update the listing
                # Use %s for placeholder in psycopg2
                sql = "UPDATE listings SET view_count = %s, connection_count = %s WHERE id = %s"
                cursor.execute(sql, (vc, cc, lid))
            
            # Commit the changes
            conn.commit()
            print("Successfully populated analytics data (PostgreSQL).")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(2)
            
    print("Max retries reached. Population failed.")
    return False

if __name__ == "__main__":
    populate_analytics_postgres()
