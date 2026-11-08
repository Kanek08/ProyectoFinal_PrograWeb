<?php

namespace Database\Seeders;

use Database\Seeders\Concerns\InsertaHistorial;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Semilla de verificación: carga EXACTAMENTE los datos de la sección 11 del enunciado.
 * Las cifras de control y las pruebas del catedrático dependen de ella: no se modifica.
 * Todas las fechas están en UTC. La contraseña pública de todas las cuentas es Ventas2026.
 */
class VerificacionSeeder extends Seeder
{
    use InsertaHistorial;

    private const CLAVE_PUBLICA = 'Ventas2026';

    /** Fecha de referencia del último registro de historial de las oportunidades abiertas. */
    private const REFERENCIA_ABIERTAS = '2026-10-02 16:00';

    public function run(): void
    {
        DB::transaction(function () {
            $u = $this->cuentas();
            $p = $this->productos();
            $c = $this->clientes($u);
            $this->oportunidades($u, $c, $p);
            $this->actividades($u, $c);
        });
    }

    /** @return array<string, int> id por clave corta */
    private function cuentas(): array
    {
        $hash = Hash::make(self::CLAVE_PUBLICA);
        $ahora = $this->utc('2026-09-01 15:00');
        $ids = [];

        $filas = [
            // clave, nombre, correo, rol, supervisor, activa
            ['alicia', 'Alicia Morales', 'admin@crm.test', 'administrador', null, true],
            ['sergio', 'Sergio Ruiz', 'sergio@crm.test', 'supervisor', null, true],
            ['sandra', 'Sandra Pérez', 'sandra@crm.test', 'supervisor', null, true],
            ['valeria', 'Valeria López', 'valeria@crm.test', 'vendedor', 'sergio', true],
            ['diego', 'Diego Castillo', 'diego@crm.test', 'vendedor', 'sergio', true],
            ['carlos', 'Carlos Ajú', 'carlos@crm.test', 'vendedor', 'sandra', true],
            ['ivan', 'Iván Toj', 'ivan@crm.test', 'vendedor', 'sandra', false],
        ];

        foreach ($filas as [$clave, $nombre, $correo, $rol, $supervisor, $activa]) {
            $ids[$clave] = DB::table('users')->insertGetId([
                'name' => $nombre,
                'email' => $correo,
                'password' => $hash,
                'rol' => $rol,
                'supervisor_id' => $supervisor ? $ids[$supervisor] : null,
                'activo' => $activa,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }

        return $ids;
    }

    /** @return array<string, int> */
    private function productos(): array
    {
        $ahora = $this->utc('2026-09-01 15:00');
        $ids = [];

        $filas = [
            ['Plan básico', '1200.00', true],
            ['Plan avanzado', '2750.50', true],
            ['Instalación', '450.00', true],
            ['Soporte anual', '3600.00', true],
            ['Licencia anterior', '999.99', false],
        ];

        foreach ($filas as [$nombre, $precio, $activo]) {
            $ids[$nombre] = DB::table('productos')->insertGetId([
                'nombre' => $nombre,
                'precio' => $precio,
                'categoria' => null, // la capa de sector no aplica a la semilla de verificación
                'activo' => $activo,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }

        return $ids;
    }

    /** @return array<string, int> */
    private function clientes(array $u): array
    {
        $ahora = $this->utc('2026-09-01 15:00');
        $ids = [];

        $filas = [
            // vendedor, nombre, nit (null = CF), teléfono, correo
            ['valeria', 'Comercial El Quetzal', '4521817K', '55551234', 'compras@elquetzal.test'],
            ['valeria', 'Ferretería Xela', '98765434', '77612345', null],
            ['valeria', 'María Coyoy', null, '41234567', null],
            ['diego', 'Farmacia Los Altos', '34567895', '77634567', 'gerencia@losaltos.test'],
            ['diego', 'Luis Tzul', null, '52345678', null],
            ['carlos', 'Abarrotes San Juan', '12345679', '77651001', null],
            ['carlos', 'Panadería La Esperanza', null, '30001002', null],
            ['carlos', 'Taller El Volcán', '22233342', '77651003', null],
            ['carlos', 'Ana Xicará', null, '30001004', null],
            ['carlos', 'Librería Cantel', '55566677', '77651005', null],
            ['carlos', 'Pedro Batz', null, '30001006', null],
            ['carlos', 'Tienda La Bendición', null, '30001007', null],
            ['carlos', 'Distribuidora Occidente', '77788893', '77651008', null],
            ['carlos', 'Rosa Tax', null, '30001009', null],
            ['ivan', 'Hotel Los Pinos', '66655544', '77661001', null],
            [null, 'Agencia Cuatro Caminos', null, '30002001', null],
            [null, 'Café Zunil', null, '30002002', null],
            [null, 'Clínica San Rafael', '8889990K', '77672003', null],
            [null, 'Constructora Altiplano', '44433328', '77672004', null],
            [null, 'Escuela Futuro', null, '30002005', null],
            [null, 'Gimnasio Fuerza', null, '30002006', null],
        ];

        foreach ($filas as [$vendedor, $nombre, $nit, $telefono, $correo]) {
            $ids[$nombre] = DB::table('clientes')->insertGetId([
                'vendedor_id' => $vendedor ? $u[$vendedor] : null,
                'nombre' => $nombre,
                'nit' => $nit,
                'telefono' => $telefono,
                'correo' => $correo,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }

        return $ids;
    }

    private function oportunidades(array $u, array $c, array $p): void
    {
        $ref = $this->utc(self::REFERENCIA_ABIERTAS);

        // Valeria
        $this->insertarOportunidad($c['Comercial El Quetzal'], $u['valeria'], 'Renovación de planes',
            $this->recorrido('ganada'), $this->utc('2026-10-05 16:00'),
            [[$p['Plan avanzado'], 2, '2600.00'], [$p['Instalación'], 1, '450.00']]);

        $this->insertarOportunidad($c['Ferretería Xela'], $u['valeria'], 'Equipo para sucursal',
            $this->recorrido('ganada'), $this->utc('2026-11-01 03:30'),
            [[$p['Plan básico'], 3, '1200.00']]);

        $this->insertarOportunidad($c['María Coyoy'], $u['valeria'], 'Soporte del hogar',
            $this->recorrido('ganada'), $this->utc('2026-11-01 06:30'),
            [[$p['Soporte anual'], 1, '3600.00']]);

        $this->insertarOportunidad($c['Comercial El Quetzal'], $u['valeria'], 'Ampliación a bodega',
            $this->recorrido('negociacion'), $ref,
            [[$p['Plan avanzado'], 1, '2750.50']]);

        $this->insertarOportunidad($c['Ferretería Xela'], $u['valeria'], 'Capacitación de personal',
            $this->recorrido('propuesta'), $ref,
            [[$p['Instalación'], 2, '450.00']]);

        $this->insertarOportunidad($c['María Coyoy'], $u['valeria'], 'Plan familiar',
            $this->recorrido('perdida', 'propuesta'), $this->utc('2026-10-20 18:00'),
            [[$p['Plan básico'], 1, '1200.00'], [$p['Licencia anterior'], 1, '999.99']],
            'Eligió a la competencia');

        $this->insertarOportunidad($c['Comercial El Quetzal'], $u['valeria'], 'Seguimiento anual',
            $this->recorrido('prospecto'), $ref, []);

        // Diego
        $this->insertarOportunidad($c['Farmacia Los Altos'], $u['diego'], 'Licencias de caja',
            $this->recorrido('ganada'), $this->utc('2026-10-10 15:00'),
            [[$p['Plan básico'], 2, '1200.00'], [$p['Soporte anual'], 1, '3600.00']]);

        $this->insertarOportunidad($c['Luis Tzul'], $u['diego'], 'Mantenimiento',
            $this->recorrido('calificado'), $ref,
            [[$p['Instalación'], 1, '450.00']]);

        // Carlos
        $this->insertarOportunidad($c['Abarrotes San Juan'], $u['carlos'], 'Plan anual',
            $this->recorrido('ganada'), $this->utc('2026-10-15 20:00'),
            [[$p['Soporte anual'], 2, '3600.00']]);

        $this->insertarOportunidad($c['Taller El Volcán'], $u['carlos'], 'Cotización de equipo',
            $this->recorrido('negociacion'), $ref,
            [[$p['Plan avanzado'], 2, '2750.50']]);
    }

    private function actividades(array $u, array $c): void
    {
        $filas = [
            ['Comercial El Quetzal', 'valeria', 'llamada', 'Confirmar fecha de instalación', '2026-10-08 15:00', true],
            ['Ferretería Xela', 'valeria', 'tarea', 'Enviar propuesta de capacitación', '2030-01-15 15:00', false],
            ['María Coyoy', 'valeria', 'reunion', 'Presentar opciones de soporte', '2026-09-01 15:00', false],
            ['Farmacia Los Altos', 'diego', 'llamada', 'Renovación de licencias', '2030-02-01 15:00', false],
        ];

        $ahora = $this->utc('2026-09-01 15:00');

        foreach ($filas as [$cliente, $vendedor, $tipo, $descripcion, $vence, $completada]) {
            DB::table('actividades')->insert([
                'cliente_id' => $c[$cliente],
                'vendedor_id' => $u[$vendedor],
                'tipo' => $tipo,
                'descripcion' => $descripcion,
                'vence_en' => $this->utc($vence),
                'completada' => $completada,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }
    }
}
