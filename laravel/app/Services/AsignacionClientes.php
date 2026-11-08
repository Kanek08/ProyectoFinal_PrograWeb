<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Oportunidad;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Asignar, reasignar y liberar clientes desde el panel (L4, L5, R3) con las decisiones D2 y D3.
 *
 * Concurrencia: todo ocurre en una transacción. Primero se bloquea la fila del asesor destino
 * (SELECT ... FOR UPDATE), igual que hace la API, y después la del cliente. Así dos operaciones
 * simultáneas sobre la cartera del mismo asesor se ordenan y la cartera máxima se respeta.
 */
class AsignacionClientes
{
    /**
     * @param  int|null  $vendedorId  NULL = liberar el cliente (queda disponible)
     */
    public function asignar(int $clienteId, ?int $vendedorId, User $actor): Cliente
    {
        return DB::transaction(function () use ($clienteId, $vendedorId, $actor) {
            // Lo ajeno responde 404 (R2, L5): el cliente se busca dentro de lo visible para el actor.
            Cliente::visiblePara($actor)->findOrFail($clienteId);

            if ($vendedorId === null) {
                return $this->liberar($clienteId, $actor);
            }

            // 1) Bloquear al asesor destino: debe ser vendedor activo y visible para el actor.
            $vendedor = User::vendedoresVisiblesPara($actor)
                ->where('activo', true)
                ->whereKey($vendedorId)
                ->lockForUpdate()
                ->first();

            if (! $vendedor) {
                throw ValidationException::withMessages([
                    'vendedor_id' => $actor->esSupervisor()
                        ? 'Elija un asesor activo de su equipo.'
                        : 'Elija un asesor de ventas activo.',
                ]);
            }

            // 2) Bloquear al cliente y volver a comprobar que sigue visible.
            $cliente = Cliente::visiblePara($actor)->whereKey($clienteId)->lockForUpdate()->firstOrFail();

            if ($cliente->vendedor_id === $vendedor->id) {
                return $cliente;
            }

            // 3) Cartera máxima (R3), contada con la fila del asesor bloqueada.
            $enCartera = Cliente::where('vendedor_id', $vendedor->id)->count();
            if ($enCartera >= User::CARTERA_MAXIMA) {
                throw ValidationException::withMessages([
                    'vendedor_id' => 'La cartera de ese asesor ya tiene '.User::CARTERA_MAXIMA.' clientes, el máximo permitido.',
                ]);
            }

            $cliente->vendedor_id = $vendedor->id;
            $cliente->save();

            // D2: las oportunidades abiertas siguen al cliente; las cerradas conservan su asesor.
            Oportunidad::where('cliente_id', $cliente->id)
                ->whereIn('etapa', ['prospecto', 'calificado', 'propuesta', 'negociacion'])
                ->update(['vendedor_id' => $vendedor->id, 'updated_at' => now()]);

            return $cliente;
        });
    }

    private function liberar(int $clienteId, User $actor): Cliente
    {
        $cliente = Cliente::visiblePara($actor)->whereKey($clienteId)->lockForUpdate()->firstOrFail();

        if ($cliente->vendedor_id === null) {
            return $cliente;
        }

        // D3: no se libera un cliente con oportunidades abiertas.
        $abiertas = Oportunidad::where('cliente_id', $cliente->id)
            ->whereIn('etapa', ['prospecto', 'calificado', 'propuesta', 'negociacion'])
            ->exists();

        if ($abiertas) {
            throw ValidationException::withMessages([
                'vendedor_id' => 'El cliente tiene cotizaciones abiertas: ciérrelas o reasígnelo a otro asesor.',
            ]);
        }

        $cliente->vendedor_id = null;
        $cliente->save();

        return $cliente;
    }
}
