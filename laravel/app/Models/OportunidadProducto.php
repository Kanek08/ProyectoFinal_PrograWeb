<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OportunidadProducto extends Model
{
    protected $table = 'oportunidad_productos';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'precio_unitario' => 'decimal:2',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function getSubtotalAttribute(): string
    {
        return bcmul((string) $this->cantidad, (string) $this->precio_unitario, 2);
    }
}
