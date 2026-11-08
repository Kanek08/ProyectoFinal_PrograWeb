@php use App\Support\Formato; $max = \App\Models\User::CARTERA_MAXIMA; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ $cliente->nombre }}</x-slot>
    <x-slot name="header">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ $cliente->nombre }}</h2>
                <p class="text-sm text-gray-500">NIT {{ $cliente->nit_visible }} · Tel. {{ $cliente->telefono }}{{ $cliente->correo ? ' · '.$cliente->correo : '' }}</p>
            </div>
            <div class="flex items-center gap-3">
                <a href="{{ route('clientes.edit', $cliente->id) }}" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Editar</a>
                @if (auth()->user()->esAdministrador() && $oportunidades->isEmpty())
                    <form method="POST" action="{{ route('clientes.destroy', $cliente->id) }}"
                          onsubmit="return confirm('¿Eliminar este cliente y sus seguimientos? Esta acción no se puede deshacer.')">
                        @csrf @method('DELETE')
                        <button class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Eliminar</button>
                    </form>
                @endif
            </div>
        </div>
    </x-slot>

    <x-tarjeta>
        <x-slot name="titulo">Asesor responsable</x-slot>

        <p class="text-sm text-gray-700 mb-4">
            @if ($cliente->vendedor)
                Actualmente: <strong>{{ $cliente->vendedor->name }}</strong>
                @unless ($cliente->vendedor->activo)
                    <span class="ms-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">asesor inactivo: reasígnelo</span>
                @endunless
            @else
                <span class="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Disponible</span>
                — cualquier asesor con espacio en su cartera puede tomarlo desde la aplicación de ventas.
            @endif
        </p>

        <div class="flex flex-wrap items-end gap-3">
            <form method="POST" action="{{ route('clientes.asignar', $cliente->id) }}" class="flex flex-wrap items-end gap-3">
                @csrf @method('PATCH')
                <div>
                    <label for="vendedor_id" class="block text-sm font-medium text-gray-700">{{ $cliente->vendedor ? 'Reasignar a' : 'Asignar a' }}</label>
                    <select id="vendedor_id" name="vendedor_id" required class="mt-1 rounded-md border-gray-300 shadow-sm">
                        <option value="">Elija un asesor</option>
                        @foreach ($vendedores as $v)
                            @continue($v->id === $cliente->vendedor_id)
                            <option value="{{ $v->id }}" @disabled($v->clientes_count >= $max)>{{ $v->name }} ({{ $v->clientes_count }} de {{ $max }})</option>
                        @endforeach
                    </select>
                </div>
                <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{{ $cliente->vendedor ? 'Reasignar' : 'Asignar' }}</button>
            </form>

            @if ($cliente->vendedor)
                <form method="POST" action="{{ route('clientes.asignar', $cliente->id) }}"
                      onsubmit="return confirm('¿Dejar este cliente disponible para cualquier asesor?')">
                    @csrf @method('PATCH')
                    <input type="hidden" name="vendedor_id" value="">
                    <button class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            @disabled($tieneAbiertas) title="{{ $tieneAbiertas ? 'Tiene cotizaciones abiertas' : '' }}">Liberar</button>
                </form>
            @endif
        </div>
        <x-input-error :messages="$errors->get('vendedor_id')" class="mt-2" />
        <p class="mt-3 text-xs text-gray-500">
            Al reasignar, las cotizaciones abiertas pasan al nuevo asesor y las cerradas conservan su asesor.
            Un cliente con cotizaciones abiertas no se puede liberar.
        </p>
    </x-tarjeta>

    <x-tarjeta>
        <x-slot name="titulo">{{ __('crm.oportunidades') }}</x-slot>
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="text-left text-gray-500 border-b">
                    <tr>
                        <th class="py-2 pe-4">Título</th>
                        <th class="py-2 pe-4">Etapa</th>
                        <th class="py-2 pe-4">Asesor</th>
                        <th class="py-2 pe-4 text-right">Total</th>
                        <th class="py-2 pe-4">Cierre</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    @forelse ($oportunidades as $o)
                        <tr>
                            <td class="py-2 pe-4"><a href="{{ route('oportunidades.show', $o->id) }}" class="text-indigo-700 hover:underline">{{ $o->titulo }}</a></td>
                            <td class="py-2 pe-4"><x-etapa :etapa="$o->etapa" /></td>
                            <td class="py-2 pe-4">{{ $o->vendedor->name }}</td>
                            <td class="py-2 pe-4 text-right tabular-nums">{{ Formato::q($o->total) }}</td>
                            <td class="py-2 pe-4 tabular-nums">{{ Formato::fecha($o->fecha_cierre) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="py-4 text-center text-gray-500">Sin cotizaciones visibles.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </x-tarjeta>

    <x-tarjeta>
        <x-slot name="titulo">{{ __('crm.actividades') }}</x-slot>
        <ul class="divide-y text-sm">
            @forelse ($actividades as $a)
                <li class="py-2 flex flex-wrap justify-between gap-2">
                    <span>
                        <span class="font-medium">{{ __('crm.tipos_actividad.'.$a->tipo) }}:</span> {{ $a->descripcion }}
                        <span class="text-gray-500">· {{ $a->vendedor->name }}</span>
                    </span>
                    <span class="tabular-nums {{ $a->vencida ? 'text-red-700 font-medium' : 'text-gray-500' }}">
                        {{ $a->completada ? 'Completado' : ($a->vencida ? 'Vencido' : 'Pendiente') }} · {{ Formato::fecha($a->vence_en) }}
                    </span>
                </li>
            @empty
                <li class="py-2 text-gray-500">Sin seguimientos.</li>
            @endforelse
        </ul>
    </x-tarjeta>
</x-app-layout>
