# Configuração do PostgreSQL com Supabase

## Passos para configurar o banco de dados no Supabase

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project" ou "New Project"
3. Preencha as informações:
   - **Name**: Nome do seu projeto (ex: sabia-ai)
   - **Database Password**: Escolha uma senha forte (guarde em local seguro!)
   - **Region**: Selecione a região mais próxima dos seus usuários
4. Aguarde a criação do projeto (pode levar alguns minutos)

### 2. Obter Credenciais de Conexão

Após criar o projeto:

1. Vá em **Project Settings** (ícone de engrenagem na barra lateral)
2. Clique em **Database**
3. Em **Connection info**, você encontrará:
   - **Host**: `db.<project-ref>.supabase.co`
   - **Port**: `5432` (Direct connection) ou `6543` (Connection pooler)
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: A senha que você definiu na criação

### 3. Configurar o Arquivo `.env`

No diretório `/workspace/sabia-api`, edite o arquivo `.env`:

```bash
# Substitua os valores abaixo pelos dados do seu projeto Supabase
DB_CONNECTION=pgsql
DB_HOST=db.seu-project-ref.supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USER=postgres
DB_PASSWORD=sua-senha-forte-aqui
```

**Importante:**
- Para **desenvolvimento**, use a porta `5432` (Direct connection)
- Para **produção**, considere usar a porta `6543` (Connection pooler) para melhor performance

### 4. Habilitar pgvector (Opcional - para busca vetorial)

Para usar busca por similaridade com embeddings:

1. No dashboard do Supabase, vá em **Database** > **Extensions**
2. Busque por `vector` e clique em **Enable**
3. Isso habilitará o tipo `vector` para armazenar embeddings

### 5. Executar Migrations

Com o `.env` configurado, execute:

```bash
cd /workspace/sabia-api

# Limpar cache de configuração
php artisan config:clear

# Executar migrations
php artisan migrate
```

### 6. Verificar Conexão

Para testar se a conexão está funcionando:

```bash
php artisan tinker
>>> DB::connection()->getPdo();
>>> DB::table('migrations')->get();
```

## Notas Importantes

### Diferenças entre MySQL e PostgreSQL

As migrations foram atualizadas para serem compatíveis com PostgreSQL:

- `json` → `jsonb` (melhor performance no Postgres)
- `unsignedBigInteger` → `bigInteger` (Postgres não tem unsigned)
- `unsignedTinyInteger` → `tinyInteger()->unsigned()`
- `unsignedInteger` → `integer()->unsigned()`

### Connection Pooling (Produção)

Para produção, é recomendado usar o **Transaction Pooler** do Supabase:

```env
DB_HOST=db.seu-project-ref.supabase.co
DB_PORT=6543
DB_DATABASE=postgres
DB_USER=postgres.seu-project-ref
DB_PASSWORD=sua-senha-forte-aqui
```

Isso melhora a performance ao gerenciar conexões de forma mais eficiente.

### SSL/TLS

O Supabase requer conexão SSL. O Laravel já configura isso automaticamente quando usa PostgreSQL, mas se precisar forçar:

```env
DB_SSLMODE=require
```

### Backup e Restore

O Supabase oferece backups automáticos. Para restaurar ou fazer backup manual:

1. Vá em **Project Settings** > **Database**
2. Use as ferramentas de backup/restore disponíveis

## Troubleshooting

### Erro: "could not find driver"

Certifique-se de que a extensão `pdo_pgsql` está habilitada no PHP:

```bash
php -m | grep pgsql
```

Se não aparecer, instale/extenda a extensão conforme seu ambiente.

### Erro de Conexão SSL

Verifique se o `DB_SSLMODE` está configurado corretamente:

```env
DB_SSLMODE=require
```

### Erro: "relation already exists"

Se as tabelas já existirem, limpe o banco:

```bash
php artisan migrate:fresh
```

**Cuidado:** Isso apagará todos os dados!
