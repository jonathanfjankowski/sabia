<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE personal_access_tokens DROP COLUMN IF EXISTS tokenable_id');
        DB::statement('ALTER TABLE personal_access_tokens DROP COLUMN IF EXISTS tokenable_type');
        DB::statement('ALTER TABLE personal_access_tokens ADD COLUMN tokenable_id uuid');
        DB::statement('ALTER TABLE personal_access_tokens ADD COLUMN tokenable_type varchar(255)');
        DB::statement('CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON personal_access_tokens (tokenable_type, tokenable_id)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS personal_access_tokens_tokenable_type_tokenable_id_index');
        DB::statement('ALTER TABLE personal_access_tokens DROP COLUMN IF EXISTS tokenable_type');
        DB::statement('ALTER TABLE personal_access_tokens DROP COLUMN IF EXISTS tokenable_id');
    }
};
