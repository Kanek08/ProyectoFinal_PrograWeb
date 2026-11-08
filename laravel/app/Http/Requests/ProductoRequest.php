<?php

namespace App\Http\Requests;

use App\Models\Producto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Catálogo (L3). */
class ProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->esAdministrador();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre')),
            // Se acepta «1,200.50» o «Q1200.50»: se quitan Q, comas y espacios antes de validar.
            'precio' => str_replace(['Q', 'q', ',', ' '], '', (string) $this->input('precio')),
            'categoria' => $this->input('categoria') ?: null,
            'activo' => $this->boolean('activo'),
        ]);
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:120',
                Rule::unique('productos', 'nombre')->ignore($this->route('producto')?->id)],
            'precio' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:99999999.99'],
            'categoria' => ['nullable', Rule::in(Producto::CATEGORIAS)],
            'activo' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'precio.max' => 'El precio no puede pasar de Q99,999,999.99.',
            'nombre.required' => 'Escriba el nombre del producto.',
        ];
    }
}
