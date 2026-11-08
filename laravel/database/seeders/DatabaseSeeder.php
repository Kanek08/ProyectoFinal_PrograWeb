<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * php artisan migrate:fresh --seed                        → verificación + sector
     * php artisan migrate:fresh --seeder=VerificacionSeeder   → solo verificación (defensa)
     */
    public function run(): void
    {
        $this->call([
            VerificacionSeeder::class,
            SectorSeeder::class,
        ]);
    }
}
