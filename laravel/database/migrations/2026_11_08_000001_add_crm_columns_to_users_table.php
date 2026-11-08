<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Extiende la tabla users de Laravel con las columnas del CRM (sección 6 del enunciado).
 * No se edita la migración original de users: el cambio llega en esta migración nueva.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('rol', ['administrador', 'supervisor', 'vendedor'])->default('vendedor')->after('password');
            $table->foreignId('supervisor_id')->nullable()->after('rol')->constrained('users');
            $table->boolean('activo')->default(true)->after('supervisor_id');
        });

        // Un vendedor siempre tiene supervisor; los demás roles nunca.
        DB::statement("ALTER TABLE users ADD CONSTRAINT chk_users_supervisor
            CHECK ((rol = 'vendedor') = (supervisor_id IS NOT NULL))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users DROP CHECK chk_users_supervisor');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supervisor_id');
            $table->dropColumn(['rol', 'activo']);
        });
    }
};
