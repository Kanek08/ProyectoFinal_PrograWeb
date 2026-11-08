@php use App\Support\Formato; @endphp
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">Hola, {{ auth()->user()->name }}</h2>
        <p class="text-sm text-gray-500">
            {{ __('crm.roles.'.auth()->user()->rol) }} ·
            {{ auth()->user()->esAdministrador() ? 'Toda la empresa' : 'Su equipo' }} ·
            {{ ucfirst($mes->etiqueta()) }}
        </p>
    </x-slot>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @foreach ([
            ['Ventas del mes', $resumen->ventas],
            ['Total vendido', Formato::q($resumen->total)],
            ['Pronóstico', Formato::q($resumen->pronostico)],
            [__('crm.oportunidades').' abiertas', $abiertas],
            [__('crm.clientes').' visibles', $clientes],
            ['Clientes disponibles', $disponibles],
            ['Asesores activos', $asesores],
        ] as [$etiqueta, $valor])
            <div class="bg-white shadow-sm rounded-lg p-4">
                <p class="text-sm text-gray-500">{{ $etiqueta }}</p>
                <p class="mt-1 text-2xl font-semibold text-gray-900">{{ $valor }}</p>
            </div>
        @endforeach
    </div>

    <x-tarjeta>
        <p class="text-sm text-gray-600">
            Las cotizaciones las crea y trabaja cada asesor desde la aplicación de ventas. Aquí puede administrar
            {{ auth()->user()->esAdministrador() ? 'cuentas, catálogo, clientes' : 'los clientes de su equipo' }},
            asignarlos a los asesores y revisar los reportes del mes.
        </p>
    </x-tarjeta>
</x-app-layout>
