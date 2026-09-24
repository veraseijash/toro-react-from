export const IMAGES_BASE_URL = 'http://localhost:3000/images';

export const MENU_ITEMS = [
  { to: '/', label: 'Inicio', icon: 'ico-home6', permission: '', end: true },
  {
    to: '/historia',
    label: 'Historia',
    icon: 'ico-clipboard-clock',
    permission: 'history',
    collapseOnClick: true,
  },
  {
    id: 'cuenta',
    label: 'Mi cuenta',
    icon: 'ico-user4',
    children: [
      { to: '/login', label: 'Iniciar sesión', permission: '' },
      { to: '/content', label: 'Mi contenido', permission: '' },
    ],
  },
  {
    id: 'setting',
    label: 'Configuración',
    icon: 'ico-equalizer',
    children: [
      {
        to: '/configuracion/examenes',
        label: 'Lista de exámenes',
        permission: 'setting-exams',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/ordenar',
        label: 'Ordenar exámenes',
        permission: 'order-exams',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/routines',
        label: 'Rutinas de exámenes',
        permission: 'routines-exams',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/antibiotics',
        label: 'Lista de antibióticos',
        permission: 'antibiotics-exams',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/germs',
        label: 'Lista de gérmenes',
        permission: 'germs-exams',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/parasiticforms',
        label: 'Lista de forma parasitaria',
        permission: 'parasiticforms-exams',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/group-worksheet',
        label: 'Grupos hoja de trabajo',
        permission: 'group-worksheet',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/special-tests',
        label: 'Pruebas especiales',
        permission: 'special-tests',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/payment-methods',
        label: 'Forma de pagos',
        permission: 'payment-methods',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/registered-users',
        label: 'Usuarios registrados',
        permission: 'registered-users',
        collapseOnClick: true,
      },
      {
        to: '/configuracion/laboratory',
        label: 'Laboratorio',
        permission: 'laboratory',
        collapseOnClick: true,
      },
    ],
  },
];
