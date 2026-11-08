<x-app-layout>
    <x-slot name="titulo">Cuentas</x-slot>
    <x-slot name="header">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">Cuentas</h2>
            <a href="{{ route('usuarios.create') }}" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Nueva cuenta</a>
        </div>
    </x-slot>

    <x-tarjeta>
        <form method="GET" class="flex flex-wrap items-end gap-3 mb-4">
            <div>
                <label for="rol" class="block text-sm font-medium text-gray-700">Rol</label>
                <select id="rol" name="rol" class="mt-1 rounded-md border-gray-300 shadow-sm">
                    <option value="">Todos</option>
                    @foreach (\App\Models\User::ROLES as $rol)
                        <option value="{{ $rol }}" @selected(($filtros['rol'] ?? '') === $rol)>{{ __('crm.roles.'.$rol) }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label for="estado" class="block text-sm font-medium text-gray-700">Estado</label>
                <select id="estado" name="estado" class="mt-1 rounded-md border-gray-300 shadow-sm">
                    <option value="">Todas</option>
                    <option value="activas" @selected(($filtros['estado'] ?? '') === 'activas')>Activas</option>
                    <option value="inactivas" @selected(($filtros['estado'] ?? '') === 'inactivas')>Desactivadas</option>
                </select>
            </div>
            <button class="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
        </form>

        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Nombre</th>
                        <th class="py-2 pe-4">Correo</th>
                        <th class="py-2 pe-4">Rol</th>
                        <th class="py-2 pe-4">Jefe de tienda</th>
                        <th class="py-2 pe-4">Cartera</th>
                        <th class="py-2 pe-4">Estado</th>
                        <th class="py-2"></th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($usuarios as $u)
                        <tr>
                            <td class="py-2 pe-4 font-medium text-gray-900">{{ $u->name }}</td>
                            <td class="py-2 pe-4">{{ $u->email }}</td>
                            <td class="py-2 pe-4">{{ __('crm.roles.'.$u->rol) }}</td>
                            <td class="py-2 pe-4">{{ $u->supervisor?->name ?? '—' }}</td>
                            <td class="py-2 pe-4">{{ $u->esVendedor() ? $u->clientes_count.' de '.\App\Models\User::CARTERA_MAXIMA : '—' }}</td>
                            <td class="py-2 pe-4">
                                @if ($u->activo)
                                    <span class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Activa</span>
                                @else
                                    <span class="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">Desactivada</span>
                                @endif
                            </td>
                            <td class="py-2 text-right"><a href="{{ route('usuarios.edit', $u) }}" class="text-indigo-600 hover:underline">Editar</a></td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="py-6 text-center text-gray-500">No hay cuentas con esos filtros.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="mt-4">{{ $usuarios->links() }}</div>
    </x-tarjeta>
</x-app-layout>
