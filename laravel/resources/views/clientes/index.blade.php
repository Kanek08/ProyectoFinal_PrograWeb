<x-app-layout>
    <x-slot name="titulo">{{ __('crm.clientes') }}</x-slot>
    <x-slot name="header">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('crm.clientes') }}</h2>
                <p class="text-sm text-gray-500">
                    {{ auth()->user()->esSupervisor() ? 'Clientes de su equipo y clientes disponibles.' : 'Todos los clientes de la empresa.' }}
                </p>
            </div>
            <a href="{{ route('clientes.create') }}" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Nuevo cliente</a>
        </div>
    </x-slot>

    <x-tarjeta>
        <form method="GET" class="flex flex-wrap items-end gap-3 mb-4">
            <div class="grow sm:grow-0">
                <label for="q" class="block text-sm font-medium text-gray-700">Buscar por nombre o NIT</label>
                <input id="q" name="q" value="{{ $filtros['q'] ?? '' }}" maxlength="150" class="mt-1 w-full sm:w-72 rounded-md border-gray-300 shadow-sm">
            </div>
            <div>
                <label for="vendedor" class="block text-sm font-medium text-gray-700">Asesor</label>
                <select id="vendedor" name="vendedor" class="mt-1 rounded-md border-gray-300 shadow-sm">
                    <option value="">Todos</option>
                    <option value="sin" @selected(($filtros['vendedor'] ?? '') === 'sin')>Sin asignar (disponibles)</option>
                    @foreach ($vendedores as $v)
                        <option value="{{ $v->id }}" @selected(($filtros['vendedor'] ?? '') === (string) $v->id)>{{ $v->name }}{{ $v->activo ? '' : ' (inactivo)' }}</option>
                    @endforeach
                </select>
            </div>
            <button class="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
            @if (($filtros['q'] ?? '') !== '' || ($filtros['vendedor'] ?? '') !== '')
                <a href="{{ route('clientes.index') }}" class="text-sm text-gray-600 hover:underline pb-2">Quitar filtros</a>
            @endif
        </form>

        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Cliente</th>
                        <th class="py-2 pe-4">NIT</th>
                        <th class="py-2 pe-4">Teléfono</th>
                        <th class="py-2 pe-4">Correo</th>
                        <th class="py-2 pe-4">Asesor</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($clientes as $c)
                        <tr>
                            <td class="py-2 pe-4"><a href="{{ route('clientes.show', $c->id) }}" class="font-medium text-indigo-700 hover:underline">{{ $c->nombre }}</a></td>
                            <td class="py-2 pe-4 tabular-nums">{{ $c->nit_visible }}</td>
                            <td class="py-2 pe-4 tabular-nums">{{ $c->telefono }}</td>
                            <td class="py-2 pe-4">{{ $c->correo ?? '—' }}</td>
                            <td class="py-2 pe-4">
                                @if ($c->vendedor)
                                    {{ $c->vendedor->name }}
                                    @unless ($c->vendedor->activo)
                                        <span class="ms-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">asesor inactivo</span>
                                    @endunless
                                @else
                                    <span class="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Disponible</span>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="py-6 text-center text-gray-500">No hay clientes con esos filtros.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="mt-4">{{ $clientes->links() }}</div>
    </x-tarjeta>
</x-app-layout>
