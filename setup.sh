#!/usr/bin/env bash
#
# ============================================================================
#  TestAgent-PI 一键部署脚本 (从零开始)
# ============================================================================
#
#  必备环境与工具:
#  ─────────────────────────────────────────────────────────────────────────
#  1. 操作系统:  Linux / macOS / WSL2
#  2. Node.js:   v18.0.0 或更高版本 (推荐 v22+)
#                安装方式: https://nodejs.org 或使用 nvm:
#                  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
#                  nvm install 22
#  3. pnpm:      v9.0 或更高版本 (后端包管理器)
#                安装方式: npm install -g pnpm
#  4. npm:       随 Node.js 一起安装 (前端包管理器)
#  5. PostgreSQL: v14 或更高版本
#                安装方式:
#                  Ubuntu/Debian: sudo apt install postgresql
#                  macOS:         brew install postgresql
#                  或使用 Docker: docker run -d --name pg -e POSTGRES_PASSWORD=mcp_password -p 5432:5432 postgres:16
#  6. Redis:     v6.0 或更高版本
#                安装方式:
#                  Ubuntu/Debian: sudo apt install redis-server
#                  macOS:         brew install redis
#                  或使用 Docker: docker run -d --name redis -p 6379:6379 redis:7
#  7. Git:       用于版本控制 (通常系统已自带)
#
#  LLM API Key (至少需要以下之一):
#  ─────────────────────────────────────────────────────────────────────────
#  - Anthropic API Key (推荐): https://console.anthropic.com/
#  - OpenAI 兼容 API Key
#  - 内网 LLM 服务地址
#
#  使用方法:
#  ─────────────────────────────────────────────────────────────────────────
#    chmod +x setup.sh
#    ./setup.sh
#
# ============================================================================

set -euo pipefail

# ─── 颜色定义 ───────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── 工具函数 ───────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
fatal()   { error "$*"; exit 1; }

step_counter=0
step() {
    step_counter=$((step_counter + 1))
    echo ""
    echo -e "${CYAN}━━━ 步骤 ${step_counter}: $* ━━━${NC}"
}

check_command() {
    if ! command -v "$1" &>/dev/null; then
        return 1
    fi
    return 0
}

# ─── 确定项目根目录 ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
info "项目目录: $SCRIPT_DIR"

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 1: 检查必备工具
# ═══════════════════════════════════════════════════════════════════════════
step "检查必备工具"

# --- Node.js ---
if ! check_command node; then
    fatal "未找到 Node.js！
    请安装 Node.js v18+:
      方式1: 访问 https://nodejs.org 下载安装
      方式2: 使用 nvm:
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
        source ~/.bashrc
        nvm install 22"
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    fatal "Node.js 版本过低！当前: $(node -v)，需要 v18.0.0 或更高。
    请升级: nvm install 22 && nvm use 22"
fi
success "Node.js $(node -v)"

# --- pnpm ---
if ! check_command pnpm; then
    warn "未找到 pnpm，正在自动安装..."
    npm install -g pnpm || fatal "pnpm 安装失败！请手动执行: npm install -g pnpm"
fi
success "pnpm $(pnpm -v)"

# --- npm ---
if ! check_command npm; then
    fatal "未找到 npm！npm 通常随 Node.js 一起安装，请重新安装 Node.js。"
fi
success "npm $(npm -v)"

# --- Git ---
if ! check_command git; then
    fatal "未找到 Git！
    请安装:
      Ubuntu/Debian: sudo apt install git
      macOS:         brew install git"
fi
success "Git $(git --version | awk '{print $3}')"

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 2: 检查外部服务 (PostgreSQL & Redis)
# ═══════════════════════════════════════════════════════════════════════════
step "检查外部服务"

# --- 从 .env 或 .env.example 读取连接信息 ---
if [ -f .env ]; then
    ENV_FILE=".env"
elif [ -f .env.example ]; then
    ENV_FILE=".env.example"
