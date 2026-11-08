<?php

namespace App\Support;

/** Etapas del embudo y sus probabilidades (R5). */
final class Embudo
{
    public const ETAPAS = ['prospecto', 'calificado', 'propuesta', 'negociacion', 'ganada', 'perdida'];

    public const ABIERTAS = ['prospecto', 'calificado', 'propuesta', 'negociacion'];

    public const CERRADAS = ['ganada', 'perdida'];

    public const PROBABILIDAD = [
        'prospecto' => 10,
        'calificado' => 25,
        'propuesta' => 50,
        'negociacion' => 75,
        'ganada' => 100,
        'perdida' => 0,
    ];

    /** Expresión SQL fija (sin datos del usuario) para multiplicar por la probabilidad de la etapa. */
    public static function sqlProbabilidad(string $columnaEtapa = 'o.etapa'): string
    {
        return "CASE {$columnaEtapa}
            WHEN 'prospecto' THEN 0.10
            WHEN 'calificado' THEN 0.25
            WHEN 'propuesta' THEN 0.50
            WHEN 'negociacion' THEN 0.75
            ELSE 0 END";
    }
}
