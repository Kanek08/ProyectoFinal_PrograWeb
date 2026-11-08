@props(['etapa'])
@php
    $colores = [
        'prospecto' => 'bg-gray-100 text-gray-700',
        'calificado' => 'bg-sky-100 text-sky-800',
        'propuesta' => 'bg-indigo-100 text-indigo-800',
        'negociacion' => 'bg-amber-100 text-amber-800',
        'ganada' => 'bg-green-100 text-green-800',
        'perdida' => 'bg-red-100 text-red-800',
    ];
@endphp
<span {{ $attributes->merge(['class' => 'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium '.($colores[$etapa] ?? '')]) }}>{{ __('crm.etapas.'.$etapa) }}</span>
