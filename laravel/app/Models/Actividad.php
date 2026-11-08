<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Actividad extends Model
{
    protected $table = 'actividades';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'vence_en' => 'datetime',
            'completada' => 'boolean',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /** Vencida: no completada y su fecha de vencimiento ya pasó (R8). */
    public function getVencidaAttribute(): bool
    {
        return ! $this->completada && $this->vence_en !== null && $this->vence_en->isPast();
    }
}
