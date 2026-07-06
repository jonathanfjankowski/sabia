# ============================================================
# Dockerfile - Sabiá API (Laravel 12 + PHP 8.3 + Nginx)
# ============================================================
# Build context: raiz do projeto (.)
# docker build -f sabia-api/Dockerfile .
# docker-compose usa: context: ., dockerfile: sabia-api/Dockerfile

# ---- Estágio 1: Node para build de assets ----
FROM node:20-alpine AS node-deps

WORKDIR /tmp/assets
COPY sabia-api/package*.json ./
RUN test -f package.json && npm ci --no-audit --no-fund || echo "Aviso: npm ci falhou ou package.json ausente."

# ---- Estágio 2: Final ----
FROM php:8.3-fpm-alpine

WORKDIR /var/www/html

# Instalar Nginx, Supervisor, PostgreSQL client e extensões PHP
RUN apk add --no-cache \
        nginx \
        supervisor \
        postgresql-client \
        postgresql-dev \
        oniguruma-dev \
        libxml2-dev \
        libzip-dev \
        zip \
        unzip \
        git \
        curl \
        bash \
    && docker-php-ext-install \
        pdo_pgsql \
        pgsql \
        mbstring \
        intl \
        bcmath \
        zip \
        pcntl \
    && docker-php-ext-enable pdo_pgsql pgsql mbstring intl bcmath zip pcntl

# Composer
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# Copiar código da aplicação (contexto raiz: .)
COPY sabia-api .

# Copiar node_modules (se existirem)
COPY --from=node-deps /tmp/assets/node_modules ./node_modules 2>/dev/null || true

# Copiar configurações Docker (contexto raiz: .)
COPY docker/laravel/php.ini /usr/local/etc/php/conf.d/sabia.ini
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/laravel/supervisord.conf /etc/supervisord.conf
COPY docker/laravel/entrypoint.sh /entrypoint.sh

# Permissões
RUN chown -R www-data:www-data \
        /var/www/html/storage \
        /var/www/html/bootstrap/cache \
        /var/www/html/public \
    && chmod -R 775 \
        /var/www/html/storage \
        /var/www/html/bootstrap/cache \
        /var/www/html/public \
    && chmod +x /entrypoint.sh \
    && mkdir -p /var/log/supervisor /var/run

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
