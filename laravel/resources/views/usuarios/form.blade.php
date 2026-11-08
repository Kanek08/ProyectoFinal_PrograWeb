@php $editando = $usuario->exists; @endphp
<x-app-layout>
    <x-slot name="titulo">{{ $editando ? 'Editar cuenta' : 'Nueva cuenta' }}</x-slot>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ $editando ? 'Editar cuenta de '.$usuario->name : 'Nueva cuenta' }}
        </h2>
    </x-slot>

    <x-tarjeta class="max-w-2xl">
        <form method="POST" action="{{ $editando ? route('usuarios.update', $usuario) : route('usuarios.store') }}"
              class="space-y-5" x-data="{ rol: @js(old('rol', $usuario->rol)) }">
            @csrf
            @if ($editando) @method('PUT') @endif

            <div>
                <x-input-label for="name" value="Nombre" />
                <x-text-input id="name" name="name" class="mt-1 block w-full" :value="old('name', $usuario->name)" required maxlength="255" />
                <x-input-error :messages="$errors->get('name')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="email" value="Correo" />
                <x-text-input id="email" name="email" type="email" class="mt-1 block w-full" :value="old('email', $usuario->email)" required maxlength="255" />
                <x-input-error :messages="$errors->get('email')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="password" :value="$editando ? 'Nueva contraseña (déjela vacía para no cambiarla)' : 'Contraseña'" />
                <x-text-input id="password" name="password" type="password" class="mt-1 block w-full" autocomplete="new-password" :required="! $editando" minlength="8" />
                <x-input-error :messages="$errors->get('password')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="rol" value="Rol" />
                <select id="rol" name="rol" x-model="rol" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    @foreach (\App\Models\User::ROLES as $rol)
                        <option value="{{ $rol }}" @selected(old('rol', $usuario->rol) === $rol)>{{ __('crm.roles.'.$rol) }}</option>
                    @endforeach
                </select>
                <x-input-error :messages="$errors->get('rol')" class="mt-2" />
            </div>

            <div x-show="rol === 'vendedor'">
                <x-input-label for="supervisor_id" value="Jefe de tienda" />
                <select id="supervisor_id" name="supervisor_id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="">Elija un jefe de tienda</option>
                    @foreach ($supervisores as $s)
                        <option value="{{ $s->id }}" @selected((string) old('supervisor_id', $usuario->supervisor_id) === (string) $s->id)>{{ $s->name }}</option>
                    @endforeach
                </select>
                <p class="mt-1 text-xs text-gray-500">Solo aparecen jefes de tienda activos.</p>
                <x-input-error :messages="$errors->get('supervisor_id')" class="mt-2" />
            </div>

            <div>
                <input type="hidden" name="activo" value="0">
                <label class="inline-flex items-center gap-2">
                    <input type="checkbox" name="activo" value="1" class="rounded border-gray-300 text-indigo-600"
                           @checked(old('activo', $usuario->activo ?? true))>
                    <span class="text-sm text-gray-700">Cuenta activa</span>
                </label>
                <p class="mt-1 text-xs text-gray-500">Las cuentas no se borran: se desactivan. Una cuenta desactivada no entra al panel ni a la aplicación de ventas.</p>
                <x-input-error :messages="$errors->get('activo')" class="mt-2" />
            </div>

            <div class="flex items-center gap-3">
                <x-primary-button>{{ $editando ? 'Guardar cambios' : 'Crear cuenta' }}</x-primary-button>
                <a href="{{ route('usuarios.index') }}" class="text-sm text-gray-600 hover:underline">Cancelar</a>
            </div>
        </form>
    </x-tarjeta>
</x-app-layout>
