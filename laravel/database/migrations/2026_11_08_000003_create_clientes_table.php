<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            // Vacío = cliente disponible.
            $table->foreignId('vendedor_id')->nullable()->constrained('users');
            $table->string('nombre', 150);
            // NIT compacto (4521817K) o NULL para consumidor final (CF).
            $table->string('nit', 12)->nullable()->unique();
            $table->char('telefono', 8)->unique();
            $table->string('correo', 150)->nullable();
            $table->timestamps();
        });

        // El dígito verificador (módulo 11) lo validan el panel y la API; la base asegura el formato compacto.
        DB::statement("ALTER TABLE clientes ADD CONSTRAINT chk_clientes_nit
            CHECK (nit IS NULL OR REGEXP_LIKE(nit, '^[1-9][0-9]{0,10}[0-9K]$', 'c'))");
        DB::statement("ALTER TABLE clientes ADD CONSTRAINT chk_clientes_telefono
            CHECK (REGEXP_LIKE(telefono, '^[2-9][0-9]{7}$', 'c'))");
        DB::statement('ALTER TABLE clientes ADD CONSTRAINT chk_clientes_nombre
            CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
