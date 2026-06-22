/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          primary:   '#2563EB',
          dark:      '#0F172A',
          success:   '#10B981',
          warning:   '#F59E0B',
          danger:    '#EF4444',
          bg:        '#F3F4F6',
          surface:   '#F8FAFC',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  // Safelist para clases dinámicas usadas en [ngClass]
  safelist: [
    // Badge: prioridad
    'bg-red-100', 'text-red-700', 'border-red-200',
    'bg-amber-100', 'text-amber-700', 'border-amber-200',
    'bg-slate-100', 'text-slate-600', 'border-slate-200',
    // Badge: estado
    'bg-emerald-100', 'text-emerald-700',
    'bg-red-100', 'text-red-600',
    // Carga de técnicos
    'bg-red-400', 'bg-amber-400', 'bg-emerald-400',
    // SLA bars
    'bg-red-500', 'bg-emerald-500',
    // Tendencias
    'text-emerald-500', 'text-red-500', 'text-emerald-600',
    // Rol badges (admin-usuarios)
    'bg-purple-100', 'text-purple-700', 'bg-purple-500',
    'bg-blue-100', 'text-blue-700', 'bg-blue-500',
    'bg-emerald-500',
    // Notificaciones
    'bg-blue-500', 'bg-amber-500',
    // General
    'trend-up', 'trend-down',
    'nav-active',
  ],
  plugins: [],
}

