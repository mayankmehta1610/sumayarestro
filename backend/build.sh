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
echo "=== Build complete ==="
