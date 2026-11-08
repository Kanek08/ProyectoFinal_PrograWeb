<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Un mes calendario en hora de Guatemala (UTC−6, sin horario de verano) expresado como rango UTC (R7).
 * '2026-10' → [2026-10-01 06:00:00 UTC, 2026-11-01 06:00:00 UTC)
 */
final class MesGuatemala
{
    public const ZONA = 'America/Guatemala';

    public function __construct(
        public readonly string $mes,
        public readonly CarbonImmutable $inicioUtc,
        public readonly CarbonImmutable $finUtc,
    ) {}

    /** Devuelve null si el texto no es un mes válido AAAA-MM. */
    public static function desde(?string $mes): ?self
    {
        if ($mes === null || $mes === '') {
            $mes = CarbonImmutable::now(self::ZONA)->format('Y-m');
        }

        if (! preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $mes)) {
            return null;
        }

        $inicio = CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$mes}-01 00:00:00", self::ZONA);

        return new self($mes, $inicio->utc(), $inicio->addMonth()->utc());
    }

    public function etiqueta(): string
    {
        return $this->inicioUtc->setTimezone(self::ZONA)->locale('es')->isoFormat('MMMM YYYY');
    }
}
