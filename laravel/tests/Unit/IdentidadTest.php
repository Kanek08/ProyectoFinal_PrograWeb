<?php

namespace Tests\Unit;

use App\Support\Identidad;
use App\Support\MesGuatemala;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Casos de la tabla L7.2 de docs/especificacion.md.
 * La API debe resolver exactamente los mismos casos con su versión en JavaScript.
 */
class IdentidadTest extends TestCase
{
    public static function nits(): array
    {
        return [
            'ejemplo del enunciado' => ['452 1817-k', true, '4521817K'],
            'ya compacto' => ['4521817K', true, '4521817K'],
            'cf minúsculas' => ['cf', true, null],
            'CF' => ['CF', true, null],
            'ceros a la izquierda' => ['0004521817-K', true, '4521817K'],
            'dígito verificador incorrecto' => ['12345678', false, '12345678'],
            'solo un carácter' => ['K', false, 'K'],
            'un dígito' => ['1', false, '1'],
            'letras en el cuerpo' => ['45A1817K', false, '45A1817K'],
            'semilla Ferretería Xela' => ['98765434', true, '98765434'],
            'semilla Clínica San Rafael' => ['8889990-K', true, '8889990K'],
            'vacío' => ['', false, ''],
        ];
    }

    #[DataProvider('nits')]
    public function test_normaliza_y_valida_nit(string $entrada, bool $valido, ?string $guardado): void
    {
        [$ok, $valor] = Identidad::normalizarNit($entrada);

        $this->assertSame($valido, $ok);
        $this->assertSame($guardado, $valor);
    }

    public static function telefonos(): array
    {
        return [
            'con +502 y guion' => ['+502 5555-1234', true, '55551234'],
            'con paréntesis y punto' => ['(502) 7761.2345', true, '77612345'],
            'prefijo 502 sin +' => ['502 5555 1234', true, '55551234'],
            '8 dígitos que empiezan en 502' => ['50212345', true, '50212345'],
            'siete dígitos' => ['1234567', false, '1234567'],
            'empieza en 1' => ['15551234', false, '15551234'],
            'empieza en 0' => ['05551234', false, '05551234'],
            'nueve dígitos' => ['555512345', false, '555512345'],
            'con letras' => ['5555-12AB', false, '555512AB'],
        ];
    }

    #[DataProvider('telefonos')]
    public function test_normaliza_y_valida_telefono(string $entrada, bool $valido, string $normalizado): void
    {
        $t = Identidad::normalizarTelefono($entrada);

        $this->assertSame($normalizado, $t);
        $this->assertSame($valido, Identidad::telefonoValido($t));
    }

    public function test_digito_verificador_k(): void
    {
        $this->assertSame('K', Identidad::digitoVerificador('4521817'));
    }

    public function test_mes_de_guatemala_como_rango_utc(): void
    {
        $mes = MesGuatemala::desde('2026-10');

        $this->assertSame('2026-10-01 06:00:00', $mes->inicioUtc->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-01 06:00:00', $mes->finUtc->format('Y-m-d H:i:s'));
        $this->assertSame('UTC', $mes->inicioUtc->getTimezone()->getName());
    }

    public function test_mes_invalido(): void
    {
        $this->assertNull(MesGuatemala::desde('2026-13'));
        $this->assertNull(MesGuatemala::desde('octubre'));
    }
}
