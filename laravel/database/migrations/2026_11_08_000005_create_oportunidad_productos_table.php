<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oportunidad_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('oportunidad_id')->constrained('oportunidades')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos');
            $table->smallInteger('cantidad');
            // Precio del catálogo en el momento de agregar el producto.
            $table->decimal('precio_unitario', 10, 2);
            $table->timestamps();

            $table->unique(['oportunidad_id', 'producto_id']);
        });

        DB::statement('ALTER TABLE oportunidad_productos ADD CONSTRAINT chk_linea_cantidad
            CHECK (cantidad BETWEEN 1 AND 999)');
        DB::statement('ALTER TABLE oportunidad_productos ADD CONSTRAINT chk_linea_precio
            CHECK (precio_unitario > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('oportunidad_productos');
    }
};
