<?php

namespace App\Services;

use App\Support\Embudo;
use App\Support\MesGuatemala;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Reportes del mes (R7, L6) calculados en la base con el constructor de consultas.
 *
 * - Venta = oportunidad ganada; su mes es el de fecha_cierre en hora de Guatemala.
 *   Se filtra con el rango UTC del mes ([AAAA-MM-01 06:00, mes siguiente 06:00)).
 * - Total vendido = suma de cantidad × precio_unitario GUARDADO en cada línea (no el precio del catálogo).
 * - Pronóstico = suma de total × probabilidad de las abiertas, sin filtro de mes, redondeada al final.
 *
 * Las expresiones SQL crudas son fijas; los datos (ids, fechas) siempre van como parámetros (S3).
 */
class Reportes
{
    /** Totales por oportunidad: SUM(cantidad × precio_unitario). */
    private function totales(): Builder
    {
        return DB::table('oportunidad_productos')
            ->selectRaw('oportunidad_id, SUM(cantidad * precio_unitario) AS total')
            ->groupBy('oportunidad_id');
    }

    private function ventas(MesGuatemala $mes, Collection $vendedores): Builder
    {
        return DB::table('oportunidades as o')
            ->leftJoinSub($this->totales(), 't', 't.oportunidad_id', '=', 'o.id')
            ->where('o.etapa', 'ganada')
            ->where('o.fecha_cierre', '>=', $mes->inicioUtc->format('Y-m-d H:i:s'))
            ->where('o.fecha_cierre', '<', $mes->finUtc->format('Y-m-d H:i:s'))
            ->whereIn('o.vendedor_id', $vendedores);
    }

    private function abiertas(Collection $vendedores): Builder
    {
        return DB::table('oportunidades as o')
            ->leftJoinSub($this->totales(), 't', 't.oportunidad_id', '=', 'o.id')
            ->whereIn('o.etapa', Embudo::ABIERTAS)
            ->whereIn('o.vendedor_id', $vendedores);
    }

    private function sqlPronostico(): string
    {
        return 'ROUND(COALESCE(SUM(COALESCE(t.total, 0) * '.Embudo::sqlProbabilidad('o.etapa').'), 0), 2)';
    }

    /**
     * Por vendedor: ventas, total vendido y pronóstico.
     *
     * @param  Collection<int, int>  $vendedores  ids
     * @return Collection<int, object{ventas:int,total:string,pronostico:string}> indexada por vendedor_id
     */
    public function porVendedor(MesGuatemala $mes, Collection $vendedores): Collection
    {
        $ventas = $this->ventas($mes, $vendedores)
            ->groupBy('o.vendedor_id')
            ->selectRaw('o.vendedor_id, COUNT(*) AS ventas, COALESCE(SUM(t.total), 0) AS total')
            ->get()->keyBy('vendedor_id');

        $pronostico = $this->abiertas($vendedores)
            ->groupBy('o.vendedor_id')
            ->selectRaw('o.vendedor_id, '.$this->sqlPronostico().' AS pronostico')
            ->get()->keyBy('vendedor_id');

        return $vendedores->mapWithKeys(fn ($id) => [$id => (object) [
            'ventas' => (int) ($ventas[$id]->ventas ?? 0),
            'total' => (string) ($ventas[$id]->total ?? '0.00'),
            'pronostico' => (string) ($pronostico[$id]->pronostico ?? '0.00'),
        ]]);
    }

    /**
     * Total de un grupo de vendedores (un equipo o toda la empresa), calculado de una sola vez en SQL:
     * el pronóstico se redondea al final, no sumando redondeos.
     */
    public function resumen(MesGuatemala $mes, Collection $vendedores): object
    {
        $v = $this->ventas($mes, $vendedores)
            ->selectRaw('COUNT(*) AS ventas, COALESCE(SUM(t.total), 0) AS total')
            ->first();

        $p = $this->abiertas($vendedores)
            ->selectRaw($this->sqlPronostico().' AS pronostico')
            ->first();

        return (object) [
            'ventas' => (int) $v->ventas,
            'total' => (string) $v->total,
            'pronostico' => (string) $p->pronostico,
        ];
    }

    /**
     * Por producto: unidades vendidas y total vendido en el mes, y pronóstico de las abiertas.
     *
     * @return Collection<int, object{producto_id:int,nombre:string,unidades:int,total:string,pronostico:string}>
     */
    public function porProducto(MesGuatemala $mes, Collection $vendedores): Collection
    {
        $vendidos = DB::table('oportunidad_productos as l')
            ->join('oportunidades as o', 'o.id', '=', 'l.oportunidad_id')
            ->where('o.etapa', 'ganada')
            ->where('o.fecha_cierre', '>=', $mes->inicioUtc->format('Y-m-d H:i:s'))
            ->where('o.fecha_cierre', '<', $mes->finUtc->format('Y-m-d H:i:s'))
            ->whereIn('o.vendedor_id', $vendedores)
            ->groupBy('l.producto_id')
            ->selectRaw('l.producto_id, SUM(l.cantidad) AS unidades, SUM(l.cantidad * l.precio_unitario) AS total')
            ->get()->keyBy('producto_id');

        $pronostico = DB::table('oportunidad_productos as l')
            ->join('oportunidades as o', 'o.id', '=', 'l.oportunidad_id')
            ->whereIn('o.etapa', Embudo::ABIERTAS)
            ->whereIn('o.vendedor_id', $vendedores)
            ->groupBy('l.producto_id')
            ->selectRaw('l.producto_id, ROUND(SUM(l.cantidad * l.precio_unitario * '
                .Embudo::sqlProbabilidad('o.etapa').'), 2) AS pronostico')
            ->get()->keyBy('producto_id');

        $ids = $vendidos->keys()->merge($pronostico->keys())->unique();

        return DB::table('productos')->whereIn('id', $ids)->orderBy('nombre')->get(['id', 'nombre'])
            ->map(fn ($p) => (object) [
                'producto_id' => $p->id,
                'nombre' => $p->nombre,
                'unidades' => (int) ($vendidos[$p->id]->unidades ?? 0),
                'total' => (string) ($vendidos[$p->id]->total ?? '0.00'),
                'pronostico' => (string) ($pronostico[$p->id]->pronostico ?? '0.00'),
            ])
            ->sortByDesc(fn ($p) => (float) $p->total)
            ->values();
    }

    /** Clientes en cartera por vendedor. */
    public function cartera(Collection $vendedores): Collection
    {
        $conteo = DB::table('clientes')
            ->whereIn('vendedor_id', $vendedores)
            ->groupBy('vendedor_id')
            ->selectRaw('vendedor_id, COUNT(*) AS n')
            ->pluck('n', 'vendedor_id');

        return $vendedores->mapWithKeys(fn ($id) => [$id => (int) ($conteo[$id] ?? 0)]);
    }
}
