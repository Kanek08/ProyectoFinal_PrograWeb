@php $editando = $cliente->exists; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ $editando ? 'Editar cliente' : 'Nuevo cliente' }}</x-slot>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ $editando ? 'Editar a '.$cliente->nombre : 'Nuevo cliente' }}</h2>
    </x-slot>

    <x-tarjeta class="max-w-2xl">
        <form method="POST" action="{{ $editando ? route('clientes.update', $cliente->id) : route('clientes.store') }}" class="space-y-5">
            @csrf
            @if ($editando) @method('PUT') @endif

            <div>
                <x-input-label for="nombre" value="Nombre o razón social" />
                <x-text-input id="nombre" name="nombre" class="mt-1 block w-full" :value="old('nombre', $cliente->nombre)" required maxlength="150" />
                <x-input-error :messages="$errors->get('nombre')" class="mt-2" />
            </div>

            <div class="grid sm:grid-cols-2 gap-5">
                <div>
                    <x-input-label for="nit" value="NIT" />
                    <x-text-input id="nit" name="nit" class="mt-1 block w-full" :value="old('nit', $editando ? $cliente->nit_visible : '')" required maxlength="20" placeholder="4521817-K o CF" />
                    <p class="mt-1 text-xs text-gray-500">Con su dígito verificador, o CF si es consumidor final.</p>
                    <x-input-error :messages="$errors->get('nit')" class="mt-2" />
                </div>

                <div>
                    <x-input-label for="telefono" value="Teléfono" />
                    <x-text-input id="telefono" name="telefono" inputmode="tel" class="mt-1 block w-full" :value="old('telefono', $cliente->telefono)" required maxlength="25" placeholder="5555-1234" />
                    <p class="mt-1 text-xs text-gray-500">8 dígitos; puede incluir +502, espacios o guiones.</p>
                    <x-input-error :messages="$errors->get('telefono')" class="mt-2" />
                </div>
            </div>

            <div>
                <x-input-label for="correo" value="Correo (opcional)" />
                <x-text-input id="correo" name="correo" type="email" class="mt-1 block w-full" :value="old('correo', $cliente->correo)" maxlength="150" />
                <x-input-error :messages="$errors->get('correo')" class="mt-2" />
            </div>

            @unless ($editando)
                <div>
                    <x-input-label for="vendedor_id" value="Asignar a un asesor (opcional)" />
                    <select id="vendedor_id" name="vendedor_id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="">Dejarlo disponible</option>
                        @foreach ($vendedores as $v)
                            <option value="{{ $v->id }}" @selected((string) old('vendedor_id') === (string) $v->id) @disabled($v->clientes_count >= \App\Models\User::CARTERA_MAXIMA)>
                                {{ $v->name }} ({{ $v->clientes_count }} de {{ \App\Models\User::CARTERA_MAXIMA }})
                            </option>
                        @endforeach
                    </select>
                    <x-input-error :messages="$errors->get('vendedor_id')" class="mt-2" />
                </div>
            @endunless

            <div class="flex items-center gap-3">
                <x-primary-button>{{ $editando ? 'Guardar cambios' : 'Registrar cliente' }}</x-primary-button>
                <a href="{{ $editando ? route('clientes.show', $cliente->id) : route('clientes.index') }}" class="text-sm text-gray-600 hover:underline">Cancelar</a>
            </div>
        </form>
    </x-tarjeta>
</x-app-layout>
