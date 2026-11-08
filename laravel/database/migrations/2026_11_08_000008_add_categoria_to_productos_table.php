<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Capa de sector (computadoras y piezas): categoría del producto.
 * Acepta vacío para no romper el contrato; los productos de la semilla de verificación quedan en NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->enum('categoria', ['equipo', 'pieza', 'periferico', 'software', 'garantia', 'servicio'])
                ->nullable()->after('precio');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('categoria');
        });
    }
};
