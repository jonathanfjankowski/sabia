#!/bin/sh
# Entry point do container api em produção.
# Re-cacheia config com as envs de runtime (EMBEDDING_URL, DB_*, etc.)
# que chegam via docker-compose — o `config:cache` do build não as vê.
set -e

# Garante que o .env existe (caso o build não tenha gerado)
if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || true
    php artisan key:generate --force
fi

# Aplica migrations em produção
php artisan migrate --force --no-interaction

# Cacheia config com envs de runtime corretas
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
