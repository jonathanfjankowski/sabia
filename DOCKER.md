# Docker

## Dev (hot-reload)

```bash
docker compose -f docker-compose.dev.yml up
```

- **Frontend:** http://localhost:5173 (Vite)
- **API:** http://localhost:8000 (php artisan serve)
- **Postgres:** `localhost:5432` (user/pass: `postgres`/`postgres`)

Edits nos arquivos de `sabia-api/` e `sabia-frontend/` são refletidos ao vivo. `vendor/` e `node_modules/` ficam em volumes nomeados pra não pagar o custo de bind-mount no Windows.

Primeira vez? Depois do `up`:

```bash
docker compose -f docker-compose.dev.yml exec api php artisan key:generate
docker compose -f docker-compose.dev.yml exec api php artisan migrate
```

Para parar e manter dados: `docker compose -f docker-compose.dev.yml down`. Para zerar o banco: adicionar `-v`.

## Produção

```bash
# 1. Definir senha do banco
echo "DB_PASSWORD=suasenha" > .env

# 2. Editar docker-compose.prod.yml (APP_URL, SANCTUM_STATEFUL_DOMAINS,
#    SESSION_DOMAIN, ALLOWED_ORIGINS, VITE_API_URL) com seu domínio real

# 3. Subir
docker compose -f docker-compose.prod.yml up -d --build

# 4. Migrar
docker compose -f docker-compose.prod.yml exec api php artisan migrate
```

- **Frontend:** `:80` / `:443` (nginx servindo o build do Vite)
- **API:** `:8000`
- **Postgres:** `:5432`

> **ponytail:** compose de prod expõe 80/443 mas o nginx não tem TLS configurado.
> Upgrade quando for deploy real: usar proxy reverso (Caddy/Traefik) ou adicionar
> certificados e bloco `ssl_*` no `nginx.conf`.

## O que cada peça faz

- **`postgres` (pgvector)** — banco com extensão de embeddings vetoriais.
- **`api` (Laravel)** — backend PHP. Em dev roda `artisan serve`; em prod o mesmo comando dentro do container.
- **`web` (nginx/Vite)** — frontend. Em dev é o servidor de dev do Vite (HMR); em prod é o nginx servindo o `vite build` estático com SPA fallback (`try_files ... /index.html`).
