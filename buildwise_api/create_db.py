import asyncio
import asyncpg

async def create_database():
    print("Attempting to connect to PostgreSQL...")
    try:
        # Connect to default 'postgres' database to execute admin commands
        conn = await asyncpg.connect(
            user='postgres',
            password='postgres',
            database='postgres',
            host='localhost',
            port=5432
        )
        print("Connection to default 'postgres' database successful!")

        # Check if 'buildwise' database exists
        query = "SELECT 1 FROM pg_database WHERE datname = $1"
        row = await conn.fetchval(query, 'buildwise')

        if not row:
            print("Database 'buildwise' not found. Creating database...")
            # Execute database creation
            await conn.execute("CREATE DATABASE buildwise")
            print("Database 'buildwise' created successfully!")
        else:
            print("Database 'buildwise' already exists.")

        await conn.close()
    except Exception as e:
        print("\n[ERROR] Failed to connect or create database.")
        print(f"Details: {e}")
        print("\nPlease make sure:")
        print("1. PostgreSQL is running on your machine.")
        print("2. The username is 'postgres' and password is 'postgres' (configured in buildwise_api/.env).")
        print("3. Port 5432 is open and listening.")

if __name__ == "__main__":
    asyncio.run(create_database())
