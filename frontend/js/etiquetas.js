/**
 * Vocabulario del sector (especificación 1.2). Es el mismo de laravel/lang/es/crm.php:
 * solo cambian los textos en pantalla; la API sigue usando los nombres del núcleo.
 */
export const EMPRESA = 'CompuPartes Xela';

export const ETAPAS = {
  prospecto: 'Interesado',
  calificado: 'Necesidad identificada',
  propuesta: 'Cotización enviada',
  negociacion: 'Negociación',
  ganada: 'Venta cerrada',
  perdida: 'Perdida',
};

export const ABIERTAS = ['prospecto', 'calificado', 'propuesta', 'negociacion'];
export const CERRADAS = ['ganada', 'perdida'];

/** Transiciones permitidas (decisión D1). La API es quien manda; aquí solo se eligen los botones. */
export const TRANSICIONES = {
  prospecto: ['calificado', 'perdida'],
  calificado: ['propuesta', 'prospecto', 'perdida'],
  propuesta: ['negociacion', 'calificado', 'perdida'],
  negociacion: ['ganada', 'propuesta', 'perdida'],
  ganada: [],
  perdida: [],
};

export const TIPOS_ACTIVIDAD = {
  llamada: 'Llamada',
  reunion: 'Visita o demostración',
  tarea: 'Tarea',
};

export const CATEGORIAS = {
  equipo: 'Equipo',
  pieza: 'Pieza',
  periferico: 'Periférico',
  software: 'Software',
  garantia: 'Garantía',
  servicio: 'Servicio',
};

export const MAXIMO_CARTERA = 10;
