# NAUTILUS 4010 • Sistema de Scouting FTC (BIOBUZZ 2026-2027)

Aplicación web móvil de captura de datos en cancha (**Match Scouting**), inspección técnica en pits (**Pit Scouting**) y tablero de telemetría (**Dashboard**) para el equipo **Nautilus 4010** en la temporada **FIRST Tech Challenge BIOBUZZ (2026-2027)**.

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript 5
- **Persistencia**: Google Sheets API v4 (`googleapis`)
- **Schedule / Eventos**: FTCScout GraphQL API (`https://api.ftcscout.org/graphql`)
- **Despliegue**: Vercel (`vercel.json`)

## Rutas y Módulos

| Ruta | Descripción |
| :--- | :--- |
| `/` | **Match Scouting**: captura por fases (`Autónomo`, `TeleOp`, `Endgame`), mapa SVG 6×6 interactivo (`A–E`), soporte para **múltiples eventos simultáneos** (FTCScout o manuales, con conmutación rápida y estación fija por evento), cálculo de puntos BIOBUZZ en vivo y **cola offline** en `localStorage` con reintento automático y manual. |
| `/pit` | **Pit Scouting**: ficha técnica completa del robot por evento + subida de **múltiples fotos** almacenadas sin compresión en Google Sheets (`Pit_Fotos_<EVENTO>`), con visor de registros guardados. |
| `/dashboard` | **Telemetría en vivo**: lectura de `Captura_BIOBUZZ` o `Captura_BIOBUZZ_<EVENTO>` (con filtro por evento o vista combinada `Todos`), KPIs generales y ranking de equipos por EPA neto promedio. |
| `/api/scout` | `POST`: valida/formatea y agrega filas de 31 columnas en la hoja del evento (`Captura_BIOBUZZ_<EVENTO>` o `Captura_BIOBUZZ`), creándola automáticamente si no existe y conservando el `timestamp` original cuando viene de cola offline. |
| `/api/data` | `GET`: lee registros por evento (`?event=<CODIGO>`, `?event=DEFAULT` o `?event=ALL`) y lista los eventos disponibles en Sheets. |
| `/api/event` | `GET`: busca eventos y descarga matches desde FTCScout. |
| `/api/pit` | `GET` / `POST`: consulta y guarda fichas técnicas (19 columnas) en `Pit_BIOBUZZ_<EVENTO>` (o `Pit_BIOBUZZ`). Soporta `?event=<CODIGO>`, `DEFAULT` y `ALL`. |
| `/api/pit/photo` | `POST` / `GET`: guarda y reconstruye imágenes fragmentadas en Base64 (`RAW`) dentro de `Pit_Fotos_<EVENTO>` (o `Pit_Fotos`), admitiendo `?event=<CODIGO>` para lectura directa. |

## Estructura en Google Sheets (Multi-Evento)

Cada evento normalizado (`[A-Z0-9_-]`, ej. `MXMTY`, `MXGDL`, `DIV_A`) se almacena en sus propias pestañas independientes (creadas automáticamente al primer guardado):

- **`Captura_BIOBUZZ_<EVENTO>`** (`A1:AE`): 31 columnas de Match Scouting por robot y partido.
- **`Pit_BIOBUZZ_<EVENTO>`** (`A1:S`): 19 columnas de inspección técnica en pits.
- **`Pit_Fotos_<EVENTO>`** (`A1:J`): 10 columnas para fragmentos Base64 de hasta 45,000 caracteres por celda.

Si no se selecciona ningún evento (`General` / `DEFAULT`), la aplicación mantiene compatibilidad con las pestañas base `Captura_BIOBUZZ`, `Pit_BIOBUZZ` y `Pit_Fotos`.

También es posible abrir cualquier vista apuntando directamente a un evento mediante query string: `/?event=MXMTY`, `/pit?event=MXMTY`, `/dashboard?event=MXMTY`.

## Resiliencia Offline en Arena

Si al guardar un partido en `/` no hay conexión a internet, ocurre un timeout (12 s) o el servidor responde con error `5xx`:
1. El registro se guarda automáticamente en `localStorage` (`nautilus_4010_scout_queue_v1`) conservando su marca de tiempo y código de evento original (`eventCode`).
2. El scouter puede avanzar al siguiente partido (o cambiar de evento) sin perder datos ni bloquear la captura.
3. Los partidos pendientes se sincronizan automáticamente hacia su hoja correspondiente al recuperar conexión (`online`) o manualmente desde el botón **`Cola (N)`** del header.

## Variables de Entorno

Configurar en `.env.local` (desarrollo) o en Vercel (producción):

```env
GOOGLE_SHEET_ID=tu_spreadsheet_id
GOOGLE_CLIENT_EMAIL=service-account@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

En desarrollo local también admite el archivo de Service Account `nauticode-*.json` en la raíz del proyecto (ignorado por Git).

## Desarrollo Local

```bash
npm install
npm run dev
```

Validación de tipos y build de producción:

```bash
npx tsc --noEmit
npm run build
```
