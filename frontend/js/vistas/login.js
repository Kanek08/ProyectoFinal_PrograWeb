/**
 * F1 · Inicio de sesión. Si la cuenta no es de asesor, se muestra el mensaje del 403.
 */
import { estado, guardarToken, render } from '../estado.js';
import { api } from '../api.js';
import { html } from '../utilidades.js';
import { campo, errorGeneral, aplicarError } from '../formularios.js';

export function vista() {
  const form = estado.login;
  return html`
    <div class="login mx-auto mt-4">
      <h1 class="h4 mb-1">Aplicación de ventas</h1>
      <p class="text-secondary">Ingrese con su cuenta de asesor de ventas.</p>
      <form class="card card-body shadow-sm" data-form="login" novalidate>
        ${errorGeneral(form.error)}
        ${campo({ nombre: 'correo', etiqueta: 'Correo', form, tipo: 'email', atributos: 'autocomplete="username" required' })}
        ${campo({ nombre: 'clave', etiqueta: 'Contraseña', form: { errores: form.errores }, tipo: 'password', atributos: 'autocomplete="current-password" required' })}
        <button class="btn btn-success w-100" type="submit">Iniciar sesión</button>
      </form>
    </div>`;
}

export const formularios = {
  async login(datos) {
    const form = estado.login;
    form.valores = { correo: datos.correo }; // la contraseña nunca se conserva
    try {
      const { token, usuario } = await api.post('/auth/login', { correo: datos.correo, clave: datos.clave });
      guardarToken(token);
      estado.usuario = usuario;
      estado.login = { valores: {}, errores: {}, error: null };
      estado.aviso = null;
      location.hash = '#/cartera';
    } catch (e) {
      aplicarError(form, e);
      estado.aviso = null;
      render();
    }
  },
};
