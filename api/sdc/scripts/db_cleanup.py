import os
from dotenv import load_dotenv
import psycopg2


def drop_conflicting_tables() -> None:
    load_dotenv()
    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        dbname=os.getenv("POSTGRES_DB"),
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        """
        select table_name
        from information_schema.tables
        where table_schema='public'
          and (table_name like 'tenants_%' or table_name like 'workflow_%');
        """
    )
    tables = [r[0] for r in cur.fetchall()]
    for table in tables:
        cur.execute(f"DROP TABLE IF EXISTS public.{table} CASCADE;")
    cur.close()
    conn.close()
    print({"dropped": tables})


if __name__ == "__main__":
    drop_conflicting_tables()


