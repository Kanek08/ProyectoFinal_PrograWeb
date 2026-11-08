<div {{ $attributes->merge(['class' => 'bg-white shadow-sm sm:rounded-lg']) }}>
    @isset($titulo)
        <div class="border-b border-gray-100 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-semibold text-gray-800">{{ $titulo }}</h3>
            {{ $acciones ?? '' }}
        </div>
    @endisset
    <div class="p-4 sm:p-6">
        {{ $slot }}
    </div>
</div>
