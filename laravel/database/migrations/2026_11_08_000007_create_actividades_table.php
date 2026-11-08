<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actividades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->foreignId('vendedor_id')->constrained('users'); // quién la registró
            $table->enum('tipo', ['llamada', 'reunion', 'tarea']);
            $table->string('descripcion', 500);
            $table->dateTime('vence_en')->nullable(); // UTC
            $table->boolean('completada')->default(false);
            $table->timestamps();
        });

        DB::statement('ALTER TABLE actividades ADD CONSTRAINT chk_actividades_descripcion
            CHECK (CHAR_LENGTH(TRIM(descripcion)) > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('actividades');
    }
};
