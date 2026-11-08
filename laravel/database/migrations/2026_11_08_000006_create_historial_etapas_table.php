<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $etapas = ['prospecto', 'calificado', 'propuesta', 'negociacion', 'ganada', 'perdida'];

        Schema::create('historial_etapas', function (Blueprint $table) use ($etapas) {
            $table->id();
            $table->foreignId('oportunidad_id')->constrained('oportunidades')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users'); // quién hizo el cambio
            $table->enum('etapa_anterior', $etapas)->nullable(); // NULL en el registro de creación
            $table->enum('etapa_nueva', $etapas);
            $table->dateTime('created_at'); // sin updated_at: el historial no se edita
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_etapas');
    }
};
