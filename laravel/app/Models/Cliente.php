<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['nombre', 'nit', 'telefono', 'correo'])]
class Cliente extends Model
{
    protected $table = 'clientes';

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    public function oportunidades(): HasMany
    {
        return $this->hasMany(Oportunidad::class);
    }

    public function actividades(): HasMany
    {
        return $this->hasMany(Actividad::class);
    }

    /** El NIT como se muestra: compacto, o CF si es consumidor final (NULL en la base). */
    public function getNitVisibleAttribute(): string
    {
        return $this->nit ?? 'CF';
    }

    /**
     * Clientes que un usuario del panel puede ver (R2, L5).
     * Administrador: todos. Supervisor: los de su equipo y los disponibles.
     * Se aplica ANTES de buscar el registro, para que lo ajeno responda 404.
     */
    public function scopeVisiblePara(Builder $q, User $u): Builder
    {
        if ($u->esAdministrador()) {
            return $q;
        }

        if ($u->esSupervisor()) {
            return $q->where(fn (Builder $w) => $w
                ->whereNull('clientes.vendedor_id')
                ->orWhereIn('clientes.vendedor_id', User::query()
                    ->select('id')
                    ->where('rol', 'vendedor')
                    ->where('supervisor_id', $u->id)));
        }

        return $q->whereRaw('1 = 0');
    }
}
