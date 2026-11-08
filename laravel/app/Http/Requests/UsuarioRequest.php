<?php

namespace App\Http\Requests;

use App\Models\Oportunidad;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

/** Crear y editar cuentas (L2). Solo el administrador llega aquí (middleware rol:administrador). */
class UsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->esAdministrador();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
            'activo' => $this->boolean('activo'),
            'supervisor_id' => $this->input('rol') === 'vendedor' ? $this->input('supervisor_id') : null,
        ]);
    }

    public function rules(): array
    {
        /** @var User|null $editado */
        $editado = $this->route('usuario');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($editado?->id)],
            'password' => [$editado ? 'nullable' : 'required', 'string', Password::min(8)],
            'rol' => ['required', Rule::in(User::ROLES)],
            'supervisor_id' => [
                'required_if:rol,vendedor',
                'nullable',
                'integer',
                // Debe ser un jefe de tienda activo (y no la misma cuenta que se edita).
                Rule::exists('users', 'id')->where('rol', 'supervisor')->where('activo', true),
                Rule::notIn(array_filter([$editado?->id])),
            ],
            'activo' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'supervisor_id.exists' => 'El jefe de tienda debe ser una cuenta de jefe de tienda activa.',
            'supervisor_id.not_in' => 'Una cuenta no puede ser su propio jefe de tienda.',
            'password.required' => 'Escriba una contraseña para la cuenta.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $v) {
            /** @var User|null $editado */
            $editado = $this->route('usuario');
            if (! $editado || $v->errors()->isNotEmpty()) {
                return;
            }

            $rolNuevo = $this->input('rol');
            $activoNuevo = $this->boolean('activo');

            // El administrador no puede desactivarse ni quitarse el rol a sí mismo.
            if ($editado->is($this->user())) {
                if ($rolNuevo !== $editado->rol) {
                    $v->errors()->add('rol', 'No puede cambiar su propio rol.');
                }
                if (! $activoNuevo) {
                    $v->errors()->add('activo', 'No puede desactivar su propia cuenta.');
                }
            }

            // Un jefe de tienda con asesores no cambia de rol ni se desactiva hasta reasignarlos.
            if ($editado->esSupervisor() && ($rolNuevo !== 'supervisor' || ! $activoNuevo)
                && $editado->equipo()->exists()) {
                $v->errors()->add($rolNuevo !== 'supervisor' ? 'rol' : 'activo',
                    'Reasigne primero a los asesores de su equipo.');
            }

            // Un asesor con cartera u oportunidades no cambia de rol (sí puede desactivarse: decisión D4).
            if ($editado->esVendedor() && $rolNuevo !== 'vendedor'
                && ($editado->clientes()->exists() || Oportunidad::where('vendedor_id', $editado->id)->exists())) {
                $v->errors()->add('rol', 'El asesor tiene clientes u oportunidades: no puede cambiar de rol.');
            }
        }];
    }
}
