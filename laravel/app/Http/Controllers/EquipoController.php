<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Reportes;
use App\Support\MesGuatemala;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * «Mi equipo» (L5): cartera de cada asesor (n de 10) y sus ventas del mes.
 * El jefe de tienda ve solo su equipo; el administrador ve todos los equipos.
 */
class EquipoController extends Controller
{
    public function __construct(private Reportes $reportes) {}

    public function index(Request $request): View
    {
        $yo = $request->user();
        $request->validate(['mes' => ['nullable', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/']],
            ['mes.regex' => 'Elija un mes válido.']);
        $mes = MesGuatemala::desde($request->query('mes'));

        $supervisores = $yo->esSupervisor()
            ? collect([$yo])
            : User::where('rol', 'supervisor')->orderBy('name')->get();

        $equipos = $supervisores->map(function (User $s) use ($mes) {
            $vendedores = $s->equipo()->where('rol', 'vendedor')->orderBy('name')->get();
            $ids = $vendedores->pluck('id');

            return (object) [
                'supervisor' => $s,
                'vendedores' => $vendedores,
                'cartera' => $this->reportes->cartera($ids),
                'ventas' => $this->reportes->porVendedor($mes, $ids),
                'resumen' => $this->reportes->resumen($mes, $ids),
            ];
        });

        return view('equipos.index', compact('equipos', 'mes'));
    }
}
