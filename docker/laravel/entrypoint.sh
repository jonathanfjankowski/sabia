#!/bin/bash
set -e

# ============================================================
# Entrypoint - Sabiá API
# ============================================================

echo "============================================"
echo "  Sabiá API - Inicializando..."
echo "============================================"

cd /var/www/html

# ─── Modo Setup: gera APP_KEY e instala dependências ────
# Uso: docker compose run --rm laravel bash /entrypoint.sh --setup
if [ "${1:-}" = "--setup" ]; then
    echo "[Setup] Gerando APP_KEY..."
    php artisan key:generate
    echo ""
    echo "============================================"
    echo "  ✅ APP_KEY gerada!"
    echo "  Copie o valor acima para seu .env:"
    echo "  APP_KEY=<valor-gerado>"
    echo "============================================"
    exit 0
fi

# ─── Modo normal: startup do servidor ──────────────────

# 1. Aguardar PostgreSQL
if [ -n "$DB_HOST" ]; then
    echo "[1/4] Aguardando PostgreSQL em $DB_HOST:${DB_PORT:-5432}..."
    for i in $(seq 1 30); do
        if pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-sabia_user}" -d "${DB_DATABASE:-sabia_db}" >/dev/null 2>&1; then
            echo "  -> PostgreSQL disponível!"
            break
        fi
        echo "  -> Tentativa $i/30. Aguardando 2s..."
        sleep 2
    done
fi

# 2. Instalar dependências Composer (se vendor não existir)
if [ ! -d "vendor" ]; then
    echo "[2/4] Instalando dependências Composer..."
    composer install --no-interaction --no-dev --optimize-autoloader 2>/dev/null || \
        composer install --no-interaction --optimize-autoloader 2>/dev/null || true
    echo "  -> Dependências instaladas!"
else
    echo "[2/4] Dependências Composer OK."
fi

# 3. Migrations (somente se APP_KEY estiver configurada)
if [ -n "$APP_KEY" ]; then
    echo "[3/4] Executando migrations..."
    php artisan migrate --force 2>/dev/null && echo "  -> Migrations OK!" || echo "  -> Nenhuma migration pendente."
else
    echo "[3/4] ⚠️  APP_KEY não configurada. Migrations ignoradas."
    echo "  -> Execute: docker compose run --rm laravel bash /entrypoint.sh --setup"
fi

# 4. Cache e links
echo "[4/4] Otimizando..."
php artisan storage:link --force 2>/dev/null || true
php artisan config:cache 2>/dev/null || true
php artisan route:cache 2>/dev/null || true
php artisan view:cache 2>/dev/null || true
echo "  -> Pronto!"

# Verificar APP_KEY
if [ -z "$APP_KEY" ]; then
    echo ""
    echo "⚠️  ATENÇÃO: APP_KEY não foi configurada!"
    echo "   Execute em outro terminal:"
    echo "   docker compose run --rm laravel bash /entrypoint.sh --setup"
    echo "   E adicione APP_KEY ao seu arquivo .env"
    echo ""
fi

echo "============================================"
echo "  Sabiá API - Pronta! 🚀"
echo "============================================"

# Iniciar Supervisord (Nginx + PHP-FPM)
exec /usr/bin/supervisord -c /etc/supervisord.conf -n
