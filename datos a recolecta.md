# Sistema de Scouting FTC 2026-2027: BIOBUZZ
## Especificación Funcional de Datos a Recolectar (Match & Pit Scouting)

> **Temporada**: FIRST Tech Challenge (FTC) 2026-2027  
> **Juego Oficial**: BIOBUZZ presented by RTX (Manual v1)  
> **Estructura de Alianza**: 2 vs 2 robots (4 robots por match)

---

## 1. Match Scouting (Por Robot en Cada Partido)

Cada partido debe ser cubierto por **4 scouters** (2 para la alianza roja y 2 para la alianza azul), donde cada scouter sigue a un robot asignado de inicio a fin.

### A. Metadatos de Control
| Campo | Tipo | Opciones / Formato | Propósito Funcional |
| :--- | :---: | :--- | :--- |
| `match_num` | Entero | `1, 2, 3...` | Llave para cruzar con el fixture/schedule y análisis rolling. |
| `team_num` | Entero | Número de equipo (ej. `4635`) | Identificador único del equipo. |
| `alliance_color` | Selector | `ROJO` / `AZUL` | Crucial: Flowers y Gardens pertenecen a una alianza específica. |
| `scouter_name` | Texto | Nombre del scouter | Control de calidad y auditoría de datos. |

---

### B. Período Autónomo (30 segundos)
*El autónomo aporta puntos directos y construye la base para el **SWARM RP**.*

| Campo | Tipo | Opciones / Rango | Puntos Oficiales | Propósito Funcional |
| :--- | :---: | :--- | :---: | :--- |
| `auto_start_pos` | Selector | `Pared Exterior`<br>`Centro`<br>`Cerca de Hives` | — | Detección de incompatibilidades: evita colisiones entre aliados al coordinar rutas. |
| `auto_leave` | Booleano | `Sí` / `No` | **3 pts** | Despegar del muro perimetral (Regla 10.5.4). Suma al umbral de SWARM RP. |
| `auto_park` | Booleano | `Sí` / `No` | **5 pts** | Estacionarse en Loading Zone (Regla 10.5.4). Suma al umbral de SWARM RP. |
| `auto_hive_tips` | Contador | `0, 1, 2...` | **20 pts c/u** | **Dato estelar**: Volteos bi-estables en auto. Aporta al umbral de Pollinator RP. |
| `auto_pollen_scored` | Contador | `0, 1, 2...` | Variable | Piezas de polen anotadas en Flower o depositadas en auto. |
| `auto_nectar_scored` | Contador | `0, 1, 2...` | Variable | Piezas de néctar anotadas en auto. |

---

### C. Período TeleOp (2 minutos)
*Mide la tasa de ciclo (cycle rate) y la especialización de roles en cancha.*

| Campo | Tipo | Opciones / Rango | Puntos Oficiales | Propósito Funcional |
| :--- | :---: | :--- | :---: | :--- |
| `teleop_hive_tips` | Contador | `0, 1, 2, 3...` | **20 pts c/u** | **Métrica #1 de Picklist**: Volteos individuales para alcanzar 4 TIPS (Pollinator 1) y 7 TIPS (Pollinator 2). |
| `teleop_flower_pollen` | Contador | `0, 1, 2...` | **2 pts c/u** | Polen colocado en la flor (Regla 10.5.2). Solo puntúa si la alianza posee la flor. |
| `teleop_flower_nectar` | Contador | `0, 1, 2...` | Variable | Néctar colocado en la flor. Determina propiedad y bonus. |
| `bottom_nectar_bonus` | Booleano | `Sí` / `No` | **5 pts** | Regla 10.5.2: ¿Colocó el néctar más bajo de su color en la flor? |
| `flower_ownership` | Selector | `Controló Flor`<br>`Perdió Control`<br>`No compitió` | Multiplicador | Regla 10.5.2: Tener el néctar superior otorga todos los puntos contenidos en la flor. |
| `garden_elements` | Contador | `0, 1, 2...` | **1 pt c/u** | Piezas acumuladas en el Garden de su alianza (Regla 10.5.3). |
| `garden_descoring` | Booleano | `Sí` / `No` | — | Regla 10.5.3: Defensa legal. ¿Robó o desanotó piezas del Garden contrario? |

