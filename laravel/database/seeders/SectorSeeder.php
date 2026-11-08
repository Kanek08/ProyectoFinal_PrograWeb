<?php

namespace Database\Seeders;

use App\Support\Identidad;
use Database\Seeders\Concerns\InsertaHistorial;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Semilla del sector: CompuPartes Xela (computadoras y piezas, Quetzaltenango).
 * Corre DESPUÉS de VerificacionSeeder y no repite sus correos, NIT ni teléfonos
 * (correos @compupartes.test, teléfonos 4800xxxx, NIT calculados con módulo 11),
 * ni pasa de 10 clientes por vendedor. El equipo propio no se mezcla con los de la verificación.
 * Precios de referencia en quetzales del mercado guatemalteco (noviembre de 2026).
 */
class SectorSeeder extends Seeder
{
    use InsertaHistorial;

    private const CLAVE_PUBLICA = 'Ventas2026';

    private int $telefono = 48000001;

    public function run(): void
    {
        DB::transaction(function () {
            $u = $this->cuentas();
            $p = $this->catalogo();
            $c = $this->clientes($u);
            $this->cotizaciones($u, $c, $p);
            $this->seguimientos($u, $c);
        });
    }

    /** @return array<string, int> */
    private function cuentas(): array
    {
        $hash = Hash::make(self::CLAVE_PUBLICA);
        $ahora = $this->utc('2026-09-15 15:00');
        $ids = [];

        $filas = [
            ['monica', 'Mónica Barrios', 'monica@compupartes.test', 'supervisor', null],
            ['andres', 'Andrés Cifuentes', 'andres@compupartes.test', 'vendedor', 'monica'],
            ['lucia', 'Lucía Ordóñez', 'lucia@compupartes.test', 'vendedor', 'monica'],
            ['kevin', 'Kevin Sic', 'kevin@compupartes.test', 'vendedor', 'monica'],
        ];

        foreach ($filas as [$clave, $nombre, $correo, $rol, $supervisor]) {
            $ids[$clave] = DB::table('users')->insertGetId([
                'name' => $nombre,
                'email' => $correo,
                'password' => $hash,
                'rol' => $rol,
                'supervisor_id' => $supervisor ? $ids[$supervisor] : null,
                'activo' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }

        return $ids;
    }

    /** @return array<string, int> id por clave corta */
    private function catalogo(): array
    {
        $ahora = $this->utc('2026-09-15 15:00');
        $ids = [];

        $filas = [
            // clave, nombre, categoría, precio
            ['lenovo', 'Laptop Lenovo IdeaPad Slim 3 (Ryzen 5, 16 GB, SSD 512 GB)', 'equipo', '5499.00'],
            ['hp15', 'Laptop HP 15 (Core i5, 8 GB, SSD 512 GB)', 'equipo', '4899.00'],
            ['acer', 'Laptop Acer Aspire 5 (Core i7, 16 GB, SSD 512 GB)', 'equipo', '7250.00'],
            ['asus', 'Laptop ASUS TUF Gaming A15 (Ryzen 7, RTX 4050)', 'equipo', '9999.00'],
            ['pcoficina', 'PC de escritorio armada (Ryzen 5, 16 GB, SSD 1 TB)', 'equipo', '6350.00'],
            ['pcgamer', 'PC gamer armada (Ryzen 7, RTX 4060, 32 GB)', 'equipo', '12500.00'],
            ['aio', 'All-in-one HP 24" (Core i5, 16 GB)', 'equipo', '7800.00'],

            ['r5', 'Procesador AMD Ryzen 5 7600', 'pieza', '1750.00'],
            ['i5', 'Procesador Intel Core i5-14400F', 'pieza', '1850.00'],
            ['rtx4060', 'Tarjeta de video NVIDIA GeForce RTX 4060 8 GB', 'pieza', '2950.00'],
            ['rx7600', 'Tarjeta de video AMD Radeon RX 7600 8 GB', 'pieza', '2450.00'],
            ['ddr5', 'Memoria RAM DDR5 16 GB (2 × 8 GB)', 'pieza', '575.00'],
            ['ddr4', 'Memoria RAM DDR4 8 GB', 'pieza', '240.00'],
            ['ssd', 'SSD NVMe Kingston 1 TB', 'pieza', '620.00'],
            ['hdd', 'Disco duro Seagate 2 TB', 'pieza', '560.00'],
            ['fuente', 'Fuente de poder 650 W 80 Plus Bronze', 'pieza', '520.00'],
            ['b650', 'Tarjeta madre B650M (AM5)', 'pieza', '1350.00'],
            ['gabinete', 'Gabinete ATX con 3 ventiladores', 'pieza', '480.00'],

            ['mon24', 'Monitor Samsung 24" Full HD', 'periferico', '1150.00'],
            ['mon27', 'Monitor LG 27" QHD 165 Hz', 'periferico', '2600.00'],
            ['combo', 'Combo teclado y mouse inalámbrico Logitech', 'periferico', '295.00'],
            ['mecanico', 'Teclado mecánico Redragon', 'periferico', '385.00'],
            ['ups', 'UPS APC 750 VA', 'periferico', '850.00'],

            ['win', 'Windows 11 Pro (licencia OEM)', 'software', '1350.00'],
            ['m365', 'Microsoft 365 Personal (1 año)', 'software', '590.00'],
            ['eset', 'Antivirus ESET (1 año)', 'software', '260.00'],

            ['gar1', 'Garantía extendida 1 año (por equipo)', 'garantia', '650.00'],
            ['gar2', 'Garantía extendida 2 años (por equipo)', 'garantia', '1100.00'],

            ['armado', 'Armado de PC y pruebas de estrés', 'servicio', '350.00'],
            ['sistema', 'Instalación de sistema operativo y programas', 'servicio', '200.00'],
            ['mantenimiento', 'Mantenimiento preventivo', 'servicio', '300.00'],
        ];

        foreach ($filas as [$clave, $nombre, $categoria, $precio]) {
            $ids[$clave] = DB::table('productos')->insertGetId([
                'nombre' => $nombre,
                'precio' => $precio,
                'categoria' => $categoria,
                'activo' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }

        // Un producto descontinuado: no se puede agregar a cotizaciones nuevas.
        $ids['gtx'] = DB::table('productos')->insertGetId([
            'nombre' => 'Tarjeta de video NVIDIA GTX 1650 4 GB',
            'precio' => '1450.00',
            'categoria' => 'pieza',
            'activo' => false,
            'created_at' => $ahora,
            'updated_at' => $ahora,
        ]);

        return $ids;
    }

    /** @return array<string, int> */
    private function clientes(array $u): array
    {
        $ahora = $this->utc('2026-09-20 15:00');
        $ids = [];

        $filas = [
            // vendedor, nombre, cuerpo del NIT (null = CF), correo
            ['andres', 'Colegio Liceo Xelajú', '8104523', 'direccion@liceoxelaju.test'],
            ['andres', 'Café Internet La Red', '2290817', 'lared@cafeinternet.test'],
            ['andres', 'Bufete Méndez & Asociados', '6630451', 'contacto@bufetemendez.test'],
            ['andres', 'Estudio Fotográfico Luz', '1957320', null],
            ['andres', 'Jorge Tzoc', null, null],
            ['lucia', 'Academia de Computación Futura', '4410287', 'info@academiafutura.test'],
            ['lucia', 'Contabilidad Integral Xela', '3026719', 'oficina@contaxela.test'],
            ['lucia', 'Gamer Zone Xela', '7781104', 'gamerzone@xela.test'],
            ['lucia', 'Daniela Pérez', null, null],
            ['lucia', 'Óscar Ixcoy', null, null],
            ['kevin', 'Constructora Los Cuchumatanes', '9035512', 'compras@cuchumatanes.test'],
            ['kevin', 'Clínica Dental Sonrisa', '5562098', null],
            ['kevin', 'Pablo Chávez', null, null],
            ['kevin', 'Rodrigo Escobar', null, null],
            [null, 'Hostal Casa Verde', '1203384', null],
            [null, 'Mariela Santizo', null, null],
        ];

        foreach ($filas as [$vendedor, $nombre, $cuerpoNit, $correo]) {
            $ids[$nombre] = DB::table('clientes')->insertGetId([
                'vendedor_id' => $vendedor ? $u[$vendedor] : null,
                'nombre' => $nombre,
                'nit' => $cuerpoNit ? $cuerpoNit.Identidad::digitoVerificador($cuerpoNit) : null,
                'telefono' => (string) $this->telefono++,
                'correo' => $correo,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }

        return $ids;
    }

    private function cotizaciones(array $u, array $c, array $p): void
    {
        $precio = fn (string $clave) => DB::table('productos')->where('id', $p[$clave])->value('precio');
        $l = fn (string $clave, int $cantidad, ?string $cotizado = null) => [$p[$clave], $cantidad, $cotizado ?? $precio($clave)];

        // Andrés Cifuentes
        $this->insertarOportunidad($c['Colegio Liceo Xelajú'], $u['andres'], 'Laboratorio de cómputo 2027',
            $this->recorrido('ganada'), $this->utc('2026-10-22 17:00'),
            [$l('pcoficina', 10), $l('gar1', 10), $l('win', 10)]);

        // Cumple RS-1 a medias: 4 equipos y 2 garantías. Sirve para probar el rechazo (409) al ganarla.
        $this->insertarOportunidad($c['Café Internet La Red'], $u['andres'], 'Renovación de PCs del café',
            $this->recorrido('negociacion'), $this->utc('2026-11-04 16:00'),
            [$l('pcgamer', 4), $l('gar1', 2), $l('mon27', 4)]);

        $this->insertarOportunidad($c['Bufete Méndez & Asociados'], $u['andres'], 'Laptops para abogados',
            $this->recorrido('propuesta'), $this->utc('2026-11-03 16:00'),
            [$l('hp15', 3), $l('gar2', 3), $l('m365', 3)]);

        $this->insertarOportunidad($c['Estudio Fotográfico Luz'], $u['andres'], 'Disco y memoria para edición',
            $this->recorrido('ganada'), $this->utc('2026-11-03 18:00'),
            [$l('ssd', 2), $l('ddr5', 2), $l('sistema', 1)]);

        $this->insertarOportunidad($c['Jorge Tzoc'], $u['andres'], 'Laptop para la universidad',
            $this->recorrido('perdida', 'calificado'), $this->utc('2026-10-28 16:00'),
            [$l('lenovo', 1)], 'Encontró un precio más bajo en otra tienda');

        // Lucía Ordóñez
        $this->insertarOportunidad($c['Academia de Computación Futura'], $u['lucia'], 'Equipo para aula de diseño',
            $this->recorrido('calificado'), $this->utc('2026-11-05 16:00'),
            [$l('asus', 5)]);

        $this->insertarOportunidad($c['Contabilidad Integral Xela'], $u['lucia'], 'Computadoras para contadores',
            $this->recorrido('ganada'), $this->utc('2026-10-30 22:00'),
            [$l('aio', 3), $l('gar2', 3), $l('eset', 3)]);

        // La tarjeta se cotizó a Q3,100.00; hoy el catálogo la tiene a Q2,950.00 y la línea conserva su precio.
        $this->insertarOportunidad($c['Gamer Zone Xela'], $u['lucia'], 'Mejora de tarjetas de video',
            $this->recorrido('negociacion'), $this->utc('2026-11-06 16:00'),
            [$l('rtx4060', 6, '3100.00'), $l('fuente', 6), $l('armado', 6)]);

        $this->insertarOportunidad($c['Daniela Pérez'], $u['lucia'], 'Armado de PC gamer',
            $this->recorrido('prospecto'), $this->utc('2026-11-06 16:00'), []);

        $this->insertarOportunidad($c['Óscar Ixcoy'], $u['lucia'], 'Monitor y teclado',
            $this->recorrido('ganada'), $this->utc('2026-11-05 15:00'),
            [$l('mon24', 1), $l('mecanico', 1)]);

        // Kevin Sic
        $this->insertarOportunidad($c['Constructora Los Cuchumatanes'], $u['kevin'], 'Laptops para residentes de obra',
            $this->recorrido('propuesta'), $this->utc('2026-11-02 16:00'),
            [$l('acer', 4), $l('gar1', 4), $l('ups', 4)]);

        $this->insertarOportunidad($c['Clínica Dental Sonrisa'], $u['kevin'], 'Computadora de recepción',
            $this->recorrido('ganada'), $this->utc('2026-10-12 16:00'),
            [$l('pcoficina', 1), $l('gar1', 1), $l('mon24', 1)]);

        $this->insertarOportunidad($c['Pablo Chávez'], $u['kevin'], 'PC para streaming',
            $this->recorrido('perdida'), $this->utc('2026-11-02 20:00'),
            [$l('pcgamer', 1), $l('gar2', 1)], 'Decidió esperar las ofertas de fin de año');

        $this->insertarOportunidad($c['Rodrigo Escobar'], $u['kevin'], 'Mantenimiento de laptop',
            $this->recorrido('prospecto'), $this->utc('2026-11-07 16:00'),
            [$l('mantenimiento', 1)]);
    }

    private function seguimientos(array $u, array $c): void
    {
        $ahora = $this->utc('2026-10-01 15:00');

        $filas = [
            ['Café Internet La Red', 'andres', 'reunion', 'Demostración de la PC gamer armada en la tienda', '2026-11-12 16:00', false],
            ['Café Internet La Red', 'andres', 'tarea', 'Agregar garantías faltantes a la cotización', '2026-11-06 22:00', false],
            ['Colegio Liceo Xelajú', 'andres', 'llamada', 'Coordinar fecha de entrega del laboratorio', '2026-10-25 15:00', true],
            ['Bufete Méndez & Asociados', 'andres', 'llamada', 'Confirmar si prefieren Office o Microsoft 365', '2026-11-10 15:00', false],
            ['Gamer Zone Xela', 'lucia', 'reunion', 'Revisar fuentes de poder de las PCs actuales', '2026-11-09 17:00', false],
            ['Academia de Computación Futura', 'lucia', 'tarea', 'Enviar fichas técnicas de la ASUS TUF', '2026-11-04 15:00', false],
            ['Contabilidad Integral Xela', 'lucia', 'llamada', 'Llamada de satisfacción después de la entrega', '2026-11-06 15:00', true],
            ['Constructora Los Cuchumatanes', 'kevin', 'reunion', 'Visita a la oficina para revisar instalación eléctrica (UPS)', '2026-11-11 15:00', false],
            ['Rodrigo Escobar', 'kevin', 'tarea', 'Diagnóstico de la laptop antes del mantenimiento', null, false],
        ];

        foreach ($filas as [$cliente, $vendedor, $tipo, $descripcion, $vence, $completada]) {
            DB::table('actividades')->insert([
                'cliente_id' => $c[$cliente],
                'vendedor_id' => $u[$vendedor],
                'tipo' => $tipo,
                'descripcion' => $descripcion,
                'vence_en' => $vence ? $this->utc($vence) : null,
                'completada' => $completada,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }
    }
}
