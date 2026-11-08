<?php

namespace App\Models;

use App\Support\Embudo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * En el panel las oportunidades son de solo lectura (L6): las trabaja el vendedor desde la SPA.
 */
class Oportunidad extends Model
{
    protected $table = 'oportunidades';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'fecha_cierre' => 'datetime',
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

    public function lineas(): HasMany
    {
        return $this->hasMany(OportunidadProducto::class);
    }

    public function historial(): HasMany
    {
        return $this->hasMany(HistorialEtapa::class)->orderBy('created_at')->orderBy('id');
    }

    public function getProbabilidadAttribute(): int
    {
        return Embudo::PROBABILIDAD[$this->etapa];
    }

    public function getAbiertaAttribute(): bool
    {
        return in_array($this->etapa, Embudo::ABIERTAS, true);
    }

    /** Agrega la columna calculada `total` = SUM(cantidad × precio_unitario) en la base. */
    public function scopeConTotal(Builder $q): Builder
    {
        return $q->addSelect([
            'total' => OportunidadProducto::query()
                ->selectRaw('COALESCE(SUM(cantidad * precio_unitario), 0)')
                ->whereColumn('oportunidad_productos.oportunidad_id', 'oportunidades.id'),
        ]);
    }

    /** Oportunidades visibles: todas para el administrador; las de su equipo para el supervisor. */
    public function scopeVisiblePara(Builder $q, User $u): Builder
    {
        if ($u->esAdministrador()) {
            return $q;
        }

        if ($u->esSupervisor()) {
            return $q->whereIn('oportunidades.vendedor_id', User::query()
                ->select('id')
                ->where('rol', 'vendedor')
                ->where('supervisor_id', $u->id));
        }

        return $q->whereRaw('1 = 0');
    }
}
