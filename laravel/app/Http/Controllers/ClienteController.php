<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClienteRequest;
use App\Models\Cliente;
use App\Models\Oportunidad;
use App\Models\User;
use App\Services\AsignacionClientes;
use App\Support\Identidad;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

/**
 * Clientes y asignación (L4) con visibilidad por equipo (L5).
 * Nunca se usa el route model binding directo: todo cliente se busca con visiblePara(),
 * así un cliente de otro equipo responde 404 aunque se escriba su dirección a mano (S5).
 */
class ClienteController extends Controller
{
    public function __construct(private AsignacionClientes $asignacion) {}

    public function index(Request $request): View
    {
        $yo = $request->user();
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'vendedor' => ['nullable', 'string', 'max:20'], // id de asesor o «sin»
        ]);

        $q = trim($filtros['q'] ?? '');
        $nitBuscado = Identidad::compactarNit($q);

        $clientes = Cliente::visiblePara($yo)
            ->with('vendedor:id,name,activo')
            ->when($q !== '', fn ($c) => $c->where(fn ($w) => $w
                ->where('nombre', 'like', '%'.$q.'%')
                ->when($nitBuscado !== '', fn ($w2) => $w2->orWhere('nit', 'like', '%'.$nitBuscado.'%'))))
            ->when(($filtros['vendedor'] ?? null) === 'sin', fn ($c) => $c->whereNull('vendedor_id'))
            ->when(ctype_digit($filtros['vendedor'] ?? ''), fn ($c) => $c->where('vendedor_id', (int) $filtros['vendedor']))
            ->orderBy('nombre')
            ->paginate(25)
            ->withQueryString();

        return view('clientes.index', [
            'clientes' => $clientes,
            'filtros' => $filtros,
            'vendedores' => User::vendedoresVisiblesPara($yo)->orderBy('name')->get(['id', 'name', 'activo']),
        ]);
    }

    public function create(Request $request): View
    {
        return view('clientes.form', [
            'cliente' => new Cliente,
            'vendedores' => $this->vendedoresAsignables($request->user()),
        ]);
    }

    public function store(ClienteRequest $request): RedirectResponse
    {
        $yo = $request->user();

        $cliente = $this->guardandoSinDuplicados(function () use ($request, $yo) {
            return DB::transaction(function () use ($request, $yo) {
                $cliente = Cliente::create($request->normalizados());

                if ($request->filled('vendedor_id')) {
                    $this->asignacion->asignar($cliente->id, (int) $request->input('vendedor_id'), $yo);
                }

                return $cliente;
            });
        });

        return redirect()->route('clientes.show', $cliente->id)->with('ok', "Se registró el cliente {$cliente->nombre}.");
    }

    public function show(Request $request, int $cliente): View
    {
        $yo = $request->user();
        $cliente = Cliente::visiblePara($yo)->with('vendedor:id,name,activo,supervisor_id')->findOrFail($cliente);

        $oportunidades = Oportunidad::visiblePara($yo)
            ->where('cliente_id', $cliente->id)
            ->select('oportunidades.*')
            ->conTotal()
            ->with('vendedor:id,name')
            ->orderByDesc('created_at')
            ->get();

        return view('clientes.show', [
            'cliente' => $cliente,
            'oportunidades' => $oportunidades,
            'actividades' => $cliente->actividades()->with('vendedor:id,name')->orderByDesc('vence_en')->get(),
            'vendedores' => $this->vendedoresAsignables($yo),
            'tieneAbiertas' => $oportunidades->contains(fn ($o) => $o->abierta),
        ]);
    }

    public function edit(Request $request, int $cliente): View
    {
        return view('clientes.form', [
            'cliente' => Cliente::visiblePara($request->user())->findOrFail($cliente),
            'vendedores' => collect(),
        ]);
    }

    public function update(ClienteRequest $request, int $cliente): RedirectResponse
    {
        $modelo = Cliente::visiblePara($request->user())->findOrFail($cliente);

        $this->guardandoSinDuplicados(fn () => $modelo->update($request->normalizados()));

        return redirect()->route('clientes.show', $modelo->id)->with('ok', 'Se guardaron los cambios del cliente.');
    }

    /** Asignar, reasignar (vendedor_id) o liberar (vendedor_id vacío). */
    public function asignar(Request $request, int $cliente): RedirectResponse
    {
        $datos = $request->validate(['vendedor_id' => ['nullable', 'integer']]);
        $vendedorId = isset($datos['vendedor_id']) ? (int) $datos['vendedor_id'] : null;

        $modelo = $this->asignacion->asignar($cliente, $vendedorId, $request->user());

        return redirect()->route('clientes.show', $modelo->id)->with('ok', $vendedorId
            ? 'El cliente quedó asignado.'
            : 'El cliente quedó disponible.');
    }

    /** Solo el administrador, y solo si el cliente no tiene oportunidades (L4). */
    public function destroy(Request $request, int $cliente): RedirectResponse
    {
        $modelo = Cliente::visiblePara($request->user())->findOrFail($cliente);

        if (Oportunidad::where('cliente_id', $modelo->id)->exists()) {
            return back()->with('error', 'No se puede eliminar un cliente que tiene cotizaciones.');
        }

        try {
            $modelo->delete(); // sus actividades se borran en cascada (FK)
        } catch (QueryException $e) {
            // Una oportunidad creada en la API justo ahora: la FK lo impide.
            return back()->with('error', 'No se puede eliminar un cliente que tiene cotizaciones.');
        }

        return redirect()->route('clientes.index')->with('ok', "Se eliminó el cliente {$modelo->nombre}.");
    }

    private function vendedoresAsignables(User $yo)
    {
        return User::vendedoresVisiblesPara($yo)
            ->where('activo', true)
            ->withCount('clientes')
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    /**
     * S8: la validación previa no alcanza ante dos guardados simultáneos;
     * el índice único de la base es el árbitro final y su error se muestra junto al campo.
     */
    private function guardandoSinDuplicados(callable $guardar): mixed
    {
        try {
            return $guardar();
        } catch (QueryException $e) {
            if (($e->errorInfo[1] ?? null) !== 1062) {
                throw $e;
            }

            $campo = str_contains($e->getMessage(), 'clientes_nit_unique') ? 'nit' : 'telefono';

            throw ValidationException::withMessages([
                $campo => $campo === 'nit' ? 'Ya existe un cliente con ese NIT.' : 'Ya existe un cliente con ese teléfono.',
            ]);
        }
    }
}
