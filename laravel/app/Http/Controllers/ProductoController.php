<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductoRequest;
use App\Models\Producto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

/**
 * Catálogo (L3). Solo el administrador. Los productos no se borran: se desactivan.
 * Cambiar un precio no toca ninguna oportunidad: cada línea guarda su propio precio_unitario (R6).
 */
class ProductoController extends Controller
{
    public function index(Request $request): View
    {
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'categoria' => ['nullable', Rule::in([...Producto::CATEGORIAS, 'sin'])],
            'estado' => ['nullable', Rule::in(['activos', 'inactivos'])],
        ]);

        $productos = Producto::query()
            ->when($filtros['q'] ?? null, fn ($q, $texto) => $q->where('nombre', 'like', '%'.$texto.'%'))
            ->when(($filtros['categoria'] ?? null) === 'sin', fn ($q) => $q->whereNull('categoria'))
            ->when(in_array($filtros['categoria'] ?? null, Producto::CATEGORIAS, true),
                fn ($q) => $q->where('categoria', $filtros['categoria']))
            ->when(($filtros['estado'] ?? null) === 'activos', fn ($q) => $q->where('activo', true))
            ->when(($filtros['estado'] ?? null) === 'inactivos', fn ($q) => $q->where('activo', false))
            ->orderBy('categoria')
            ->orderBy('nombre')
            ->paginate(30)
            ->withQueryString();

        return view('productos.index', compact('productos', 'filtros'));
    }

    public function create(): View
    {
        return view('productos.form', ['producto' => new Producto(['activo' => true])]);
    }

    public function store(ProductoRequest $request): RedirectResponse
    {
        $producto = Producto::create($request->validated());

        return redirect()->route('productos.index')->with('ok', "Se agregó «{$producto->nombre}» al catálogo.");
    }

    public function edit(Producto $producto): View
    {
        return view('productos.form', compact('producto'));
    }

    public function update(ProductoRequest $request, Producto $producto): RedirectResponse
    {
        $producto->update($request->validated());

        return redirect()->route('productos.index')->with('ok', "Se guardaron los cambios de «{$producto->nombre}».");
    }
}
