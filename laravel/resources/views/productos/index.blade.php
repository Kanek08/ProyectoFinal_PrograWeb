@php use App\Support\Formato; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ __('crm.productos') }}</x-slot>
    <x-slot name="header">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('crm.productos') }}</h2>
            <a href="{{ route('productos.create') }}" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Nuevo producto</a>
        </div>
    </x-slot>

    <x-tarjeta>
        <form method="GET" class="flex flex-wrap items-end gap-3 mb-4">
            <div>
                <label for="q" class="block text-sm font-medium text-gray-700">Buscar</label>
                <input id="q" name="q" value="{{ $filtros['q'] ?? '' }}" maxlength="120" placeholder="Nombre del producto"
                       class="mt-1 rounded-md border-gray-300 shadow-sm">
            </div>
            <div>
                <label for="categoria" class="block text-sm font-medium text-gray-700">Categoría</label>
                <select id="categoria" name="categoria" class="mt-1 rounded-md border-gray-300 shadow-sm">
                    <option value="">Todas</option>
                    @foreach (\App\Models\Producto::CATEGORIAS as $cat)
                        <option value="{{ $cat }}" @selected(($filtros['categoria'] ?? '') === $cat)>{{ __('crm.categorias.'.$cat) }}</option>
                    @endforeach
                    <option value="sin" @selected(($filtros['categoria'] ?? '') === 'sin')>Sin categoría</option>
                </select>
            </div>
            <div>
                <label for="estado" class="block text-sm font-medium text-gray-700">Estado</label>
                <select id="estado" name="estado" class="mt-1 rounded-md border-gray-300 shadow-sm">
                    <option value="">Todos</option>
                    <option value="activos" @selected(($filtros['estado'] ?? '') === 'activos')>Activos</option>
                    <option value="inactivos" @selected(($filtros['estado'] ?? '') === 'inactivos')>Desactivados</option>
                </select>
            </div>
            <button class="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
        </form>

        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Producto</th>
                        <th class="py-2 pe-4">Categoría</th>
                        <th class="py-2 pe-4 text-right">Precio</th>
                        <th class="py-2 pe-4">Estado</th>
                        <th class="py-2"></th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($productos as $p)
                        <tr class="{{ $p->activo ? '' : 'text-gray-400' }}">
                            <td class="py-2 pe-4 font-medium">{{ $p->nombre }}</td>
                            <td class="py-2 pe-4">{{ $p->categoria ? __('crm.categorias.'.$p->categoria) : '—' }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($p->precio) }}</td>
                            <td class="py-2 pe-4">{{ $p->activo ? 'Activo' : 'Desactivado' }}</td>
                            <td class="py-2 text-right"><a href="{{ route('productos.edit', $p) }}" class="text-indigo-600 hover:underline">Editar</a></td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="py-6 text-center text-gray-500">No hay productos con esos filtros.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="mt-4">{{ $productos->links() }}</div>
    </x-tarjeta>
</x-app-layout>
