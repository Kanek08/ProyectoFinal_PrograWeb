@php use App\Support\Formato; use App\Support\Embudo; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ __('crm.oportunidades') }}</x-slot>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('crm.oportunidades') }}</h2>
        <p class="text-sm text-gray-500">Solo lectura: las cotizaciones las trabaja cada asesor desde la aplicación de ventas. Fechas en hora de Guatemala.</p>
    </x-slot>

    <x-tarjeta>
        <form method="GET" class="flex flex-wrap items-end gap-3 mb-4">
            <div>
                <label for="etapa" class="block text-sm font-medium text-gray-700">Etapa</label>
                <select id="etapa" name="etapa" class="mt-1 rounded-md border-gray-300 shadow-sm">
                    <option value="">Todas</option>
                    <option value="abiertas" @selected(($filtros['etapa'] ?? '') === 'abiertas')>Abiertas</option>
                    <option value="cerradas" @selected(($filtros['etapa'] ?? '') === 'cerradas')>Cerradas</option>
                    @foreach (Embudo::ETAPAS as $e)
                        <option value="{{ $e }}" @selected(($filtros['etapa'] ?? '') === $e)>{{ __('crm.etapas.'.$e) }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label for="vendedor" class="block text-sm font-medium text-gray-700">Asesor</label>
                <select id="vendedor" name="vendedor" class="mt-1 rounded-md border-gray-300 shadow-sm">
                    <option value="">Todos</option>
                    @foreach ($vendedores as $v)
                        <option value="{{ $v->id }}" @selected((string) ($filtros['vendedor'] ?? '') === (string) $v->id)>{{ $v->name }}</option>
                    @endforeach
                </select>
            </div>
            <button class="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
        </form>

        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Título</th>
                        <th class="py-2 pe-4">Cliente</th>
                        <th class="py-2 pe-4">Asesor</th>
                        <th class="py-2 pe-4">Etapa</th>
                        <th class="py-2 pe-4 text-right">Prob.</th>
                        <th class="py-2 pe-4 text-right">Total</th>
                        <th class="py-2 pe-4">Cierre</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($oportunidades as $o)
                        <tr>
                            <td class="py-2 pe-4"><a href="{{ route('oportunidades.show', $o->id) }}" class="font-medium text-indigo-700 hover:underline">{{ $o->titulo }}</a></td>
                            <td class="py-2 pe-4">{{ $o->cliente->nombre }}</td>
                            <td class="py-2 pe-4">{{ $o->vendedor->name }}</td>
                            <td class="py-2 pe-4"><x-etapa :etapa="$o->etapa" /></td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ $o->probabilidad }} %</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($o->total) }}</td>
                            <td class="py-2 pe-4 tabular-nums">{{ Formato::fecha($o->fecha_cierre) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="py-6 text-center text-gray-500">No hay cotizaciones con esos filtros.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="mt-4">{{ $oportunidades->links() }}</div>
    </x-tarjeta>
</x-app-layout>
