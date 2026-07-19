import asyncio
import asyncpg

passwords = [
    "Atharva@153122",
    "Atharva@15",
    "Atharva@1531",
    "Atharva15",
    "Atharva1531",
    "Atharva153122"
]

async def check_passwords():
    print("Starting password connectivity checks...")
    for p in passwords:
        try:
            conn = await asyncpg.connect(
                user='postgres',
                password=p,
                database='postgres',
                host='localhost',
                port=5432,
                timeout=3
            )
            print(f"\n[FOUND] Database password matches: {p}")
            await conn.close()
            return p
        except Exception as e:
            if "password authentication failed" in str(e):
                print(f"Checked: {p} -> Incorrect Password")
            else:
                print(f"Checked: {p} -> Connection Error: {e}")
    print("\n[FAILED] None of the provided passwords succeeded.")
    return None

if __name__ == "__main__":
    asyncio.run(check_passwords())
