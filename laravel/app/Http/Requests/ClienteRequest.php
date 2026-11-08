<?php

namespace App\Http\Requests;

use App\Models\Cliente;
use App\Support\Identidad;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Crear y editar clientes con las reglas de R4 (L4, L7).
 * Se valida lo que escribió el usuario; si falla, el formulario vuelve con ese mismo texto.
 * La unicidad se comprueba con los valores YA normalizados, y el índice único de la base
 * es el árbitro final (el controlador captura la llave duplicada).
 */
class ClienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->esAdministrador() || $this->user()->esSupervisor();
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'nit' => ['required', 'string', 'max:20', function (string $attr, mixed $valor, \Closure $fail) {
                [$valido] = Identidad::normalizarNit((string) $valor);
                if (! $valido) {
                    $fail('Escriba un NIT válido (con su dígito verificador) o CF.');
                }
            }],
            'telefono' => ['required', 'string', 'max:25', function (string $attr, mixed $valor, \Closure $fail) {
                if (! Identidad::telefonoValido(Identidad::normalizarTelefono((string) $valor))) {
                    $fail('Escriba un teléfono de Guatemala de 8 dígitos.');
                }
            }],
            'correo' => ['nullable', 'string', 'email', 'max:150'],
            // Solo al crear: asignarlo de una vez a un asesor (se valida en el servicio de asignación).
            'vendedor_id' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Escriba el nombre del cliente.',
            'nit.required' => 'Escriba el NIT del cliente o CF si es consumidor final.',
            'telefono.required' => 'Escriba el teléfono del cliente.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $v) {
            if ($v->errors()->hasAny(['nit', 'telefono'])) {
                return;
            }

            $id = $this->route('cliente');
            $id = $id instanceof Cliente ? $id->id : $id;
            $datos = $this->normalizados();

            if ($datos['nit'] !== null
                && Cliente::where('nit', $datos['nit'])->when($id, fn ($q) => $q->whereKeyNot($id))->exists()) {
                $v->errors()->add('nit', 'Ya existe un cliente con ese NIT.');
            }

            if (Cliente::where('telefono', $datos['telefono'])->when($id, fn ($q) => $q->whereKeyNot($id))->exists()) {
                $v->errors()->add('telefono', 'Ya existe un cliente con ese teléfono.');
            }
        }];
    }

    /** Valores listos para guardar: NIT compacto (NULL si es CF) y teléfono de 8 dígitos. */
    public function normalizados(): array
    {
        [, $nit] = Identidad::normalizarNit((string) $this->input('nit'));
        $correo = trim((string) $this->input('correo'));

        return [
            'nombre' => trim((string) $this->input('nombre')),
            'nit' => $nit,
            'telefono' => Identidad::normalizarTelefono((string) $this->input('telefono')),
            'correo' => $correo === '' ? null : strtolower($correo),
        ];
    }
}
