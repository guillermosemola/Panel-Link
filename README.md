# Simulador Financiero · Constructora

Plataforma web colaborativa para gestión financiera de proyectos de construcción.
Cada sector (Obra, Técnica, Comercial, Finanzas) carga sus propios datos con permisos aislados.

---

## PASO 1 — Supabase: crear la base de datos

1. Ir a https://supabase.com y loguearse
2. Clic en **New project** → ponerle nombre (ej: "constructora") → elegir región más cercana → crear
3. Esperar ~2 minutos hasta que el proyecto esté listo
4. Ir al menú lateral → **SQL Editor** → New query
5. Copiar y pegar el archivo `supabase_constructora.sql` completo → clic en **Run**
6. Verificar que aparecen las tablas en **Table Editor**

## PASO 2 — Supabase: obtener las claves

1. Menú lateral → **Settings** → **API**
2. Copiar:
   - **Project URL** → es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## PASO 3 — GitHub: subir el proyecto

1. Crear cuenta en https://github.com (si no tienen)
2. Crear un repositorio nuevo → nombre: `constructora-simulador` → Public
3. Subir todos los archivos de esta carpeta al repositorio
   (usar el botón "uploading an existing file" en GitHub, o git desde terminal)

## PASO 4 — Vercel: hacer el deploy

1. Ir a https://vercel.com → Sign up con la cuenta de GitHub
2. Clic en **Add New Project** → importar el repositorio `constructora-simulador`
3. Antes de hacer Deploy, ir a **Environment Variables** y agregar:
   - `NEXT_PUBLIC_SUPABASE_URL` → pegar la URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → pegar la anon key
4. Clic en **Deploy** → en ~2 minutos tienen la URL pública

## PASO 5 — Crear el primer usuario (Finanzas / Admin)

1. En Supabase → **Authentication** → **Users** → **Invite user**
2. Ingresar el email del responsable de Finanzas
3. Esa persona recibe un email con link para establecer contraseña
4. Luego, en **SQL Editor**, ejecutar:

```sql
-- Reemplazar el UUID con el id del usuario recién creado
-- (se ve en Authentication → Users)
INSERT INTO usuarios (id, empresa_id, email, nombre_completo, sector, rol)
VALUES (
  'UUID-DEL-USUARIO',
  '00000000-0000-0000-0000-000000000001',
  'finanzas@tuempresa.com',
  'Nombre Apellido',
  'finanzas',
  'admin'
);
```

## PASO 6 — Agregar usuarios de otros sectores

Repetir el Paso 5 para cada usuario, cambiando el valor de `sector`:
- `'obra'` para el responsable de obra
- `'tecnica'` para el área técnica  
- `'comercial'` para el equipo de ventas

---

## Estructura del proyecto

```
constructora/
├── app/
│   ├── layout.js          → estructura HTML base
│   ├── page.js            → redirige a /login
│   ├── globals.css
│   ├── login/page.js      → pantalla de ingreso
│   ├── dashboard/page.js  → listado de proyectos
│   └── proyecto/
│       ├── nuevo/page.js        → crear proyecto (solo Finanzas)
│       └── [id]/page.js         → simulador del proyecto
├── components/
│   ├── SimuladorPanel.js  → sliders de inputs por sector
│   └── GraficosPanel.js   → KPIs + gráficos interactivos
├── lib/
│   ├── supabase.js        → cliente de base de datos
│   └── simulador.js       → motor de cálculo financiero
├── .env.local.example     → variables de entorno (completar)
└── package.json
```

## Permisos por sector

| Sector    | Puede editar                                      |
|-----------|---------------------------------------------------|
| Finanzas  | Todo (precio terreno, capital propio) + ver todo  |
| Obra      | Costo directo, indirectos, contingencias          |
| Técnica   | m² totales, eficiencia, plazo de obra             |
| Comercial | Precio de mercado, ritmo de ventas                |

Los gráficos y KPIs son visibles para todos los sectores en tiempo real.
