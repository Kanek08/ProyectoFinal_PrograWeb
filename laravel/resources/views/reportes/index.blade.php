@php use App\Support\Formato; $max = \App\Models\User::CARTERA_MAXIMA; $esAdmin = auth()->user()->esAdministrador(); @endphp
<x-app-layout>
    <x-slot name="titulo">Reporte del mes</x-slot>
    <x-slot name="header">
        <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 class="font-semibold text-xl text-gray-800 leading-tight">Reporte de {{ $mes->etiqueta() }}</h2>
                <p class="text-sm text-gray-500">{{ $esAdmin ? 'Toda la empresa' : 'Su equipo' }}. Ventas = cotizaciones cerradas como venta en el mes (hora de Guatemala). El pronóstico considera todas las cotizaciones abiertas, sin filtro de mes.</p>
            </div>
            <x-selector-mes :mes="$mes" ruta="reportes.index" />
        </div>
    </x-slot>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white shadow-sm rounded-lg p-4">
            <p class="text-sm text-gray-500">Ventas</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums">{{ $total->ventas }}</p>
        </div>
        <div class="bg-white shadow-sm rounded-lg p-4">
            <p class="text-sm text-gray-500">Total vendido</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums">{{ Formato::q($total->total) }}</p>
        </div>
        <div class="bg-white shadow-sm rounded-lg p-4">
            <p class="text-sm text-gray-500">Pronóstico</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums">{{ Formato::q($total->pronostico) }}</p>
        </div>
    </div>

    <x-tarjeta>
        <x-slot name="titulo">Por asesor</x-slot>
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Asesor</th>
                        @if ($esAdmin) <th class="py-2 pe-4">Equipo</th> @endif
                        <th class="py-2 pe-4 text-right">Ventas</th>
                        <th class="py-2 pe-4 text-right">Total vendido</th>
                        <th class="py-2 pe-4 text-right">Pronóstico</th>
                        <th class="py-2 pe-4 text-right">Cartera</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($vendedores as $v)
                        @php $r = $porVendedor[$v->id]; @endphp
                        <tr>
                            <td class="py-2 pe-4 font-medium">{{ $v->name }} @unless ($v->activo) <span class="text-xs font-normal text-gray-500">(inactivo)</span> @endunless</td>
                            @if ($esAdmin) <td class="py-2 pe-4">{{ $v->supervisor?->name }}</td> @endif
                            <td class="py-2 pe-4 text-right tabular-nums">{{ $r->ventas }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($r->total) }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($r->pronostico) }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ $cartera[$v->id] }} de {{ $max }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="py-4 text-center text-gray-500">No hay asesores.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </x-tarjeta>

    <x-tarjeta>
        <x-slot name="titulo">Por equipo</x-slot>
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Equipo</th>
                        <th class="py-2 pe-4 text-right">Ventas</th>
                        <th class="py-2 pe-4 text-right">Total vendido</th>
                        <th class="py-2 pe-4 text-right">Pronóstico</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @foreach ($equipos as $e)
                        <tr>
                            <td class="py-2 pe-4">Equipo de {{ $e->supervisor?->name }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ $e->resumen->ventas }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($e->resumen->total) }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($e->resumen->pronostico) }}</td>
                        </tr>
                    @endforeach
                </tbody>
                @if ($esAdmin)
                    <tfoot class="border-t font-semibold">
                        <tr>
                            <td class="py-2 pe-4">Toda la empresa</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ $total->ventas }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($total->total) }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($total->pronostico) }}</td>
                        </tr>
                    </tfoot>
                @endif
            </table>
        </div>
    </x-tarjeta>

    <x-tarjeta>
        <x-slot name="titulo">Por producto</x-slot>
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Producto</th>
                        <th class="py-2 pe-4 text-right">Unidades vendidas</th>
                        <th class="py-2 pe-4 text-right">Total vendido</th>
                        <th class="py-2 pe-4 text-right">Pronóstico</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($porProducto as $p)
                        <tr>
                            <td class="py-2 pe-4">{{ $p->nombre }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ $p->unidades }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($p->total) }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($p->pronostico) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="py-4 text-center text-gray-500">Sin ventas ni cotizaciones abiertas.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </x-tarjeta>
</x-app-layout>
