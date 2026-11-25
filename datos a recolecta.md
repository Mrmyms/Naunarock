# Sistema de Scouting FTC 2026-2027: BIOBUZZ
## Especificación Funcional y Esquemas de Datos (Match & Pit Scouting)

> **Temporada**: FIRST Tech Challenge (FTC) 2026-2027  
> **Juego Oficial**: BIOBUZZ presented by RTX (Manual v1)  
> **Estructura de Alianza**: 2 vs 2 robots (4 robots por match)

---

## 1. Match Scouting — Hoja `Captura_BIOBUZZ` (`A:AE`, 31 columnas)

Cada partido es cubierto por **4 scouters** (2 alianza azul y 2 alianza roja), siguiendo a un robot asignado de inicio a fin desde `/`.

### Columnas exactas (`Captura_BIOBUZZ!A1:AE1`)

| Col | Encabezado | Origen / Tipo | Detalle funcional / Puntaje en app |
| :---: | :--- | :--- | :--- |
| `A` | `Timestamp` | Texto (`es-MX`) | Fecha/hora de captura (`America/Monterrey`). Se conserva si se sincronizó desde cola offline. |
| `B` | `MATCH` | Entero | Número de match (`1, 2, 3...`). |
| `C` | `EQUIPO` | Entero | Número de equipo FTC (ej. `4010`, `4635`). |
| `D` | `ALIANZA` | Texto | `AZUL` o `ROJO`. |
| `E` | `SCOUT` | Texto | Nombre del scouter (obligatorio, persistido en `localStorage`). |
| `F` | `POSICIÓN INICIAL` | Selector mapa `A–E` | Zona de inicio sobre el mapa SVG 6×6 de BIOBUZZ (`A`, `B`, `C`, `D` o `E`). |
| `G` | `AUTO LEAVE` | `SI` / `NO` | Despegó del muro perimetral (**+3 pts**). |
| `H` | `AUTO PARK` | `SI` / `NO` | Estacionado en Loading Zone al fin de Auto (**+5 pts**). |
| `I` | `AUTO HIVE POLLEN` | Entero | Piezas de Pollen en Balancín (Hive) en Auto (**+2 pts c/u**). |
| `J` | `AUTO HIVE NÉCTAR` | Entero | Piezas de Néctar en Balancín (Hive) en Auto (**+2 pts c/u**). |
| `K` | `AUTO FLOR POLLEN` | Entero | Piezas de Pollen en Flor en Auto (**+2 pts c/u**). |
| `L` | `AUTO FLOR NÉCTAR` | Entero | Piezas de Néctar en Flor en Auto (**+2 pts c/u**). |
| `M` | `TELE HIVE POLLEN` | Entero | Piezas de Pollen en Balancín (Hive) en TeleOp (**+2 pts c/u**). |
| `N` | `TELE HIVE NÉCTAR` | Entero | Piezas de Néctar en Balancín (Hive) en TeleOp (**+2 pts c/u**). |
| `O` | `PROPIEDAD FLOR` | Entero (`0–4`) | Flores tapadas / controladas con néctar superior (`0` = ninguna, `1–4` = multiplicador `×2` para piezas en flor). |
| `P` | `TELE FLOR POLLEN` | Entero | Piezas de Pollen en Flor en TeleOp (**+2 pts c/u** si `PROPIEDAD FLOR > 0`). |
| `Q` | `TELE FLOR NÉCTAR` | Entero | Piezas de Néctar en Flor en TeleOp (**+2 pts c/u** si `PROPIEDAD FLOR > 0`). |
| `R` | `BOTTOM NÉCTAR` | `SI` / `NO` | Colocó el néctar más bajo en flor (**+5 pts**). |
| `S` | `GARDEN PIEZAS` | Entero | Piezas acumuladas en Garden (**+1 pt c/u**). |
| `T` | `DEFENSA GARDEN` | `SI` / `NO` | ¿Robó o removió piezas del Garden rival? |
| `U` | `ENDGAME PARK` | `SI` / `NO` | Estacionado en Loading Zone al silbato final (**+5 pts**). |
| `V` | `ESTATUS ROBOT` | Selector | `100% Operativo`, `Falla Mecánica Parcial`, `Desconectado/Inmóvil` o `No se presentó`. |
| `W` | `FALTAS MENORES` | Entero | Faltas menores cometidas (**-5 pts c/u**). |
| `X` | `FALTAS GRAVES` | Entero | Faltas graves cometidas (**-20 pts c/u**). |
| `Y` | `TARJETAS` | Selector | `Ninguna`, `Amarilla`, `Roja`. |
| `Z` | `PILOTO` | Entero (`1–5`) | Calificación de habilidad del piloto (`1` a `5`). |
| `AA` | `NOTAS` | Texto | Notas tácticas breves del scouter. |
| `AB` | `Auto Pts` | Entero | `(autoLeave ? 3 : 0) + (autoPark ? 5 : 0) + (autoHivePollen + autoHiveNectar + autoFlowerPollen + autoFlowerNectar) * 2`. |
| `AC` | `TeleOp Pts` | Entero | `(teleopHivePollen + teleopHiveNectar) * 2 + (flowerPollen + flowerNectar) * (flowerOwnership > 0 ? 2 : 0) + (bottomNectar ? 5 : 0) + gardenElements + (teleopPark ? 5 : 0)`. |
| `AD` | `Faltas Pts` | Entero | `minorFouls * 5 + majorFouls * 20`. |
| `AE` | `Puntos Netos` | Entero | `max(0, Auto Pts + TeleOp Pts - Faltas Pts)`. |

