<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oportunidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes');
            $table->foreignId('vendedor_id')->constrained('users'); // dueño de la oportunidad
            $table->string('titulo', 150);
            $table->enum('etapa', ['prospecto', 'calificado', 'propuesta', 'negociacion', 'ganada', 'perdida'])
                ->default('prospecto');
            $table->string('motivo_perdida', 255)->nullable();
            $table->dateTime('fecha_cierre')->nullable(); // UTC
            $table->timestamps();

            $table->index(['vendedor_id', 'etapa']);
            $table->index(['etapa', 'fecha_cierre']);
        });

        // La etapa, el motivo de pérdida y la fecha de cierre van juntos.
        DB::statement("ALTER TABLE oportunidades ADD CONSTRAINT chk_op_motivo
            CHECK ((etapa = 'perdida') = (motivo_perdida IS NOT NULL))");
        DB::statement('ALTER TABLE oportunidades ADD CONSTRAINT chk_op_motivo_no_vacio
            CHECK (motivo_perdida IS NULL OR CHAR_LENGTH(TRIM(motivo_perdida)) > 0)');
        DB::statement("ALTER TABLE oportunidades ADD CONSTRAINT chk_op_cierre
            CHECK ((etapa IN ('ganada', 'perdida')) = (fecha_cierre IS NOT NULL))");
        DB::statement('ALTER TABLE oportunidades ADD CONSTRAINT chk_op_titulo
            CHECK (CHAR_LENGTH(TRIM(titulo)) > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('oportunidades');
    }
};
