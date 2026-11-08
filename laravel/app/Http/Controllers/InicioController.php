<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Oportunidad;
use App\Models\User;
use App\Services\Reportes;
use App\Support\Embudo;
use App\Support\MesGuatemala;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** Página de inicio del panel: resumen del mes actual de Guatemala según el rol. */
class InicioController extends Controller
{
    public function __invoke(Request $request, Reportes $reportes): View
    {
        $yo = $request->user();
        $mes = MesGuatemala::desde(null);
        $ids = User::vendedoresVisiblesPara($yo)->pluck('id');

        return view('dashboard', [
            'mes' => $mes,
            'resumen' => $reportes->resumen($mes, $ids),
            'clientes' => Cliente::visiblePara($yo)->count(),
            'disponibles' => Cliente::whereNull('vendedor_id')->count(),
            'abiertas' => Oportunidad::visiblePara($yo)->whereIn('etapa', Embudo::ABIERTAS)->count(),
            'asesores' => User::vendedoresVisiblesPara($yo)->where('activo', true)->count(),
        ]);
    }
}
