#!/bin/bash
# TestAgent-PI 本地启动脚本
# 依赖: Node.js 25 (via /usr/local/Cellar/node/25.8.1_1), PostgreSQL@16, Redis

set -e

NODE_BIN="/usr/local/Cellar/node/25.8.1_1/bin"
export PATH="$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin"

# ── 1. 启动 PostgreSQL & Redis ───────────────────────────────────────────
echo "[1/4] Starting PostgreSQL and Redis..."
brew services start postgresql@16 2>/dev/null || true
brew services start redis 2>/dev/null || true
sleep 2

# Wait for PostgreSQL
for i in {1..10}; do
  /usr/local/opt/postgresql@16/bin/pg_isready -h localhost -p 5432 -q && break
  sleep 1
done
echo "  PostgreSQL: OK (port 5432)"

redis-cli ping > /dev/null 2>&1 && echo "  Redis: OK (port 6379)" || echo "  Redis: WARNING - not responding"

# ── 2. Run DB migrations ─────────────────────────────────────────────────
echo "[2/4] Checking database schema..."
"$NODE_BIN/npx" prisma db push --skip-generate 2>&1 | grep -E "sync|error|Error" || true

# ── 3. Start backend ─────────────────────────────────────────────────────
echo "[3/4] Starting backend (port 8000)..."
"$NODE_BIN/npx" tsx src/server/index.ts > /tmp/testagent-server.log 2>&1 &
SERVER_PID=$!
echo "  Server PID: $SERVER_PID"

for i in {1..15}; do
  curl -s http://localhost:8000/health > /dev/null 2>&1 && break
  sleep 1
done
curl -s http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Backend:', d.get('status','?'))" 2>/dev/null || echo "  Backend: WARNING - health check failed"

# ── 4. Start frontend ────────────────────────────────────────────────────
echo "[4/4] Starting frontend (port 3000)..."
# Must cd into frontend/ so Vite finds index.html
bash -c 'cd "$(dirname "$0")/frontend" && env PATH="'"$NODE_BIN"':/usr/bin:/bin:/usr/sbin:/sbin" ./node_modules/.bin/vite > /tmp/testagent-frontend.log 2>&1' &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

sleep 4
grep -q "ready" /tmp/testagent-frontend.log && echo "  Frontend: OK" || echo "  Frontend: WARNING - check /tmp/testagent-frontend.log"

# ── Done ─────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  TestAgent-PI is running!"
echo "  Frontend: http://127.0.0.1:3000"
echo "  Backend:  http://localhost:8000"
echo "  Logs:     /tmp/testagent-server.log"
echo "            /tmp/testagent-frontend.log"
echo "=========================================="
echo ""
echo "To stop: pkill -f 'tsx src/server' && pkill -f vite"
echo ""

# Keep script alive so Ctrl+C stops everything
trap 'echo "Stopping..."; kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM
wait
