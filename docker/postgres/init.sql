-- Script de inicialização do PostgreSQL para o Sabiá v3.0
-- Criação de roles, RLS policies e extensão pgvector

-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== ROLES PARA RLS ====================
-- Role para usuários autenticados (nível internal - gestores e operadores)
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
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sabia_widget') THEN
        CREATE ROLE sabia_widget NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION LOGIN PASSWORD 'widget_pass';
    END IF;
END
$$;

-- Conceder permissões básicas
GRANT CONNECT ON DATABASE sabia_db TO sabia_internal;
GRANT CONNECT ON DATABASE sabia_db TO sabia_widget;
GRANT USAGE ON SCHEMA public TO sabia_internal;
GRANT USAGE ON SCHEMA public TO sabia_widget;

-- ==================== RLS POLICIES ====================
-- As policies abaixo são aplicadas APÓS as migrations criarem as tabelas.
-- Execute este bloco separadamente após rodar as migrations.

/*
-- ─── articles ───
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Usuários internos: veem artigos publicados (public + internal)
CREATE POLICY internal_read ON public.articles
  FOR SELECT TO sabia_internal
  USING (is_published = true OR is_published IS NULL);

-- Widget público: apenas artigos públicos E publicados
CREATE POLICY widget_read ON public.articles
  FOR SELECT TO sabia_widget
  USING (access_level = 'public' AND (is_published = true OR is_published IS NULL));

-- ─── article_chunks ───
ALTER TABLE public.article_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY internal_chunks ON public.article_chunks
  FOR SELECT TO sabia_internal
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id AND (a.is_published = true OR a.is_published IS NULL)
    )
  );

CREATE POLICY widget_chunks ON public.article_chunks
  FOR SELECT TO sabia_widget
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id
        AND a.access_level = 'public'
        AND (a.is_published = true OR a.is_published IS NULL)
    )
  );

-- ─── conversations ───
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Usuário interno: vê apenas suas próprias conversas
CREATE POLICY own_conversations ON public.conversations
  FOR ALL TO sabia_internal
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Widget: vê apenas sua própria sessão
CREATE POLICY widget_session ON public.conversations
  FOR ALL TO sabia_widget
  USING (session_id = current_setting('app.current_session_id'));

-- ─── messages ───
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY internal_messages ON public.messages
  FOR SELECT TO sabia_internal
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.user_id = current_setting('app.current_user_id')::uuid
    )
  );

CREATE POLICY widget_messages ON public.messages
  FOR SELECT TO sabia_widget
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.session_id = current_setting('app.current_session_id')
    )
  );
*/

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Configuração inicial do PostgreSQL concluída com sucesso!';
    RAISE NOTICE 'Roles criadas: sabia_internal, sabia_widget';
    RAISE NOTICE 'Extensão pgvector habilitada.';
    RAISE NOTICE 'RLS policies disponíveis (comentadas no script).';
END
$$;