else
    ENV_FILE=""
fi

# 提取数据库连接信息（默认值）
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="mcp_user"
DB_PASSWORD="mcp_password"
DB_NAME="testagent"
REDIS_HOST="localhost"
REDIS_PORT="6379"

if [ -n "$ENV_FILE" ]; then
    # 尝试从 DATABASE_URL 解析
    DB_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
    if [ -n "$DB_URL" ]; then
        # postgresql://user:password@host:port/dbname
        DB_USER=$(echo "$DB_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p' || true)
        DB_PASSWORD=$(echo "$DB_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' || true)
        DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p' || true)
        DB_PORT=$(echo "$DB_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p' || true)
        DB_NAME=$(echo "$DB_URL" | sed -n 's|.*@[^/]*/\([^?]*\).*|\1|p' || true)
    fi

    REDIS_URL=$(grep -E "^REDIS_URL=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
    if [ -n "$REDIS_URL" ]; then
        REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p' || true)
        REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's|.*://[^:]*:\([0-9]*\).*|\1|p' || true)
    fi
fi

# 设置安全默认值
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-mcp_user}"
DB_PASSWORD="${DB_PASSWORD:-mcp_password}"
DB_NAME="${DB_NAME:-testagent}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# --- 检查 PostgreSQL 连接 ---
PG_OK=false
if check_command psql; then
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
        PG_OK=true
        success "PostgreSQL 连接正常 ($DB_HOST:$DB_PORT/$DB_NAME)"
    elif PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1" &>/dev/null; then
        # 连接可用但数据库不存在，尝试创建
        warn "数据库 '$DB_NAME' 不存在，正在创建..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" \
            -c "CREATE DATABASE $DB_NAME;" &>/dev/null && {
            PG_OK=true
            success "数据库 '$DB_NAME' 创建成功"
        } || warn "数据库创建失败，请手动创建"
    fi
fi

if [ "$PG_OK" = false ]; then
    # 检查端口是否有服务
    if ss -tlnp 2>/dev/null | grep -q ":${DB_PORT}" || netstat -tlnp 2>/dev/null | grep -q ":${DB_PORT}"; then
        warn "端口 $DB_PORT 上有服务但无法连接 PostgreSQL。"
    else
        warn "PostgreSQL 端口 $DB_PORT 未监听。"
    fi
    warn "PostgreSQL 不可用！请确保 PostgreSQL 正在运行，并且以下配置正确:"
    warn "  主机: $DB_HOST  端口: $DB_PORT  用户: $DB_USER  数据库: $DB_NAME"
    warn ""
    warn "快速启动 PostgreSQL 的方法:"
    warn "  方式1 (Docker):"
    warn "    docker run -d --name testagent-pg \\"
    warn "      -e POSTGRES_USER=$DB_USER \\"
    warn "      -e POSTGRES_PASSWORD=$DB_PASSWORD \\"
    warn "      -e POSTGRES_DB=$DB_NAME \\"
    warn "      -p $DB_PORT:5432 postgres:16"
    warn ""
    warn "  方式2 (系统安装后):"
    warn "    sudo -u postgres psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\""
    warn "    sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""
    echo ""
    read -rp "$(echo -e "${YELLOW}是否继续部署? (PostgreSQL 之后再配置) [y/N]: ${NC}")" pg_continue
    if [[ ! "$pg_continue" =~ ^[Yy]$ ]]; then
        fatal "部署中止。请先启动 PostgreSQL 后重新运行此脚本。"
    fi
fi

# --- 检查 Redis 连接 ---
REDIS_OK=false
if check_command redis-cli; then
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &>/dev/null; then
        REDIS_OK=true
        success "Redis 连接正常 ($REDIS_HOST:$REDIS_PORT)"
    fi
fi

if [ "$REDIS_OK" = false ]; then
    if ss -tlnp 2>/dev/null | grep -q ":${REDIS_PORT}" || netstat -tlnp 2>/dev/null | grep -q ":${REDIS_PORT}"; then
        warn "端口 $REDIS_PORT 上有服务但无法通过 redis-cli 验证。"
    else
        warn "Redis 端口 $REDIS_PORT 未监听。"
    fi
    warn "Redis 不可用！请确保 Redis 正在运行。"
    warn ""
    warn "快速启动 Redis 的方法:"
    warn "  方式1 (Docker):"
    warn "    docker run -d --name testagent-redis -p $REDIS_PORT:6379 redis:7"
    warn ""
    warn "  方式2 (系统服务):"
    warn "    sudo systemctl start redis-server"
    echo ""
    read -rp "$(echo -e "${YELLOW}是否继续部署? (Redis 之后再配置) [y/N]: ${NC}")" redis_continue
    if [[ ! "$redis_continue" =~ ^[Yy]$ ]]; then
        fatal "部署中止。请先启动 Redis 后重新运行此脚本。"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 3: 配置环境变量
# ═══════════════════════════════════════════════════════════════════════════
step "配置环境变量"

if [ -f .env ]; then
    success ".env 文件已存在"

    # 检查关键配置
    MISSING_KEYS=()
    for key in DATABASE_URL REDIS_URL JWT_SECRET LLM_API_KEY; do
        val=$(grep -E "^${key}=" .env 2>/dev/null | head -1 | cut -d= -f2- || true)
        if [ -z "$val" ] || [ "$val" = "<your-api-key>" ] || [ "$val" = "<min-16-characters-secret>" ]; then
            MISSING_KEYS+=("$key")
        fi
    done

    if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
        warn "以下关键配置可能未设置:"
        for k in "${MISSING_KEYS[@]}"; do
            warn "  - $k"
        done
        warn "请编辑 .env 文件补充这些配置。"
    fi
else
    if [ ! -f .env.example ]; then
        fatal "未找到 .env.example 模板文件！项目文件可能不完整。"
    fi

    info "从 .env.example 创建 .env 文件..."
    cp .env.example .env

    # 自动生成 JWT_SECRET
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    success "JWT_SECRET 已自动生成"

    echo ""
    warn "═══════════════════════════════════════════════════════════"
    warn "  .env 文件已创建，但你需要手动配置以下内容:"
    warn "═══════════════════════════════════════════════════════════"
    warn ""
    warn "  必须配置:"
    warn "    LLM_API_KEY    - 你的 LLM API 密钥"
    warn ""
    warn "  可选配置:"
    warn "    LLM_PROVIDER   - 模型提供商 (anthropic/openai/intranet)"
    warn "    LLM_MODEL_NAME - 模型名称"
    warn "    LLM_BASE_URL   - 自定义 API 地址"
    warn "    DATABASE_URL   - 数据库连接地址 (如非默认)"
    warn "    REDIS_URL      - Redis 连接地址 (如非默认)"
    warn ""
    warn "  编辑命令: nano .env  或  vim .env"
    warn "═══════════════════════════════════════════════════════════"
    echo ""
    read -rp "$(echo -e "${YELLOW}配置好 .env 后按 Enter 继续 (或输入 s 跳过): ${NC}")" env_response
fi

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 4: 安装后端依赖
# ═══════════════════════════════════════════════════════════════════════════
step "安装后端依赖"

info "使用 pnpm 安装依赖..."
if ! pnpm install; then
    fatal "后端依赖安装失败！
    可能的原因:
      1. 网络问题 - 检查网络连接或配置 npm 镜像:
         pnpm config set registry https://registry.npmmirror.com
      2. 权限问题 - 不要使用 root/sudo 运行 pnpm install
      3. Node.js 版本不兼容 - 确保 Node.js >= v18"
fi
success "后端依赖安装完成"

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 5: 初始化数据库
# ═══════════════════════════════════════════════════════════════════════════
step "初始化数据库"

# 先生成 Prisma Client
info "生成 Prisma Client..."
if ! pnpm prisma:generate; then
    fatal "Prisma Client 生成失败！
    请检查 prisma/schema.prisma 文件是否存在且语法正确。"
fi
success "Prisma Client 生成完成"

# 执行数据库迁移
if [ "$PG_OK" = true ]; then
    info "执行数据库迁移..."
    if ! pnpm prisma:migrate; then
        warn "数据库迁移失败！"
        warn "可能的原因:"
        warn "  1. DATABASE_URL 配置不正确"
        warn "  2. 数据库用户权限不足"
        warn "  3. 数据库不存在"
        warn ""
        warn "你可以稍后手动执行: pnpm prisma:migrate"
    else
        success "数据库迁移完成"
    fi
else
    warn "跳过数据库迁移 (PostgreSQL 不可用)"
    warn "PostgreSQL 就绪后请手动执行: pnpm prisma:migrate"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 6: 创建存储目录
# ═══════════════════════════════════════════════════════════════════════════
step "创建存储目录"

DIRS=(
    "storage/cache"
    "storage/chat"
    "storage/tasks"
    "storage/templates"
    "storage/vectordb"
    ".testagent/workspace/outputs"
)

for dir in "${DIRS[@]}"; do
    mkdir -p "$dir"
done
success "存储目录已就绪"

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 7: 安装前端依赖并构建
# ═══════════════════════════════════════════════════════════════════════════
step "安装前端依赖"

if [ ! -d "frontend" ]; then
    warn "未找到 frontend 目录，跳过前端安装"
else
    cd frontend

    info "使用 npm 安装前端依赖..."
    if ! npm install; then
        warn "前端依赖安装失败！"
        warn "你可以稍后手动安装:"
        warn "  cd frontend && npm install"
    else
        success "前端依赖安装完成"
    fi

    cd "$SCRIPT_DIR"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  步骤 8: 编译 TypeScript
# ═══════════════════════════════════════════════════════════════════════════
step "编译 TypeScript"

info "编译后端 TypeScript 代码..."
if ! pnpm build; then
    warn "TypeScript 编译失败！"
    warn "但你仍可以使用开发模式运行 (pnpm dev 会使用 tsx 直接运行)"
else
    success "TypeScript 编译完成"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  完成！打印启动说明
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           TestAgent-PI 部署完成！                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}启动方式:${NC}"
echo ""
echo -e "  ${YELLOW}开发模式 (推荐调试时使用):${NC}"
echo -e "    后端:  ${GREEN}pnpm dev${NC}              # 启动在 http://localhost:8000"
echo -e "    前端:  ${GREEN}cd frontend && npm run dev${NC}  # 启动在 http://localhost:3000"
echo ""
echo -e "  ${YELLOW}健康检查:${NC}"
echo -e "    ${GREEN}curl http://localhost:8000/health${NC}"
echo ""

# 显示待办事项
TODOS=()
if [ "$PG_OK" = false ]; then
    TODOS+=("启动 PostgreSQL 并执行: pnpm prisma:migrate")
fi
if [ "$REDIS_OK" = false ]; then
    TODOS+=("启动 Redis 服务")
fi
if [ -f .env ]; then
    val=$(grep -E "^LLM_API_KEY=" .env 2>/dev/null | head -1 | cut -d= -f2- || true)
    if [ -z "$val" ] || [ "$val" = "<your-api-key>" ]; then
        TODOS+=("在 .env 中配置 LLM_API_KEY")
    fi
fi

if [ ${#TODOS[@]} -gt 0 ]; then
    echo -e "${YELLOW}待完成事项:${NC}"
    for i in "${!TODOS[@]}"; do
        echo -e "  $((i+1)). ${TODOS[$i]}"
    done
    echo ""
fi

echo -e "${BLUE}如有问题，请检查以上日志输出中的警告信息。${NC}"
echo ""
