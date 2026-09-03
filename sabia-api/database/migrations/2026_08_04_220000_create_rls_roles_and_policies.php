<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Create database roles
        DB::statement('DO $$ BEGIN CREATE ROLE sabia_internal; EXCEPTION WHEN duplicate_object THEN NULL; END $$;');
        DB::statement('DO $$ BEGIN CREATE ROLE sabia_widget; EXCEPTION WHEN duplicate_object THEN NULL; END $$;');
        DB::statement('DO $$ BEGIN CREATE ROLE sabia_bypass; EXCEPTION WHEN duplicate_object THEN NULL; END $$;');

        // ─── articles ──────────────────────────────────────────────
        DB::statement('ALTER TABLE articles ENABLE ROW LEVEL SECURITY');
        DB::statement("CREATE POLICY internal_read_articles ON articles FOR SELECT TO sabia_internal USING (status = 'active')");
        DB::statement('CREATE POLICY admin_all_articles ON articles FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)');
        DB::statement("CREATE POLICY widget_read_articles ON articles FOR SELECT TO sabia_widget USING (access_level = 'public' AND status = 'active')");
        // Managers/admin operations bypass RLS via sabia_bypass role + SET LOCAL ROLE.

        // ─── article_chunks ───────────────────────────────────────
        DB::statement('ALTER TABLE article_chunks ENABLE ROW LEVEL SECURITY');
        DB::statement("CREATE POLICY internal_read_chunks ON article_chunks FOR SELECT TO sabia_internal USING (EXISTS (SELECT 1 FROM articles a WHERE a.id = article_id AND a.status = 'active'))");
        DB::statement("CREATE POLICY widget_read_chunks ON article_chunks FOR SELECT TO sabia_widget USING (EXISTS (SELECT 1 FROM articles a WHERE a.id = article_id AND a.access_level = 'public' AND a.status = 'active'))");
        DB::statement('CREATE POLICY admin_all_chunks ON article_chunks FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)');

        // ─── conversations ────────────────────────────────────────
        DB::statement('ALTER TABLE conversations ENABLE ROW LEVEL SECURITY');
        DB::statement("CREATE POLICY own_conversations ON conversations FOR ALL TO sabia_internal USING (user_id = current_setting('app.current_user_id', true)::uuid)");
        DB::statement("CREATE POLICY widget_session_conversations ON conversations FOR ALL TO sabia_widget USING (session_id = current_setting('app.current_session_id', true))");
        DB::statement('CREATE POLICY admin_all_conversations ON conversations FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)');

        // ─── messages ─────────────────────────────────────────────
        DB::statement('ALTER TABLE messages ENABLE ROW LEVEL SECURITY');
        DB::statement("CREATE POLICY internal_messages ON messages FOR ALL TO sabia_internal USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = current_setting('app.current_user_id', true)::uuid))");
        DB::statement("CREATE POLICY widget_messages ON messages FOR ALL TO sabia_widget USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.session_id = current_setting('app.current_session_id', true)))");
        DB::statement('CREATE POLICY admin_all_messages ON messages FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)');

        // ─── knowledge_gaps ───────────────────────────────────────
        DB::statement('ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY');
        DB::statement("CREATE POLICY widget_own_gaps ON knowledge_gaps FOR SELECT TO sabia_widget USING (session_id = current_setting('app.current_session_id', true))");
        DB::statement('CREATE POLICY admin_all_gaps ON knowledge_gaps FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)');
        // Internal users (gestor) read all gaps via sabia_bypass during admin operations.

        // ─── profiles ─────────────────────────────────────────────
        // Garante privilégios básicos nos roles RLS antes de habilitar RLS
        DB::statement('GRANT SELECT ON profiles TO sabia_internal');
        DB::statement('GRANT ALL ON profiles TO sabia_bypass');

        DB::statement('ALTER TABLE profiles ENABLE ROW LEVEL SECURITY');
        DB::statement("CREATE POLICY internal_own_profile ON profiles FOR SELECT TO sabia_internal USING (user_id = current_setting('app.current_user_id', true)::uuid OR id = current_setting('app.current_user_id', true)::uuid)");
        DB::statement('CREATE POLICY admin_all_profiles ON profiles FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)');
    }

    public function down(): void
    {
        foreach (['articles', 'article_chunks', 'conversations', 'messages', 'knowledge_gaps', 'profiles'] as $t) {
            DB::statement("ALTER TABLE {$t} DISABLE ROW LEVEL SECURITY");
            DB::statement("DROP POLICY IF EXISTS admin_all_{$t} ON {$t}");
        }
        DB::statement('DROP POLICY IF EXISTS internal_read_articles ON articles');
        DB::statement('DROP POLICY IF EXISTS widget_read_articles ON articles');
        DB::statement('DROP POLICY IF EXISTS internal_read_chunks ON article_chunks');
        DB::statement('DROP POLICY IF EXISTS widget_read_chunks ON article_chunks');
        DB::statement('DROP POLICY IF EXISTS own_conversations ON conversations');
        DB::statement('DROP POLICY IF EXISTS widget_session_conversations ON conversations');
        DB::statement('DROP POLICY IF EXISTS internal_messages ON messages');
        DB::statement('DROP POLICY IF EXISTS widget_messages ON messages');
        DB::statement('DROP POLICY IF EXISTS widget_own_gaps ON knowledge_gaps');
        DB::statement('DROP POLICY IF EXISTS internal_own_profile ON profiles');

        DB::statement('DROP ROLE IF EXISTS sabia_internal');
        DB::statement('DROP ROLE IF EXISTS sabia_widget');
        DB::statement('DROP ROLE IF EXISTS sabia_bypass');
    }
};
