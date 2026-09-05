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
    ],
  },
];
