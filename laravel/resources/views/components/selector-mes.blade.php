@props(['mes', 'ruta'])
<form method="GET" action="{{ route($ruta) }}" class="flex flex-wrap items-end gap-2">
    <div>
        <label for="mes" class="block text-sm font-medium text-gray-700">Mes</label>
        <input id="mes" type="month" name="mes" value="{{ $mes->mes }}" required
               class="mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
    </div>
    <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Ver</button>
    <span class="text-sm text-gray-500 pb-2">Mes calendario en hora de Guatemala</span>
    <x-input-error :messages="$errors->get('mes')" class="w-full" />
</form>
