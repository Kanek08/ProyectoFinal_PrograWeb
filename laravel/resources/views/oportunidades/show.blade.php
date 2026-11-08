@php use App\Support\Formato; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ $op->titulo }}</x-slot>
    <x-slot name="header">
        <div class="flex flex-wrap items-center gap-3">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ $op->titulo }}</h2>
            <x-etapa :etapa="$op->etapa" />
        </div>
        <p class="text-sm text-gray-500">
            {{ $op->cliente->nombre }} · {{ $op->vendedor->name }} · Probabilidad {{ $op->probabilidad }} %
            @if ($op->fecha_cierre) · Cierre {{ Formato::fecha($op->fecha_cierre) }} @endif
        </p>
    </x-slot>

    @if ($op->motivo_perdida)
        <div class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">Motivo de pérdida: {{ $op->motivo_perdida }}</div>
    @endif

    <x-tarjeta>
        <x-slot name="titulo">Productos cotizados</x-slot>
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Producto</th>
                        <th class="py-2 pe-4 text-right">Cantidad</th>
                        <th class="py-2 pe-4 text-right">Precio cotizado</th>
                        <th class="py-2 pe-4 text-right">Precio hoy</th>
                        <th class="py-2 pe-4 text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($op->lineas as $l)
                        <tr>
                            <td class="py-2 pe-4">{{ $l->producto->nombre }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ $l->cantidad }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($l->precio_unitario) }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums text-gray-500">{{ Formato::q($l->producto->precio) }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($l->subtotal) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="py-4 text-center text-gray-500">Sin productos.</td></tr>
                    @endforelse
                </tbody>
                <tfoot class="border-t font-semibold">
                    <tr>
                        <td colspan="4" class="py-2 pe-4 text-right">Total</td>
                        <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($op->total) }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <p class="mt-2 text-xs text-gray-500">El total usa el precio guardado en cada línea; los cambios de precio del catálogo no lo alteran.</p>
    </x-tarjeta>

    <x-tarjeta>
        <x-slot name="titulo">Historial de etapas</x-slot>
        <ol class="space-y-2 text-sm">
            @foreach ($op->historial as $h)
                <li class="flex flex-wrap items-center gap-2">
                    <span class="tabular-nums text-gray-500 w-36">{{ Formato::fecha($h->created_at) }}</span>
                    @if ($h->etapa_anterior)
                        <x-etapa :etapa="$h->etapa_anterior" /> <span class="text-gray-400">→</span>
                    @else
                        <span class="text-gray-500">Creada en</span>
                    @endif
                    <x-etapa :etapa="$h->etapa_nueva" />
                    <span class="text-gray-500">por {{ $h->usuario->name }}</span>
                </li>
            @endforeach
        </ol>
    </x-tarjeta>
</x-app-layout>
