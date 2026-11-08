<?php

use App\Http\Controllers\ClienteController;
use App\Http\Controllers\EquipoController;
use App\Http\Controllers\InicioController;
use App\Http\Controllers\OportunidadController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/inicio');

// Todo el panel exige sesión. CuentaPersonalActiva (grupo web) expulsa a vendedores y cuentas desactivadas.
Route::middleware('auth')->group(function () {
    Route::get('/inicio', InicioController::class)->name('dashboard');

    Route::get('/perfil', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/perfil', [ProfileController::class, 'update'])->name('profile.update');

    // Solo el administrador: cuentas y catálogo (sin rutas de borrado).
    Route::middleware('rol:administrador')->group(function () {
        Route::resource('usuarios', UsuarioController::class)->except(['show', 'destroy'])
            ->parameters(['usuarios' => 'usuario']);
        Route::resource('productos', ProductoController::class)->except(['show', 'destroy']);
        Route::delete('/clientes/{cliente}', [ClienteController::class, 'destroy'])
            ->whereNumber('cliente')->name('clientes.destroy');
    });

    // Administrador y jefe de tienda.
    Route::middleware('rol:administrador,supervisor')->group(function () {
        Route::get('/clientes', [ClienteController::class, 'index'])->name('clientes.index');
        Route::get('/clientes/nuevo', [ClienteController::class, 'create'])->name('clientes.create');
        Route::post('/clientes', [ClienteController::class, 'store'])->name('clientes.store');
        Route::get('/clientes/{cliente}', [ClienteController::class, 'show'])->whereNumber('cliente')->name('clientes.show');
        Route::get('/clientes/{cliente}/editar', [ClienteController::class, 'edit'])->whereNumber('cliente')->name('clientes.edit');
        Route::put('/clientes/{cliente}', [ClienteController::class, 'update'])->whereNumber('cliente')->name('clientes.update');
        Route::patch('/clientes/{cliente}/vendedor', [ClienteController::class, 'asignar'])->whereNumber('cliente')->name('clientes.asignar');

        Route::get('/equipos', [EquipoController::class, 'index'])->name('equipos.index');

        Route::get('/cotizaciones', [OportunidadController::class, 'index'])->name('oportunidades.index');
        Route::get('/cotizaciones/{oportunidad}', [OportunidadController::class, 'show'])->whereNumber('oportunidad')->name('oportunidades.show');

        Route::get('/reportes', [ReporteController::class, 'index'])->name('reportes.index');
    });
});

require __DIR__.'/auth.php';
