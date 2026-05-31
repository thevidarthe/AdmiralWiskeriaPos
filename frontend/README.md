# Admiral Pro · Frontend (Next.js)

PWA premium con Tailwind y animaciones fluidas.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS con tema navy + gold premium
- Zustand para state local (auth + POS)
- Framer Motion para animaciones cinemáticas
- next-pwa (Service Worker + manifest)
- Axios + interceptores JWT

## Setup

```bash
npm install
cp .env.example .env.local
# Editar NEXT_PUBLIC_API_URL si tu backend Go corre en otra URL

npm run dev
# → http://localhost:3000
```

## Estructura

```
src/
├── app/                       Next.js App Router
│   ├── layout.tsx             Root layout (PWA, fonts, toaster)
│   ├── page.tsx               Redirige a /login
│   ├── login/                 Pantalla de selección + PIN
│   ├── (admin)/               Grupo: layout protegido del admin
│   │   ├── layout.tsx
│   │   └── admin/
│   │       ├── page.tsx              Dashboard con KPIs
│   │       ├── productos/page.tsx    CRUD productos
│   │       ├── categorias/page.tsx
│   │       ├── inventario/page.tsx   Stock + import Excel
│   │       ├── promociones/page.tsx
│   │       ├── reportes/page.tsx     Cierre diario + export
│   │       ├── usuarios/page.tsx
│   │       ├── clientes/page.tsx     CRM
│   │       ├── qr/page.tsx           QR de mesas
│   │       └── configuracion/page.tsx
│   ├── pos/page.tsx           POS de barra con cobros
│   ├── mesero/page.tsx        Panel de mesas activas
│   └── qr/[token]/page.tsx    Página pública del cliente
├── components/ui/             Logo, Sidebar, KpiCard, etc.
├── lib/                       api.ts (cliente HTTP), utils
├── store/                     Zustand stores (auth, pos)
└── styles/globals.css         Tema + clases utilitarias
```

## Páginas y roles

| Ruta             | Roles permitidos                  | Descripción                    |
| ---------------- | --------------------------------- | ------------------------------ |
| `/login`         | público                           | Selector de usuario + PIN      |
| `/admin/*`       | ADMIN, MANAGER                    | Panel completo de gestión      |
| `/pos`           | ADMIN, MANAGER, BARISTA, CASHIER  | POS de barra con cobros        |
| `/mesero`        | ADMIN, MANAGER, WAITER            | Panel de mesas en tiempo real  |
| `/qr/[token]`    | público                           | Menú del cliente desde QR      |

## Diseño premium

Paleta navy + gold + glassmorphism:
- `bg-admiral-night` (#070D1C) — fondo principal
- `text-admiral-gold` (#E8C96A) — acentos
- `bg-gold-shine` — gradiente dorado para botones premium
- `glass`, `glass-strong` — superficies con backdrop-blur
- `card-premium` — tarjetas con hairline dorado y sombras internas

Animaciones:
- `framer-motion` para transiciones de página, modales, listas
- `animate-rise`, `animate-glow`, `animate-shimmer` (Tailwind keyframes)
- Loading states con `<Skeleton />` (no spinners)

## Build de producción

```bash
npm run build
npm start
```

Si tu backend Go corre en otra URL en producción:
```bash
NEXT_PUBLIC_API_URL=https://admiral-api.railway.app/api/v1 npm run build
```
