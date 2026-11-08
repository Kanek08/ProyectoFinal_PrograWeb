<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Reportes;
use App\Support\MesGuatemala;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Reporte del mes (L6, R7): ventas, total vendido y pronóstico por asesor, por equipo y por producto.
 * El jefe de tienda ve su equipo; el administrador, toda la empresa.
 */
class ReporteController extends Controller
{
    public function __construct(private Reportes $reportes) {}

    public function index(Request $request): View
    {
        $yo = $request->user();
        $mes = $this->mes($request);

        $vendedores = User::vendedoresVisiblesPara($yo)->with('supervisor:id,name')->orderBy('name')->get();
        $ids = $vendedores->pluck('id');

        $porVendedor = $this->reportes->porVendedor($mes, $ids);
        $cartera = $this->reportes->cartera($ids);

        // Un renglón por equipo (para el administrador, todos; para el jefe de tienda, el suyo).
        $equipos = $vendedores->groupBy('supervisor_id')->map(fn ($grupo) => (object) [
            'supervisor' => $grupo->first()->supervisor,
            'resumen' => $this->reportes->resumen($mes, $grupo->pluck('id')),
        ])->sortBy(fn ($e) => $e->supervisor?->name)->values();

        return view('reportes.index', [
            'mes' => $mes,
            'vendedores' => $vendedores,
            'porVendedor' => $porVendedor,
            'cartera' => $cartera,
            'equipos' => $equipos,
            'total' => $this->reportes->resumen($mes, $ids),
            'porProducto' => $this->reportes->porProducto($mes, $ids),
        ]);
    }

    private function mes(Request $request): MesGuatemala
    {
        $request->validate(['mes' => ['nullable', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/']],
            ['mes.regex' => 'Elija un mes válido.']);

        return MesGuatemala::desde($request->query('mes'));
    }
}
