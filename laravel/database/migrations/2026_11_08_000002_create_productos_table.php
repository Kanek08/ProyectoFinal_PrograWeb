<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120)->unique();
            $table->decimal('precio', 10, 2); // quetzales; nunca FLOAT
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        DB::statement('ALTER TABLE productos ADD CONSTRAINT chk_productos_precio CHECK (precio > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
