<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * R1 / L2: en cada petición se revisa al usuario de la sesión tal como está HOY en la base.
 * Si fue desactivado o su rol pasó a vendedor, pierde la sesión en esta misma petición.
 * Se agrega al grupo web, así que protege todas las páginas del panel.
 */
class CuentaPersonalActiva
{
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if ($usuario && (! $usuario->activo || $usuario->esVendedor())) {
            $mensaje = ! $usuario->activo
                ? 'Su cuenta fue desactivada. Comuníquese con el administrador.'
                : 'Su cuenta es de asesor de ventas. Ingrese desde la aplicación de ventas.';

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors(['email' => $mensaje]);
        }

        return $next($request);
    }
}
