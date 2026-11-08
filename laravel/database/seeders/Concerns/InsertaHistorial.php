<?php

namespace Database\Seeders\Concerns;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

trait InsertaHistorial
{
    /**
     * Inserta una oportunidad con sus líneas y su historial.
     * El historial tiene un registro por cada etapa recorrida, tres días entre registros,
     * terminando en $fin (la fecha de cierre, o la fecha de referencia si sigue abierta).
     *
     * @param  array<int, string>  $recorrido  p. ej. ['prospecto','calificado','propuesta','negociacion','ganada']
     * @param  array<int, array{0:int,1:int,2:string}>  $lineas  [producto_id, cantidad, precio_unitario]
     */
    protected function insertarOportunidad(
        int $clienteId,
        int $vendedorId,
        string $titulo,
        array $recorrido,
        CarbonImmutable $fin,
        array $lineas,
        ?string $motivoPerdida = null,
    ): int {
        $etapa = end($recorrido);
        $cerrada = in_array($etapa, ['ganada', 'perdida'], true);
        $n = count($recorrido);
        $inicio = $fin->subDays(3 * ($n - 1));

        $id = DB::table('oportunidades')->insertGetId([
            'cliente_id' => $clienteId,
            'vendedor_id' => $vendedorId,
            'titulo' => $titulo,
            'etapa' => $etapa,
            'motivo_perdida' => $etapa === 'perdida' ? $motivoPerdida : null,
            'fecha_cierre' => $cerrada ? $fin : null,
            'created_at' => $inicio,
            'updated_at' => $fin,
        ]);

        foreach ($lineas as [$productoId, $cantidad, $precio]) {
            DB::table('oportunidad_productos')->insert([
                'oportunidad_id' => $id,
                'producto_id' => $productoId,
                'cantidad' => $cantidad,
                'precio_unitario' => $precio,
                'created_at' => $inicio,
                'updated_at' => $inicio,
            ]);
        }

        foreach ($recorrido as $i => $etapaNueva) {
            DB::table('historial_etapas')->insert([
                'oportunidad_id' => $id,
                'usuario_id' => $vendedorId,
                'etapa_anterior' => $i === 0 ? null : $recorrido[$i - 1],
                'etapa_nueva' => $etapaNueva,
                'created_at' => $fin->subDays(3 * ($n - 1 - $i)),
            ]);
        }

        return $id;
    }

    /** Recorrido desde prospecto hasta $etapa por las abiertas; para cerradas, $desde es la última abierta. */
    protected function recorrido(string $etapa, string $desde = 'negociacion'): array
    {
        $abiertas = ['prospecto', 'calificado', 'propuesta', 'negociacion'];

        if (in_array($etapa, $abiertas, true)) {
            return array_slice($abiertas, 0, array_search($etapa, $abiertas, true) + 1);
        }

        return [...array_slice($abiertas, 0, array_search($desde, $abiertas, true) + 1), $etapa];
    }

    protected function utc(string $fecha): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d H:i', $fecha, 'UTC');
    }
}
