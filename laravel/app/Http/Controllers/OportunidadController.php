<?php

namespace App\Http\Controllers;

use App\Models\Oportunidad;
use App\Models\User;
use App\Support\Embudo;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

/**
 * Cotizaciones en el panel (L6): SOLO LECTURA. Las crea y trabaja el asesor desde la SPA.
 * El administrador ve todas; el jefe de tienda, las de su equipo (las demás responden 404).
 */
class OportunidadController extends Controller
{
    public function index(Request $request): View
    {
        $yo = $request->user();
        $filtros = $request->validate([
            'etapa' => ['nullable', Rule::in([...Embudo::ETAPAS, 'abiertas', 'cerradas'])],
            'vendedor' => ['nullable', 'integer'],
        ]);

        $etapa = $filtros['etapa'] ?? null;

        $oportunidades = Oportunidad::visiblePara($yo)
            ->select('oportunidades.*')
            ->conTotal()
            ->with(['cliente:id,nombre', 'vendedor:id,name'])
            ->when(in_array($etapa, Embudo::ETAPAS, true), fn ($q) => $q->where('etapa', $etapa))
            ->when($etapa === 'abiertas', fn ($q) => $q->whereIn('etapa', Embudo::ABIERTAS))
            ->when($etapa === 'cerradas', fn ($q) => $q->whereIn('etapa', Embudo::CERRADAS))
            ->when($filtros['vendedor'] ?? null, fn ($q, $id) => $q->where('vendedor_id', $id))
            ->orderByRaw("FIELD(etapa, 'negociacion', 'propuesta', 'calificado', 'prospecto', 'ganada', 'perdida')")
            ->orderByDesc('fecha_cierre')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        return view('oportunidades.index', [
            'oportunidades' => $oportunidades,
            'filtros' => $filtros,
            'vendedores' => User::vendedoresVisiblesPara($yo)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Request $request, int $oportunidad): View
    {
        $op = Oportunidad::visiblePara($request->user())
            ->select('oportunidades.*')
            ->conTotal()
            ->with(['cliente:id,nombre', 'vendedor:id,name', 'lineas.producto:id,nombre,precio,categoria', 'historial.usuario:id,name'])
            ->findOrFail($oportunidad);

        return view('oportunidades.show', ['op' => $op]);
    }
}
