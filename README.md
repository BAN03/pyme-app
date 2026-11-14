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
- **Ajustes**: datos del negocio, moneda, equipo (dueño/empleados), inicio de sesión con Google,
  respaldo en Drive, carga de datos de ejemplo y borrado total.

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

## Inicio de sesión con Google y respaldo en Drive

El respaldo sube una copia completa de `pyme.db` a la carpeta privada de la app en Google Drive
(`appDataFolder`, solo visible para Pyme App) y permite restaurarla en otro dispositivo con la
misma cuenta.

La autenticación usa **`@react-native-google-signin/google-signin`**, que incluye código nativo y
**no funciona en Expo Go**. Necesitas un development build:

```bash
npx expo run:android            # o npx expo run:ios
# o en la nube:
npx eas-cli build --profile development
```

### 1. Crea las credenciales en Google Cloud

En [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Habilita la **Google Drive API** para el proyecto.
2. Configura la pantalla de consentimiento OAuth (tipo "Externo" sirve para pruebas; agrega tu
   correo como usuario de prueba).
3. Crea un **ID de cliente OAuth de tipo "Web"**. Copia su valor y pégalo en `.env.local` como
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (lo usan Android y la API de Drive):

   ```bash
   cp .env.example .env.local   # en Windows: copy .env.example .env.local
   # luego edita EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
   ```

4. Crea un **ID de cliente OAuth de tipo "Android"** con el nombre de paquete
   `com.pymeapp.mobile` y el **SHA-1** de tu keystore. Para obtenerlo:

   ```bash
   npx @react-native-google-signin/config-doctor
   ```

   (también puedes usar `eas credentials` para ver el SHA-1 de EAS Build).

5. Crea un **ID de cliente OAuth de tipo "iOS"** con el bundle id `com.pymeapp.mobile`.
   Pega su valor en `.env.local` como `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` y copia su
   **iOS URL scheme** (el "reversed client id", empieza con `com.googleusercontent.apps.`) en
   `app.json`:

   ```json
   [
     "@react-native-google-signin/google-signin",
     { "iosUrlScheme": "com.googleusercontent.apps.XXXX-XXXXXXXX" }
   ]
   ```

### 2. Recompila el development build

Los cambios de `app.json` y las variables `EXPO_PUBLIC_*` requieren recompilar la app (no basta con
recargar Metro):

```bash
npx expo run:android      # o npx expo run:ios
```

Después abre **Ajustes → Cuenta y respaldo → Conectar con Google**. Una vez conectado puedes
respaldar manualmente, activar el respaldo automático (cada 12 h al abrir la app) y restaurar
cualquier copia anterior. Se conservan los 5 respaldos más recientes.

### Notas

- El token de acceso se guarda solo en memoria; si expira, la app lo renueva automáticamente.
- La cuenta conectada se recuerda entre sesiones con `signInSilently`.
- Sin las credenciales (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en Android,
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` en iOS), la tarjeta de Google muestra "Sin configurar".

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
    respaldo/restaurar.tsx  restaurar una copia desde Google Drive
  components/ui/       componentes reutilizables (botones, tarjetas, campos, etc.)
  components/backup/   tarjeta de conexión con Google y respaldo en Drive
  components/charts/   gráfica de barras con react-native-svg
  db/
    schema.ts          esquema SQLite, migraciones y reset
    backup.ts          crear y restaurar snapshots de la base de datos
    types.ts           modelos de dominio
    mappers.ts         conversión de filas snake_case a modelos
    repos/             acceso a datos (productos, ventas, gastos, métricas, demo…)
  hooks/               useQuery / useBusinessQuery / tema / use-backup (Drive)
  lib/                 dinero (centavos), fechas locales, Google Auth y Drive
```

## Modelo de datos

- El **SQLite local es la fuente de verdad**; la app nunca depende de la red.
- Dinero en **centavos enteros**; fechas como `YYYY-MM-DD` locales.
- IDs **UUID**, y desde el primer día cada tabla lleva `created_at`, `updated_at`, `deleted_at`
  (borrado lógico) y `device_id`, para que el respaldo/sincronización futuro no obligue a migrar.
- Migraciones versionadas con `PRAGMA user_version` en `src/db/schema.ts`.

## Roadmap (Fase 2)

1. ~~**Inicio de sesión con Google** (`@react-native-google-signin/google-signin`).~~ ✅ Hecho.
2. ~~**Respaldo en Google Drive**: subir una copia de `pyme.db` a la carpeta privada de la app y
   restaurarla en otro dispositivo con la misma cuenta.~~ ✅ Hecho.
3. **Empleados**: el dueño comparte su carpeta de Drive con las cuentas de sus empleados; los
   cambios que hagan se suben a la misma copia. Requiere resolución de conflictos (por `updated_at`
   y `device_id`) y verificación de la app ante Google.

## Notas

- La app no incluye punto de venta ni cobros: solo registro y análisis.
- Los datos se pierden si se desinstala la app sin respaldo (Fase 2).
