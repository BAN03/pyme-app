# Pyme App

Aplicación móvil **offline-first** para pequeños emprendimientos y jóvenes que quieren ordenar su
negocio sin un punto de venta: insumos, gastos, productos más vendidos, clientes (CRM) y métricas
visuales de ingresos y egresos.

Hecha con **Expo SDK 58**, **React Native 0.88**, **TypeScript** y **SQLite** local.

## Funcionalidad

- **Inicio (métricas)**: ingresos, egresos, utilidad, margen, ticket promedio, gráfica de 6 meses,
  productos más vendidos y alertas de stock bajo. Selector de mes.
- **Movimientos**: ventas y gastos del mes, con totales y eliminación (las ventas devuelven stock).
- **Catálogo**: productos (precio, costo, stock, stock mínimo, SKU) e insumos (stock, costo unitario,
  compras que suman existencias y opcionalmente registran el gasto).
- **Clientes (CRM)**: datos de contacto, notas, número de compras, total gastado y última compra.
- **Ajustes**: datos del negocio, moneda, equipo (dueño/empleados), carga de datos de ejemplo y
  borrado total.

Todo funciona sin internet. La base de datos vive en el dispositivo.

## Requisitos

- Node.js 22+
- Android Studio con un emulador, o un teléfono con **Expo Go** (SDK 58)
- Opcional para builds nativos: JDK 17+ y Android SDK

## Puesta en marcha

```bash
npm install
npx expo start          # luego escanea el QR con Expo Go o pulsa "a" para Android
```

Comandos útiles:

```bash
npx expo start --android   # abrir en el emulador de Android
npx expo lint              # ESLint (reglas de React Compiler)
npx tsc --noEmit           # verificación de tipos
npx expo-doctor            # diagnóstico de dependencias y configuración
npx expo install <pkg>     # instalar dependencias compatibles con el SDK
```

> Si agregas una librería con código nativo que no esté en Expo Go, necesitas un development build:
> `npx expo run:android` o `eas build --profile development`.

## Estructura

```
src/
  app/                 rutas de Expo Router (cada archivo es una pantalla)
    (tabs)/            Inicio, Movimientos, Catálogo, Clientes, Ajustes
    venta/nueva.tsx    formulario de venta (productos o monto libre)
    gasto/form.tsx     alta y edición de gastos
    producto/form.tsx  alta y edición de productos
    insumo/form.tsx    alta y edición de insumos
    insumo/compra.tsx  compra de insumo (stock + gasto)
    cliente/form.tsx   alta y edición de clientes
  components/ui/       componentes reutilizables (botones, tarjetas, campos, etc.)
  components/charts/   gráfica de barras con react-native-svg
  db/
    schema.ts          esquema SQLite, migraciones y reset
    types.ts           modelos de dominio
    mappers.ts         conversión de filas snake_case a modelos
    repos/             acceso a datos (productos, ventas, gastos, métricas, demo…)
  hooks/               useQuery / useBusinessQuery / tema
  lib/                 dinero (centavos) y fechas locales
```

## Modelo de datos

- El **SQLite local es la fuente de verdad**; la app nunca depende de la red.
- Dinero en **centavos enteros**; fechas como `YYYY-MM-DD` locales.
- IDs **UUID**, y desde el primer día cada tabla lleva `created_at`, `updated_at`, `deleted_at`
  (borrado lógico) y `device_id`, para que el respaldo/sincronización futuro no obligue a migrar.
- Migraciones versionadas con `PRAGMA user_version` en `src/db/schema.ts`.

## Roadmap (Fase 2)

1. **Inicio de sesión con Google** (`expo-auth-session` + Google OAuth).
2. **Respaldo en Google Drive**: subir una copia de `pyme.db` (o un volcado JSON) a una carpeta de
   Drive del dueño, y restaurarla en otro dispositivo con la misma cuenta.
3. **Empleados**: el dueño comparte su carpeta de Drive con las cuentas de sus empleados; los
   cambios que hagan se suben a la misma copia. Requiere resolución de conflictos (por `updated_at`
   y `device_id`) y verificación de la app ante Google.

## Notas

- La app no incluye punto de venta ni cobros: solo registro y análisis.
- Los datos se pierden si se desinstala la app sin respaldo (Fase 2).