---

### D. Endgame & Cierre del Match
| Campo | Tipo | Opciones / Rango | Puntos Oficiales | Propósito Funcional |
| :--- | :---: | :--- | :---: | :--- |
| `teleop_park` | Booleano | `Sí` / `No` | **5 pts** | En Loading Zone al sonar el silbato final. Suma al SWARM RP. |
| `robot_status` | Selector | `100% Operativo`<br>`Falla Mecánica Parcial`<br>`Desconectado/Inmóvil`<br>`No se presentó` | — | **Filtro de Fiabilidad**: Elimina robots con alto pico de puntos pero propensos a desconexión. |
| `minor_fouls` | Contador | `0, 1, 2...` | **-5 pts al rival** | Contactos indebidos o invasión momentánea. |
| `major_fouls` | Contador | `0, 1, 2...` | **-20 pts al rival** | Faltas graves (ej. interferir bajo Hives en volteo según G417). |
| `yellow_red_cards` | Selector | `Ninguna`<br>`Amarilla`<br>`Roja` | — | Regla 10.6: Advertencia crítica para playoffs (2 amarillas = descalificación). |
| `driver_skill` | Escala 1-5 | `1 (Lento/Torpe)` a `5 (Excelente)` | — | Agilidad, visión de campo y toma de decisiones del piloto. |
| `tactical_notes` | Texto libre | Breve | — | Observaciones de campo (ej. *"se atora en esquinas"*, *"tiro muy preciso"*). |

---

## 2. Pit Scouting (Inspección en Pits)

Se levanta **una sola vez por equipo** antes del arranque de los partidos oficiales.

### A. Especificaciones Mecánicas / Hardware
| Campo | Tipo | Opciones / Formato | Propósito Funcional |
| :--- | :---: | :--- | :--- |
| `chassis_type` | Selector | `Mecanum`<br>`Swerve`<br>`Tank (6WD/8WD)`<br>`X-Drive`<br>`Otro` | Determina tracción, agilidad omnidireccional y resistencia al empuje. |
| `robot_weight_lb` | Decimal | Peso en libras o kg (máx. 42 lbs per R103) | Relación aceleración/empuje en defensas de Garden. |
| `intake_type` | Selector | `Rodillos Compliant`<br>`Bumper Activo`<br>`Pinza/Garra`<br>`Por Gravedad` | Velocidad de recolección de Pollen y Nectar desde el suelo. |
| `holding_capacity` | Selector | `1 pieza (Single)`<br>`2 piezas`<br>`3+ piezas` | Determina el estilo de ciclo (disparo inmediato vs almacenamiento). |
| `hive_mechanism` | Selector | `Shooter a distancia`<br>`Brazo extensible`<br>`Impacto/Empuje`<br>`No voltea` | Identifica qué robots pueden ser lanzadores para los RPs de Pollinator. |
| `flower_mechanism` | Selector | `Disparo elevado`<br>`Elevador vertical`<br>`Depósito directo`<br>`No juega flor` | Rango de interacción con la flor (lejos o pegado a la estructura). |

### B. Rutas y Software
| Campo | Tipo | Opciones / Formato | Propósito Funcional |
| :--- | :---: | :--- | :--- |
| `auto_routines` | Selección Múltiple | `Leave básico`<br>`Park directo`<br>`Hive Tip (1 o 2)`<br>`Flower scoring` | Menú de autónomos disponibles para coordinar antes de ingresar a cancha. |
| `auto_preferred_side` | Selector | `Pared Izquierda`<br>`Centro`<br>`Pared Derecha`<br>`Indiferente` | Compatibilidad instantánea: evita colisiones por querer la misma posición de inicio. |
| `sensors_vision` | Selección Múltiple | `AprilTags (Webcam)`<br>`Deadwheel Odometry`<br>`Sensores ToF/Distancia`<br>`Solo Encoders` | Confiabilidad y repetibilidad del autónomo en condiciones de arena. |
| `claimed_auto_points` | Entero | Puntos que afirman hacer | Contraste entre expectativa de pit y rendimiento real en match scouting. |

