@php $editando = $producto->exists; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ $editando ? 'Editar producto' : 'Nuevo producto' }}</x-slot>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ $editando ? 'Editar producto' : 'Nuevo producto' }}</h2>
    </x-slot>

    <x-tarjeta class="max-w-2xl">
        <form method="POST" action="{{ $editando ? route('productos.update', $producto) : route('productos.store') }}" class="space-y-5">
            @csrf
            @if ($editando) @method('PUT') @endif

            <div>
                <x-input-label for="nombre" value="Nombre" />
                <x-text-input id="nombre" name="nombre" class="mt-1 block w-full" :value="old('nombre', $producto->nombre)" required maxlength="120" />
                <x-input-error :messages="$errors->get('nombre')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="precio" value="Precio (Q)" />
                <x-text-input id="precio" name="precio" inputmode="decimal" class="mt-1 block w-full" :value="old('precio', $producto->precio)" required placeholder="1200.00" />
                @if ($editando)
                    <p class="mt-1 text-xs text-gray-500">Cambiar el precio no modifica las cotizaciones existentes: cada una guarda el precio al que se cotizó.</p>
                @endif
                <x-input-error :messages="$errors->get('precio')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="categoria" value="Categoría" />
                <select id="categoria" name="categoria" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="">Sin categoría</option>
                    @foreach (\App\Models\Producto::CATEGORIAS as $cat)
                        <option value="{{ $cat }}" @selected(old('categoria', $producto->categoria) === $cat)>{{ __('crm.categorias.'.$cat) }}</option>
                    @endforeach
                </select>
                <p class="mt-1 text-xs text-gray-500">Regla RS-1: una cotización con equipos solo se cierra como venta si incluye una garantía por equipo.</p>
                <x-input-error :messages="$errors->get('categoria')" class="mt-2" />
            </div>

            <div>
                <input type="hidden" name="activo" value="0">
                <label class="inline-flex items-center gap-2">
                    <input type="checkbox" name="activo" value="1" class="rounded border-gray-300 text-indigo-600" @checked(old('activo', $producto->activo ?? true))>
                    <span class="text-sm text-gray-700">Producto activo</span>
                </label>
                <p class="mt-1 text-xs text-gray-500">Los productos no se borran: se desactivan. Solo los activos se agregan a cotizaciones.</p>
            </div>

            <div class="flex items-center gap-3">
                <x-primary-button>{{ $editando ? 'Guardar cambios' : 'Agregar producto' }}</x-primary-button>
                <a href="{{ route('productos.index') }}" class="text-sm text-gray-600 hover:underline">Cancelar</a>
            </div>
        </form>
    </x-tarjeta>
</x-app-layout>
