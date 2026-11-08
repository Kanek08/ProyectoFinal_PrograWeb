@php use App\Support\Formato; $max = \App\Models\User::CARTERA_MAXIMA; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ auth()->user()->esSupervisor() ? 'Mi equipo' : 'Equipos' }}</x-slot>
    <x-slot name="header">
        <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ auth()->user()->esSupervisor() ? 'Mi equipo' : 'Equipos' }}</h2>
                <p class="text-sm text-gray-500">Cartera de cada asesor y sus ventas de {{ $mes->etiqueta() }}.</p>
            </div>
            <x-selector-mes :mes="$mes" ruta="equipos.index" />
        </div>
    </x-slot>

    @forelse ($equipos as $e)
        <x-tarjeta>
            <x-slot name="titulo">
                Equipo de {{ $e->supervisor->name }}
                @unless ($e->supervisor->activo) <span class="ms-1 text-xs font-normal text-gray-500">(jefe de tienda inactivo)</span> @endunless
            </x-slot>
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="text-left text-gray-500 border-b">
                        <tr>
                            <th class="py-2 pe-4">Asesor</th>
                            <th class="py-2 pe-4">Cartera</th>
                            <th class="py-2 pe-4 text-right">Ventas</th>
                            <th class="py-2 pe-4 text-right">Total vendido</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        @forelse ($e->vendedores as $v)
                            @php $n = $e->cartera[$v->id]; @endphp
                            <tr>
                                <td class="py-2 pe-4 font-medium">
                                    <a href="{{ route('clientes.index', ['vendedor' => $v->id]) }}" class="text-indigo-700 hover:underline">{{ $v->name }}</a>
                                    @unless ($v->activo) <span class="ms-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">inactivo</span> @endunless
                                </td>
                                <td class="py-2 pe-4">
                                    <div class="flex items-center gap-2">
                                        <div class="h-2 w-24 rounded bg-gray-200"><div class="h-2 rounded {{ $n >= $max ? 'bg-red-500' : 'bg-indigo-500' }}" style="width: {{ min(100, $n * 100 / $max) }}%"></div></div>
                                        <span class="tabular-nums">{{ $n }} de {{ $max }}</span>
                                    </div>
                                </td>
                                <td class="py-2 pe-4 text-right tabular-nums">{{ $e->ventas[$v->id]->ventas }}</td>
                                <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($e->ventas[$v->id]->total) }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="4" class="py-4 text-center text-gray-500">Este equipo no tiene asesores.</td></tr>
                        @endforelse
                    </tbody>
                    @if ($e->vendedores->isNotEmpty())
                        <tfoot class="border-t font-semibold">
                            <tr>
                                <td class="py-2 pe-4">Total del equipo</td>
                                <td class="py-2 pe-4 tabular-nums">{{ $e->cartera->sum() }} clientes</td>
                                <td class="py-2 pe-4 text-right tabular-nums">{{ $e->resumen->ventas }}</td>
                                <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($e->resumen->total) }}</td>
                            </tr>
                        </tfoot>
                    @endif
                </table>
            </div>
        </x-tarjeta>
    @empty
        <x-tarjeta><p class="text-gray-500">No hay equipos registrados.</p></x-tarjeta>
    @endforelse
</x-app-layout>