### C. Factor Humano y Rol de Alianza
| Campo | Tipo | Opciones / Formato | Propósito Funcional |
| :--- | :---: | :--- | :--- |
| `driver_practice_hours` | Selector | `< 5 horas`<br>`5 - 15 horas`<br>`> 15 horas` | Alta correlación con la consistencia y evitación de faltas en playoffs. |
| `preferred_role` | Selector | `Hive Tipper (Lanzador)`<br>`Flower Finisher`<br>`Garden Sweeper`<br>`Híbrido` | Permite buscar compañeros complementarios en la selección de alianzas. |
| `robot_photo` | Archivo / URL | Imagen del robot | Reconocimiento visual inmediato en gradas y juntas de estrategia. |

---

## 3. Resumen de Reglas de Puntuación (BIOBUZZ v1)

### Valores de Puntos por Acción (Tabla 10-2)
* **LEAVE (Auto)**: `3 pts`
* **PARK (Auto)**: `5 pts`
* **PARK (TeleOp)**: `5 pts`
* **HIVE TIP (Auto)**: `20 pts`
* **HIVE TIP (TeleOp)**: `20 pts`
* **HIVE Cell Content (al final)**: `2 pts` por cada Pollen/Nectar en celda hacia arriba
* **Bottom NECTAR Bonus (Flor)**: `5 pts`
* **FLOWER Ownership**: `2 pts` por cada Pollen/Nectar en flor si tu alianza tiene el néctar más alto
* **GARDEN**: `1 pt` por cada Pollen/Nectar en tu zona al final

### Puntuaciones de Faltas (Tabla 10-4)
* **MINOR FOUL**: `5 pts` otorgados al rival
* **MAJOR FOUL**: `20 pts` otorgados al rival

### Umbrales Oficiales de Ranking Points (Tabla 10-3)
* **Victoria**: `3 RP`
* **Empate**: `1 RP`
* **SWARM RP (1 RP)**: $\ge$ **16 Puntos** combinados de `LEAVE + PARK` (Auto + TeleOp)
* **POLLINATOR 1 RP (1 RP)**: $\ge$ **4 HIVE TIPS** completados por la alianza
* **POLLINATOR 2 RP (1 RP)**: $\ge$ **7 HIVE TIPS** completados por la alianza

---

## 4. Fórmulas de Análisis Automatizado (Motor TimeStone)

Con esta estructura de datos, el algoritmo de **TimeStone** calculará de forma automática:

1. **EPA Real de BIOBUZZ (Expected Points Added)**:
   $$\text{Puntaje Bruto} = \text{Auto Pts} + \text{TeleOp Pts} + \text{Endgame Pts}$$
   $$\text{EPA Neto} = \text{Puntaje Bruto} - (\text{Minor Fouls} \times 5 + \text{Major Fouls} \times 20)$$
   *(Aplicando filtro IQR para eliminar outliers por desconexiones puntuales).*

2. **Probabilidad de SWARM RP ($\ge 16$ pts)**:
   $$\text{Swarm Pts} = (\text{Leave}_1 + \text{Leave}_2) + (\text{AutoPark}_1 + \text{AutoPark}_2) + (\text{TelePark}_1 + \text{TelePark}_2)$$
   Si $\text{Swarm Pts} \ge 16 \implies \text{RP Obtenido}$.

3. **Probabilidad de POLLINATOR 1 & 2 RPs**:
   $$\text{Total TIPS Alianza} = \text{Tips Robot 1} + \text{Tips Robot 2}$$
   * Umbral Pollinator 1: $\text{Total TIPS} \ge 4$
   * Umbral Pollinator 2: $\text{Total TIPS} \ge 7$

4. **Índice de Confiabilidad del Robot (% Reliability)**:
   $$\% \text{ Confiabilidad} = \frac{\text{Matches con Estatus "100\% Operativo"}}{\text{Total de Matches Disputados}} \times 100$$

5. **Net Fouls Penalty Rate**:
   Promedio de puntos regalados al rival por partido. Un valor $> 15$ puntos desaconseja la selección del robot en playoffs.
