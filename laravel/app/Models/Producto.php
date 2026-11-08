<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['nombre', 'precio', 'categoria', 'activo'])]
class Producto extends Model
{
    protected $table = 'productos';

    /** Capa de sector: categorías de CompuPartes Xela. */
    public const CATEGORIAS = ['equipo', 'pieza', 'periferico', 'software', 'garantia', 'servicio'];

    protected function casts(): array
    {
        return [
            'precio' => 'decimal:2',
            'activo' => 'boolean',
        ];
    }
}
