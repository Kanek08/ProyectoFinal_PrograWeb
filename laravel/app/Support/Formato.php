<?php

namespace App\Support;

use DateTimeInterface;
use Illuminate\Support\Carbon;

/** Formatos para las vistas: quetzales y fechas en hora de Guatemala. */
final class Formato
{
    /** 9250 → «Q9,250.00» */
    public static function q(string|int|float|null $monto): string
    {
        return 'Q'.number_format((float) ($monto ?? 0), 2, '.', ',');
    }

    /** Fecha guardada en UTC mostrada en hora de Guatemala: «31/10/2026 21:30». */
    public static function fecha(?DateTimeInterface $fecha): string
    {
        if ($fecha === null) {
            return '—';
        }

        return Carbon::instance($fecha)->setTimezone(MesGuatemala::ZONA)->format('d/m/Y H:i');
    }
}
