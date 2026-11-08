<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * En «Mi perfil» cada usuario del panel cambia solo su nombre.
 * El correo, el rol y el estado los administra el administrador (L2).
 */
class ProfileUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }
}
