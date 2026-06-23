-- Script de inicialização do PostgreSQL para o Sabiá v3.0
-- Criação de roles e configuração inicial para Row Level Security (RLS)

-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar roles para controle de acesso
-- Role para usuários autenticados (nível internal)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sabia_internal') THEN
        CREATE ROLE sabia_internal NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION LOGIN PASSWORD 'internal_pass';
    END IF;
END
$$;

-- Role para usuários públicos (widget externo)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sabia_public') THEN
        CREATE ROLE sabia_public NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION LOGIN PASSWORD 'public_pass';
    END IF;
END
$$;

-- Conceder permissões básicas
GRANT CONNECT ON DATABASE sabia_db TO sabia_internal;
GRANT CONNECT ON DATABASE sabia_db TO sabia_public;
GRANT USAGE ON SCHEMA public TO sabia_internal;
GRANT USAGE ON SCHEMA public TO sabia_public;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Configuração inicial do PostgreSQL concluída com sucesso!';
    RAISE NOTICE 'Roles criadas: sabia_internal, sabia_public';
    RAISE NOTICE 'Extensão pgvector habilitada.';
END
$$;
