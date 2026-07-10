#!/usr/bin/env bash
set -euo pipefail
echo "=== Sumaya API build ==="
echo "PWD=$(pwd)"
echo "Python: $(python --version 2>&1 || true)"
echo "Pip: $(pip --version 2>&1 || true)"
ls -la
if [ ! -f requirements.txt ]; then
  echo "ERROR: requirements.txt missing in $(pwd)"
  exit 1
fi
pip install --upgrade pip setuptools wheel
pip install --no-cache-dir -r requirements.txt
python -c "from app.main import app; print('Import OK:', app.title)"
echo "=== Seed if database empty ==="
python -c "
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, ensure_schema
from app.models import Tenant
from seed import seed

async def main():
    await ensure_schema()
    async with AsyncSessionLocal() as db:
        if (await db.execute(select(Tenant).limit(1))).scalar_one_or_none():
            print('Database already seeded — skipping')
            return
    await seed(force=False)
    print('Database seeded successfully')

asyncio.run(main())
" || echo "WARN: seed step failed (will retry on startup)"
echo "=== Build complete ==="
