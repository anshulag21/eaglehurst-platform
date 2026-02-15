# Database Switching Guide

## Current Configuration: LOCAL SQLite ✅

Your backend is now using the **local SQLite database** for faster development.

## Quick Switch Commands

### Switch to LOCAL SQLite (Fast - Current)
```bash
cd backend
sed -i '' 's|DATABASE_URL="mysql.*"|DATABASE_URL="sqlite:///./eaglehurst_local.db"|' .env
pkill -f "uvicorn app.main:app"
source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
```

### Switch to REMOTE MariaDB (Slow)
```bash
cd backend
sed -i '' 's|DATABASE_URL="sqlite.*"|DATABASE_URL="mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"|' .env
pkill -f "uvicorn app.main:app"
source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
```

## Database Files

- **Local SQLite**: `eaglehurst_local.db` (389 KB)
- **Backup**: `eaglehurst.db` (417 KB)
- **Remote MariaDB**: `37.220.31.46:3306/eaglehurst_db`

## Test Accounts Available

All test accounts are available in both databases:
- ✅ admin@eaglehursttestdev.co.in (admin123)
- ✅ dr.smith@eaglehursttestdev.co.in (seller123)
- ✅ dr.jones@eaglehursttestdev.co.in (seller123)
- ✅ dr.wilson@eaglehursttestdev.co.in (seller123)
- ✅ dr.brown@eaglehursttestdev.co.in (seller123)
- ✅ james.investor@eaglehursttestdev.co.in (buyer123)
- ✅ sarah.acquisition@eaglehursttestdev.co.in (buyer123)
- ✅ michael.buyer@eaglehursttestdev.co.in (buyer123)
- ✅ emma.healthcare@eaglehursttestdev.co.in (buyer123)

## Performance Comparison

- **Local SQLite**: ⚡ Instant queries (< 10ms)
- **Remote MariaDB**: 🐌 Slow queries (200-500ms)

## Backup

Your original `.env` is backed up as `.env.backup`

