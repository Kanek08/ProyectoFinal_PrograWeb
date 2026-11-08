<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** «Mi perfil»: nombre y contraseña. Las cuentas no se borran (L2). */
class ProfileController extends Controller
{
    public function edit(Request $request): View
    {
        return view('profile.edit', ['user' => $request->user()]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->update(['name' => $request->validated('name')]);

        return redirect()->route('profile.edit')->with('status', 'profile-updated');
    }
}
