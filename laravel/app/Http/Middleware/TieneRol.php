<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Uso: ->middleware('rol:administrador') o 'rol:administrador,supervisor'. */
class TieneRol
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        abort_unless($request->user() && in_array($request->user()->rol, $roles, true), 403,
            'Su cuenta no tiene permiso para ver esta página.');

        return $next($request);
    }
}
