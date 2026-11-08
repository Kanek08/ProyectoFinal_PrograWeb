<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'rol', 'supervisor_id', 'activo'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLES = ['administrador', 'supervisor', 'vendedor'];

    public const CARTERA_MAXIMA = 10;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'activo' => 'boolean',
        ];
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    /** Vendedores del equipo de este supervisor. */
    public function equipo(): HasMany
    {
        return $this->hasMany(User::class, 'supervisor_id');
    }

    public function clientes(): HasMany
    {
        return $this->hasMany(Cliente::class, 'vendedor_id');
    }

    public function oportunidades(): HasMany
    {
        return $this->hasMany(Oportunidad::class, 'vendedor_id');
    }

    public function esAdministrador(): bool
    {
        return $this->rol === 'administrador';
    }

    public function esSupervisor(): bool
    {
        return $this->rol === 'supervisor';
    }

    public function esVendedor(): bool
    {
        return $this->rol === 'vendedor';
    }

    public function scopeVendedores(Builder $q): Builder
    {
        return $q->where('rol', 'vendedor');
    }

    /**
     * Vendedores que este usuario del panel puede ver: todos para el administrador,
     * solo los de su equipo para el supervisor.
     */
    public function scopeVendedoresVisiblesPara(Builder $q, User $u): Builder
    {
        $q->where('rol', 'vendedor');

        if ($u->esSupervisor()) {
            $q->where('supervisor_id', $u->id);
        } elseif (! $u->esAdministrador()) {
            $q->whereRaw('1 = 0');
        }

        return $q;
    }
}
