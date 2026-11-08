<?php

namespace App\Support;

/**
 * Normalización y validación de NIT y teléfono de Guatemala (R4).
 * La API implementa exactamente la misma lógica en JavaScript (L7): los casos de prueba
 * de la sección 4.1 (L7.2) de la especificación deben dar el mismo resultado en las dos puertas.
 */
final class Identidad
{
    /** Quita espacios y guiones, pasa a mayúsculas y quita los ceros a la izquierda. */
    public static function compactarNit(string $nit): string
    {
        $n = strtoupper(preg_replace('/[\s\-]+/u', '', $nit));

        return ltrim($n, '0');
    }

    public static function esConsumidorFinal(string $nit): bool
    {
        return self::compactarNit($nit) === 'CF';
    }

    /** Recibe un NIT ya compactado (no CF). Valida longitud, formato y dígito verificador (módulo 11). */
    public static function nitValido(string $nit): bool
    {
        if (! preg_match('/^[0-9]{1,11}[0-9K]$/', $nit)) {
            return false; // entre 2 y 12 caracteres
        }

        $cuerpo = substr($nit, 0, -1);
        $verificador = substr($nit, -1);

        $suma = 0;
        $peso = 2;
        for ($i = strlen($cuerpo) - 1; $i >= 0; $i--) {
            $suma += ((int) $cuerpo[$i]) * $peso;
            $peso++;
        }

        $r = (11 - ($suma % 11)) % 11;

        return $verificador === ($r === 10 ? 'K' : (string) $r);
    }

    /**
     * Normaliza un NIT escrito por el usuario.
     * Devuelve [valido, valorAGuardar]: valorAGuardar es NULL para CF.
     *
     * @return array{0: bool, 1: ?string}
     */
    public static function normalizarNit(?string $nit): array
    {
        $compacto = self::compactarNit((string) $nit);

        if ($compacto === 'CF') {
            return [true, null];
        }

        return [self::nitValido($compacto), $compacto];
    }

    /** Quita espacios, guiones, puntos, paréntesis y el prefijo +502 o 502. */
    public static function normalizarTelefono(?string $telefono): string
    {
        $t = preg_replace('/[\s\-\.\(\)]+/u', '', (string) $telefono);

        return preg_replace('/^\+?502(?=\d{8}$)/', '', $t);
    }

    public static function telefonoValido(string $telefonoNormalizado): bool
    {
        return (bool) preg_match('/^[2-9][0-9]{7}$/', $telefonoNormalizado);
    }

    /** Genera el dígito verificador de un cuerpo de NIT (útil para semillas). */
    public static function digitoVerificador(string $cuerpo): string
    {
        $suma = 0;
        $peso = 2;
        for ($i = strlen($cuerpo) - 1; $i >= 0; $i--) {
            $suma += ((int) $cuerpo[$i]) * $peso;
            $peso++;
        }
        $r = (11 - ($suma % 11)) % 11;

        return $r === 10 ? 'K' : (string) $r;
    }
}
