<?php

/*
 * Mensajes de validación en español, tratando de usted (L7).
 */
return [

    'accepted' => 'Debe aceptar :attribute.',
    'array' => ':Attribute no tiene un formato válido.',
    'between' => [
        'numeric' => ':Attribute debe estar entre :min y :max.',
        'string' => ':Attribute debe tener entre :min y :max caracteres.',
    ],
    'boolean' => 'Elija un valor válido para :attribute.',
    'confirmed' => 'La confirmación de :attribute no coincide.',
    'current_password' => 'La contraseña actual no es correcta.',
    'date' => 'Escriba una fecha válida en :attribute.',
    'decimal' => ':Attribute debe tener como máximo :decimal decimales.',
    'email' => 'Escriba un correo electrónico válido.',
    'exists' => 'El valor elegido en :attribute no es válido.',
    'gt' => [
        'numeric' => ':Attribute debe ser mayor que :value.',
    ],
    'in' => 'Elija un valor válido para :attribute.',
    'integer' => ':Attribute debe ser un número entero.',
    'lowercase' => ':Attribute debe escribirse en minúsculas.',
    'max' => [
        'numeric' => ':Attribute no puede ser mayor que :max.',
        'string' => ':Attribute no puede tener más de :max caracteres.',
    ],
    'min' => [
        'numeric' => ':Attribute debe ser al menos :min.',
        'string' => ':Attribute debe tener al menos :min caracteres.',
    ],
    'numeric' => ':Attribute debe ser un número.',
    'password' => [
        'letters' => 'La contraseña debe incluir al menos una letra.',
        'mixed' => 'La contraseña debe incluir mayúsculas y minúsculas.',
        'numbers' => 'La contraseña debe incluir al menos un número.',
        'symbols' => 'La contraseña debe incluir al menos un símbolo.',
        'uncompromised' => 'Esa contraseña apareció en una filtración de datos. Elija otra.',
    ],
    'prohibited' => ':Attribute no debe enviarse.',
    'regex' => 'El formato de :attribute no es válido.',
    'required' => 'Escriba :attribute.',
    'required_if' => 'Indique :attribute.',
    'string' => ':Attribute debe ser texto.',
    'unique' => 'Ya existe un registro con ese :attribute.',

    'custom' => [
        'precio' => [
            'gt' => 'El precio debe ser mayor que cero y tener como máximo dos decimales.',
            'decimal' => 'El precio debe ser mayor que cero y tener como máximo dos decimales.',
            'numeric' => 'El precio debe ser mayor que cero y tener como máximo dos decimales.',
            'required' => 'Escriba el precio del producto.',
        ],
        'nombre' => [
            'unique' => 'Ya existe un producto con ese nombre.',
        ],
        'email' => [
            'unique' => 'Ya existe una cuenta con ese correo.',
        ],
        'rol' => [
            'required' => 'Elija el rol de la cuenta.',
        ],
        'supervisor_id' => [
            'required_if' => 'Elija el jefe de tienda del asesor.',
            'prohibited' => 'Solo los asesores de ventas tienen jefe de tienda.',
        ],
    ],

    'attributes' => [
        'name' => 'el nombre',
        'email' => 'el correo',
        'password' => 'la contraseña',
        'current_password' => 'la contraseña actual',
        'rol' => 'el rol',
        'supervisor_id' => 'el jefe de tienda',
        'activo' => 'el estado',
        'nombre' => 'el nombre',
        'precio' => 'el precio',
        'categoria' => 'la categoría',
        'nit' => 'el NIT',
        'telefono' => 'el teléfono',
        'correo' => 'el correo',
        'vendedor_id' => 'el asesor',
        'mes' => 'el mes',
    ],

];