---

## 2. Pit Scouting — Hoja `Pit_BIOBUZZ` (`A:S`, 19 columnas)

Se registra en `/pit` para documentar las capacidades mecánicas, software y fotos de cada equipo.

| Col | Encabezado | Tipo / Opciones |
| :---: | :--- | :--- |
| `A` | `Timestamp` | Texto (`es-MX`, `America/Monterrey`). |
| `B` | `EQUIPO` | Entero (obligatorio, `> 0`). |
| `C` | `NOMBRE_EQUIPO` | Texto libre. |
| `D` | `SCOUT` | Texto (obligatorio, persistido en `localStorage`). |
| `E` | `CHASIS` | `Mecanum`, `Swerve`, `Tank (6WD/8WD)`, `X-Drive`, `Otro`. |
| `F` | `PESO_LB` | Decimal (lb, referencia `<= 42 lb` según R103). |
| `G` | `INTAKE` | `Rodillos Compliant`, `Bumper Activo`, `Pinza/Garra`, `Por Gravedad`, `Otro`. |
| `H` | `CAPACIDAD` | `1 pieza (Single)`, `2 piezas`, `3+ piezas`. |
| `I` | `MECANISMO_HIVE` | `Shooter a distancia`, `Brazo extensible`, `Impacto/Empuje`, `No voltea`. |
| `J` | `MECANISMO_FLOR` | `Disparo elevado`, `Elevador vertical`, `Depósito directo`, `No juega flor`. |
| `K` | `RUTINAS_AUTO` | Selección múltiple (`Leave básico`, `Park directo`, `Hive Tip (1 o 2)`, `Flower scoring`, `Sin Auto`). |
| `L` | `LADO_AUTO` | `Pared Izquierda`, `Centro`, `Pared Derecha`, `Indiferente`. |
| `M` | `SENSORES_VISION` | Selección múltiple (`AprilTags (Webcam)`, `Deadwheel Odometry`, `Sensores ToF/Distancia`, `Solo Encoders`). |
| `N` | `AUTO_PTS_EST` | Entero (`0`+). |
| `O` | `HORAS_DRIVER` | `< 5 horas`, `5 - 15 horas`, `> 15 horas`. |
| `P` | `ROL_PREFERIDO` | `Hive Tipper (Lanzador)`, `Flower Finisher`, `Garden Sweeper`, `Híbrido`. |
| `Q` | `NOTAS` | Texto libre de observaciones en pits. |
| `R` | `FOTOS_COUNT` | Entero (cantidad de fotos asociadas). |
| `S` | `FOTOS_IDS` | Lista separada por comas de `PHOTO_ID` en `Pit_Fotos`. |

### Almacenamiento de Fotos — Hoja `Pit_Fotos` (`A:J`, 10 columnas)

Cada foto se guarda en su calidad/resolución original dividida en fragmentos Base64 de hasta `45,000` caracteres (`valueInputOption: 'RAW'`):

`Timestamp` | `PHOTO_ID` | `EQUIPO` | `NOMBRE_ARCHIVO` | `MIME_TYPE` | `ETIQUETA` | `PARTE` | `TOTAL_PARTES` | `TAMANO_BYTES` | `DATA_CHUNK`
