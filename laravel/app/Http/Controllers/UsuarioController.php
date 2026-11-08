<?php

namespace App\Http\Controllers;

use App\Http\Requests\UsuarioRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

/**
 * Cuentas (L2). Solo el administrador. No existe la acción de borrar: las cuentas se desactivan.
 */
class UsuarioController extends Controller
{
    public function index(Request $request): View
    {
        $filtros = $request->validate([
            'rol' => ['nullable', Rule::in(User::ROLES)],
            'estado' => ['nullable', Rule::in(['activas', 'inactivas'])],
        ]);

        $usuarios = User::query()
            ->with('supervisor:id,name')
            ->withCount('clientes')
            ->when($filtros['rol'] ?? null, fn ($q, $rol) => $q->where('rol', $rol))
            ->when(($filtros['estado'] ?? null) === 'activas', fn ($q) => $q->where('activo', true))
            ->when(($filtros['estado'] ?? null) === 'inactivas', fn ($q) => $q->where('activo', false))
            ->orderByRaw("FIELD(rol, 'administrador', 'supervisor', 'vendedor')")
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return view('usuarios.index', compact('usuarios', 'filtros'));
    }

    public function create(): View
    {
        return view('usuarios.form', [
            'usuario' => new User(['rol' => 'vendedor', 'activo' => true]),
            'supervisores' => $this->supervisoresActivos(),
        ]);
    }

    public function store(UsuarioRequest $request): RedirectResponse
    {
        $datos = $request->validated();

        // El cast 'hashed' del modelo guarda la contraseña con Hash::make (S1: solo Laravel genera hashes).
        $usuario = User::create($datos);

        return redirect()->route('usuarios.index')
            ->with('ok', "Se creó la cuenta de {$usuario->name}.");
    }

    public function edit(User $usuario): View
    {
        return view('usuarios.form', [
            'usuario' => $usuario,
            'supervisores' => $this->supervisoresActivos($usuario),
        ]);
    }

    public function update(UsuarioRequest $request, User $usuario): RedirectResponse
    {
        $datos = $request->validated();

        if (blank($datos['password'] ?? null)) {
            unset($datos['password']); // vacía = no cambia
        }

        $usuario->update($datos);

        return redirect()->route('usuarios.index')
            ->with('ok', "Se guardaron los cambios de {$usuario->name}.");
    }

    private function supervisoresActivos(?User $excepto = null)
    {
        return User::where('rol', 'supervisor')
            ->where('activo', true)
            ->when($excepto?->exists, fn ($q) => $q->whereKeyNot($excepto->id))
            ->orderBy('name')
            ->get(['id', 'name']);
    }
}
