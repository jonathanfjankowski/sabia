<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Grant permissions to RLS roles (table + sequence)
        DB::statement('GRANT SELECT ON categories TO sabia_widget');
        DB::statement('GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO sabia_internal');
        DB::statement('GRANT ALL ON categories TO sabia_bypass');

        DB::statement('GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO sabia_internal');
        DB::statement('GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO sabia_bypass');

        // Enable RLS on categories
        DB::statement('ALTER TABLE categories ENABLE ROW LEVEL SECURITY');

        // Public categories for widget (read only active categories if you have a status column, otherwise all)
        DB::statement('CREATE POLICY widget_read_categories ON categories FOR SELECT TO sabia_widget USING (true)');

        // Internal users can read all categories
        DB::statement('CREATE POLICY internal_read_categories ON categories FOR SELECT TO sabia_internal USING (true)');

        // Internal users can insert/update/delete categories (gestor/operador)
        DB::statement('CREATE POLICY internal_write_categories ON categories FOR INSERT TO sabia_internal WITH CHECK (true)');
        DB::statement('CREATE POLICY internal_update_categories ON categories FOR UPDATE TO sabia_internal USING (true) WITH CHECK (true)');
        DB::statement('CREATE POLICY internal_delete_categories ON categories FOR DELETE TO sabia_internal USING (true)');

        // Admin bypass - full access
        DB::statement('CREATE POLICY admin_all_categories ON categories FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)');
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS widget_read_categories ON categories');
        DB::statement('DROP POLICY IF EXISTS internal_read_categories ON categories');
        DB::statement('DROP POLICY IF EXISTS internal_write_categories ON categories');
        DB::statement('DROP POLICY IF EXISTS internal_update_categories ON categories');
        DB::statement('DROP POLICY IF EXISTS internal_delete_categories ON categories');
        DB::statement('DROP POLICY IF EXISTS admin_all_categories ON categories');

        DB::statement('ALTER TABLE categories DISABLE ROW LEVEL SECURITY');
    }
};
