# No Negociables — documento de diseño

**Estado:** diseño cerrado. Listo para implementar.
**Fecha:** agosto 2026 · revisión 3

Objetivos diarios que el usuario define una vez y revisa cada día a una hora
que él elige. A diferencia de las rutinas —que son eventos semanales con hora
de inicio y fin— un no negociable es un compromiso **diario** de sí/no, sin
horario propio.

---

## 0. Alcance de la v1

| | |
|---|---|
| **Entra** | No negociables simples (solo título + emoji) |
| | Cumplimiento manual ✓ / ✗ |
| | Racha global diaria |
| | Porcentaje de cumplimiento individual a 30 días |
| | Recordatorio diario a hora configurable |
| | Máximo 7, recomendación de empezar con 3–5 |
| | Borrado propio con doble confirmación |
| **No entra** | Perfil de usuario (peso, altura) |
| | No negociables calculados — el modelo queda preparado, la UI no se expone |
| | HealthKit / Google Fit |
| | Días libres o congelar racha |
| | Edición de días ya cerrados |
| | Zona horaria por registro |

---

## 1. Qué encontré en el código actual

Cuatro hallazgos condicionan el diseño.

### 1.1 No existe ningún dato de perfil de usuario

Busqué `weight`, `height`, `age`, `profile` y equivalentes en `src/types/`,
`src/stores/` y `src/services/storage.ts`. **Cero coincidencias reales** (lo
único que aparece es `fontWeight` de estilos).

La app no sabe nada del usuario: ni peso, ni altura, ni edad. `settingsStore`
solo guarda tema, idioma y valores por defecto de alarma.

**Resuelto:** la v1 sale sin perfil. Ver sección 3.3.

### 1.2 La racha existente cuenta semanas, no días

`routinesStore.calculateStreak()` recorre los `CompletionRecord` de un evento y
solo continúa la racha si la diferencia entre dos completados está **entre 6 y 8
días**:

```ts
const diff = (lastDate.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24);
if (diff >= 6 && diff <= 8) { streak++; ... } else { break; }
```

Tiene sentido para rutinas, que se repiten un día concreto de la semana. Un no
negociable es diario. **No se puede reutilizar la función**, aunque sí el patrón.

### 1.3 Solo se guarda lo cumplido; el "no cumplido" es la ausencia del registro

`CompletionRecord` es `{id, date, notes, eventId}`. No hay campo de estado.
`toggleCompletedToday()` **crea** el registro al marcar y lo **borra** al
desmarcar.

Hoy el sistema no distingue entre *"lo marqué como no cumplido"* y *"no
contesté"*. Para no negociables esa diferencia decide si se rompe la racha, así
que el registro diario necesita estado explícito. Ver 3.2.

### 1.4 No existe el patrón de "notificación diaria a una hora elegida"

| Mecanismo | Repetición | Para qué |
|---|---|---|
| `scheduleAlarmsForRoutine` | `WEEKLY` | Alarma de rutina (Android: AlarmManager nativo) |
| `scheduleReminderForRoutine` | `WEEKLY` | Aviso X minutos antes de una rutina |
| `alarmStore` + `AlarmService` | por días de semana | Alarmas independientes tipo despertador |

Ninguno es una notificación **diaria simple**. Lo más parecido es el modelo
`Alarm`, que ya guarda `hour`/`minute` elegidos por el usuario — ese es el patrón
a copiar, no el código a reutilizar: `Alarm` arrastra sonido, volumen,
vibración, posponer y pantalla de sonando a pantalla completa. Un no negociable
quiere un aviso discreto.

**Propuesta:** `notifee.createTriggerNotification` con `RepeatFrequency.DAILY`,
que la app aún no usa en ningún sitio. Funciona igual en las dos plataformas.

### 1.5 Estructura de TodayScreen

```
ScrollView
├── headerShadow > header (GradientView)
│   ├── greeting + fecha
│   └── progressSection (barra + conteo + %)   ← solo si hay rutinas hoy
├── isLoading  → 3× SkeletonRow
│   vacío      → emptyState (🌙 + título + mensaje + CTA)
│   con datos  → eventsList (TodayEventRow[])
└── (fuera del scroll) fabContainer: ➕ y 🎤
```

---

## 2. Reglas de negocio

### 2.1 Racha global diaria

Un día cuenta para la racha si **todos los no negociables exigibles ese día**
quedaron en `done`.

Se conserva además, por cada no negociable, su **porcentaje de cumplimiento de
los últimos 30 días**, para que romper la racha no borre toda la sensación de
progreso.

**El trade-off asumido:** es todo o nada. Fallar uno de cinco tumba una racha de
40 días. El porcentaje individual es la mitigación deliberada.

### 2.2 Qué no negociables son "exigibles" un día dado

Esta es la parte delicada, y sale de combinar la racha global con la regla de
que uno nuevo solo cuenta desde su creación.

Un no negociable **N** es exigible el día **D** si:

1. `N.createdAt` es anterior o igual a D (día civil), **y**
2. N estaba activo ese día.

El punto 2 tiene trampa: `isActive` es una bandera **del presente**, no del
pasado. Si se evaluara con el valor actual, aparecería un agujero:

> Fallo el martes → desactivo ese no negociable → el martes deja de exigirlo →
> la racha se "arregla" sola retroactivamente.

**Solución: los registros son la fuente de verdad.** El día D exige exactamente
los no negociables que tienen un registro con fecha D. Los registros se crean
en `pending` de forma perezosa la primera vez que se observa el día (al abrir la
app o al dispararse el recordatorio), congelando ahí el conjunto exigible.

Desactivar uno después ya no puede reescribir el pasado.

**Excepción para el día en curso.** La regla anterior, aplicada tal cual, crea
una trampa: creas un no negociable por error, lo desactivas al minuto, y te
quedas con un `pending` de hoy que al cerrar el día se vuelve `missed` y te
rompe la racha por una corrección.

Al desactivar (o borrar) un no negociable se elimina **su registro de hoy si
sigue en `pending`**. Solo el de hoy y solo si no se ha respondido. Los días
anteriores y las respuestas ya dadas quedan intactos, así que la propiedad
anti-trampa de arriba se conserva: no se puede arreglar un martes fallado.

### 2.2.1 Aritmética de días: nunca con milisegundos

Toda la lógica de racha camina días hacia atrás. Hacerlo restando
`24 * 60 * 60 * 1000` **está mal** y es el bug que va a aparecer: con horario de
verano un día dura 23 o 25 horas, y esa resta cae en el día equivocado.

Retroceder siempre construyendo la fecha:

```ts
// MAL — se rompe en los cambios de horario
const prev = new Date(d.getTime() - 86400000);

// BIEN — el constructor normaliza y respeta el cambio de hora
const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
```

Lo mismo al generar la clave `"YYYY-MM-DD"`: componerla con
`getFullYear/getMonth/getDate` locales, nunca con `toISOString()`, que convierte
a UTC y desplaza el día para cualquiera al oeste de Greenwich.

### 2.3 Cierre del día: `pending` → `missed`, perezoso

Tres estados: `pending`, `done`, `missed`.

- Al observar un día nuevo se crean registros `pending` para los activos.
- El usuario marca `done` o `missed`. Puede cambiar de opinión el mismo día.
- Cualquier registro `pending` **de un día anterior a hoy** se considera
  `missed` al leerlo.

Sin tarea a medianoche: la consolidación ocurre al calcular la racha o al pintar
la pantalla. Menos piezas móviles y sobrevive a que el móvil esté apagado.

Que la consolidación sea perezosa **no obliga a persistirla**. Basta con tratar
el `pending` pasado como `missed` en lectura. Escribirlo al almacenamiento es
opcional y solo por higiene de datos.

### 2.4 Algoritmo de racha

```
racha = 0
d = hoy
mientras cierto:
    registros = registros con fecha == d
    si d == hoy:
        # el día en curso no rompe la racha mientras siga abierto
        si registros vacíos o algún registro != done: 
            d = d - 1; continuar
    si registros vacíos:
        # día sin observar y ya cerrado -> no se respondió
        romper
    si todos los registros son done:
        racha += 1
        d = d - 1
    si no:
        romper
devolver racha
```

Dos matices que evitan sorpresas:

- **Hoy no cuenta hasta cumplirse.** Si a las 10:00 llevas 0 de 3, la racha no
  debe mostrarse rota: aún tienes el día. Por eso el día en curso se salta.
- **Un día pasado sin ningún registro rompe la racha.** Es alguien que no abrió
  la app; no responder es no cumplir, coherente con 2.3.

### 2.5 Porcentaje individual a 30 días

Denominador = **días exigibles**, no 30 fijos. Es decir, días con registro de
ese no negociable dentro de la ventana de 30 días.

Se hace así para que uno creado hace 4 días muestre `3/4 = 75 %` y no
`3/30 = 10 %`, que sería desmoralizante y falso.

Con menos de 7 días exigibles se muestra el conteo bruto (`3 de 4 días`) en vez
del porcentaje: un porcentaje sobre 3 días no informa de nada.

---

## 3. Modelo de datos

Todo va a MMKV siguiendo el patrón de `src/services/storage.ts`: arrays JSON
bajo claves fijas, con getters y setters por entidad.

### 3.1 `NonNegotiable`

```ts
export type NonNegotiableKind = 'simple' | 'calculated';

export interface NonNegotiable {
  id: string;
  title: string;              // "Comer suficiente proteína"
  emoji: string;              // "🥩"
  kind: NonNegotiableKind;    // v1 siempre 'simple'
  formulaRaw: string | null;  // v1 siempre null
  isActive: boolean;
  order: number;
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
```

`kind` y `formulaRaw` existen desde la v1 aunque no se usen. Añadirlos ahora
cuesta dos campos; añadirlos después obliga a migrar datos ya guardados. La UI
de creación **no ofrece** el tipo calculado en v1.

`isActive` en vez de borrar: quitar un no negociable no debe invalidar el
historial de los días en que existía.

**Límite de 7 activos.** Al llegar, el botón de añadir se deshabilita con un
mensaje. El editor sugiere empezar con 3–5.

### 3.2 `NonNegotiableRecord` — historial diario

```ts
export type NonNegotiableStatus = 'pending' | 'done' | 'missed';

export interface NonNegotiableRecord {
  id: string;
  nonNegotiableId: string;
  date: string;                   // "YYYY-MM-DD" local, NO ISO completo
  status: NonNegotiableStatus;
  respondedAt: string | null;     // ISO, null si nunca respondió
}
```

Dos decisiones que difieren de `CompletionRecord`:

**`date` es `"YYYY-MM-DD"` local, no un ISO con hora.** `CompletionRecord.date`
guarda `toISOString()` y luego todas las comparaciones normalizan a medianoche
con `setHours(0,0,0,0)`. Es frágil y depende de la zona horaria al leer. La clave
natural de un historial diario es el día civil.

**`status` explícito**, sin el cual no se distingue "dije que no" de "no
contesté" — justo lo que necesita 2.3.

### 3.3 Perfil de usuario — **fuera de la v1**

Los no negociables calculados quedan aplazados. Cuando toque, lo mínimo será:

```ts
export interface UserProfile {
  weightKg: number | null;
  heightCm: number | null;
  updatedAt: string;
}
```

No se implementa ahora. Se documenta para que quede constancia de qué haría
falta y de que `kind`/`formulaRaw` existen precisamente para eso.

### 3.4 Configuración

En `settingsStore`, junto al resto de preferencias:

```ts
nonNegotiablesEnabled: boolean;   // por defecto false
nonNegotiablesHour: number;       // 0-23, por defecto 21
nonNegotiablesMinute: number;     // 0-59, por defecto 0
```

---

## 4. Flujos

### 4.1 Configuración

Pantalla `NonNegotiablesSettingsScreen`, accesible desde Ajustes con una
`SettingsNavRow` —el componente ya existe— y desde la propia sección de Hoy.

```
┌─ No Negociables ──────────────────────┐
│  [Toggle] Activar no negociables      │
│                                       │
│  Hora de repaso        21:00  >       │
│                                       │
│  TUS NO NEGOCIABLES          3 de 7   │
│  ⋮⋮ 🥩  Comer proteína     92% ✏️ 🗑  │
│  ⋮⋮ 🚶  Caminar 10.000     78% ✏️ 🗑  │
│  ⋮⋮ 💧  Beber 2 L          100% ✏️ 🗑 │
│                                       │
│  [ + Añadir no negociable ]           │
│  Recomendamos entre 3 y 5.            │
│                                       │
│  ⚠️  ZONA DE PELIGRO                   │
│  Borra los no negociables, su         │
│  historial, las estadísticas y la     │
│  racha. No se puede deshacer.         │
│  [ 🗑  Eliminar todo ]                 │
└───────────────────────────────────────┘
```

**Borrado propio, separado del de rutinas.** "Borrar todas las rutinas" (en la
pantalla de Semana) **no** toca los no negociables: son entidades distintas con
almacenamiento distinto. La acción de aquí borra los `NonNegotiable` y todos sus
`NonNegotiableRecord`.

Doble confirmación, como en el borrado de rutinas, porque destruye estadísticas
y racha —que es lo único irreemplazable de esta función— y no hay copia de
seguridad. Tras borrar hay que **cancelar la notificación diaria**: sin activos
no se programa (P8).

Los desactivados conservan su historial pero **no ocupan cupo**. El límite de 7
cuenta solo activos, así que desactivar uno libera el hueco al instante.

El editor (`NonNegotiableEditorScreen`) es un formulario corto: emoji y título.
El selector de tipo no se muestra en v1.

Para la hora, reutilizar `@react-native-community/datetimepicker`, que ya usa
`EventEditorScreen`.

### 4.2 Flujo diario

```
     Hora configurada (ej. 21:00)
                │
                ▼
   Notificación diaria (notifee, RepeatFrequency.DAILY)
   "🎯 ¿Cómo te fue hoy?"
   "3 no negociables por revisar"
                │
         ┌──────┴──────┐
         ▼             ▼
   Toca la notif    La ignora
         │             │
         ▼             ▼
  TodayScreen,    Sigue en `pending`.
  checklist       Al pasar a otro día,
  desplegado      se lee como `missed`
```

**La hora es un recordatorio, no una restricción.** Se puede responder en
cualquier momento del día: si cumples lo tuyo a las 7 de la mañana, marcarlo
entonces. Antes de la hora la tarjeta aparece colapsada, pero se abre tocándola.

Feedback inmediato al marcar:

- Cumplido → 😀, fila en color de éxito
- No cumplido → 😔, fila apagada
- Sin responder → ⚪ neutro

Se puede cambiar la respuesta durante el mismo día. Una vez cerrado, no: permitir
editar el pasado vacía de sentido la racha.

**Sin no negociables activos no se programa notificación.** Avisar para revisar
una lista vacía es ruido. Al crear el primero se programa; al desactivar el
último se cancela.

### 4.3 Integración en TodayScreen

Entre la cabecera con gradiente y la lista de rutinas: es lo primero tras el
saludo, no desplaza el estado vacío de rutinas y no toca los FAB.

```
ScrollView
├── header (gradiente, saludo, progreso de rutinas)   ← sin cambios
│
├── ▸ NonNegotiablesCard                              ← NUEVO
│     🎯 No negociables        🔥 12 días
│     ┌───────────────────────────────────┐
│     │ 🥩 Comer proteína      😀  [✓][✗] │
│     │ 🚶 Caminar 10.000      ⚪  [✓][✗] │
│     │ 💧 Beber 2 L           😔  [✓][✗] │
│     └───────────────────────────────────┘
│
├── eventsList / emptyState                           ← sin cambios
└── fabContainer                                      ← sin cambios
```

Visibilidad:

| Situación | Qué se ve |
|---|---|
| Función desactivada | Nada |
| Activa, ninguno creado | Tarjeta compacta con CTA para crear el primero |
| Antes de la hora | Colapsada: título y racha. Se despliega al tocar |
| Desde la hora | Desplegada con el checklist |

Usar `Card` de `components/ui` y los tokens de `AppTheme.ts` — nada de colores a
mano.

---

## 5. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/types/nonNegotiable.ts` | **Nuevo.** Tipos y enums |
| `src/services/storage.ts` | Claves y accesores nuevos |
| `src/stores/nonNegotiablesStore.ts` | **Nuevo.** Estado, racha, porcentajes |
| `src/services/notifications.ts` | `scheduleNonNegotiablesReminder()` / `cancel…` |
| `src/components/NonNegotiablesCard.tsx` | **Nuevo.** Tarjeta de Hoy |
| `src/screens/NonNegotiablesSettingsScreen.tsx` | **Nuevo** |
| `src/screens/NonNegotiableEditorScreen.tsx` | **Nuevo** |
| `src/screens/TodayScreen.tsx` | Insertar la tarjeta |
| `src/screens/SettingsScreen.tsx` | Fila de acceso |
| `src/navigation/types.ts` | Dos rutas nuevas |
| `src/i18n/locales/{en,es,fr}.json` | Bloque `non_negotiables` |
| `src/stores/settingsStore.ts` | Tres campos de configuración |
| `__tests__/nonNegotiablesStreak.test.ts` | **Nuevo.** Casos de 5.1 |

Orden sugerido: modelo y almacenamiento → store con racha y porcentajes (es donde
conviene poner tests) → notificación → UI.

### 5.1 Tests

La lógica de 2.2 y 2.4 es la única del proyecto con reglas temporales no
triviales, y produce bugs que no se reproducen a mano: hay que simular días.
El store debe aceptar una fecha inyectada (`now: Date`) para poder testearlo sin
tocar el reloj del sistema.

Casos mínimos:

| Caso | Qué comprueba |
|---|---|
| Racha de 3 días seguidos, todos `done` | Camino feliz |
| Un día con 2 `done` y 1 `missed` | Rompe la racha (regla global) |
| Día pasado sin ningún registro | Rompe la racha |
| Hoy con 0 de 3 respondidos | La racha **no** se rompe: el día sigue abierto |
| Uno creado hace 2 días, racha de 5 | Los 3 días previos no lo exigen (P6) |
| Desactivado 90 días y reactivado | Esos 90 días no lo exigen (H2) |
| Creado y desactivado el mismo día | El `pending` de hoy se elimina; la racha no se rompe |
| `pending` de ayer, sin tocar | Se lee como `missed` |
| Porcentaje con 4 días exigibles | Muestra `3 de 4`, no `10 %` |

**Casos de fecha local**, que es donde la lógica es frágil:

| Caso | Qué comprueba |
|---|---|
| Cruce de medianoche | El día civil cambia; el registro de ayer se cierra |
| Cambio a horario de verano (día de 23 h) | Retroceder un día no salta una fecha |
| Vuelta de horario de verano (día de 25 h) | Retroceder un día no repite una fecha |
| Zona con desfase negativo (ej. UTC−5) | La clave `YYYY-MM-DD` es la local, no la UTC |

El último caso es el que rompería `toISOString()`: a las 20:00 en UTC−5 ya es el
día siguiente en UTC, y el registro se guardaría con la fecha equivocada.

---

## 6. Decisiones cerradas

| # | Decisión |
|---|---|
| P1 | Sin perfil de usuario en v1. Solo simples; `calculated` queda preparado en el modelo |
| P2 | Cumplimiento manual ✓ / ✗. Sin HealthKit ni Google Fit |
| P3 | Racha global diaria + porcentaje individual a 30 días |
| P4 | Se puede responder antes de la hora. La hora solo recuerda |
| P5 | Máximo 7 activos; recomendación de 3–5 |
| P6 | Uno nuevo solo cuenta desde su fecha de creación |
| P7 | Sin días libres ni congelar racha en v1 |
| P8 | Sin no negociables activos → no se programa notificación |
| — | `pending` → `missed` perezoso, sin tarea a medianoche |
| H1 | El día de creación **sí** es exigible. Al crear se genera su `pending` de hoy |
| H2 | Reactivar no penaliza el pasado: sin registros durante la inactividad, esos días no exigen nada |
| H3 | Sin zona horaria por registro en v1. Se cubre con tests de fecha local (5.1) |
| H4 | El límite de 7 es sobre **activos**. Los desactivados conservan historial sin ocupar cupo |
| H5 | Borrado propio en Ajustes de No Negociables, con doble confirmación |
| — | Excepción: desactivar borra el `pending` **de hoy** si no se respondió (2.2) |

No queda ninguna decisión de producto abierta.

---

## 7. Limitaciones conocidas de la v1

Asumidas a propósito. Se documentan para no redescubrirlas como bugs.

**Zona horaria.** `date` es el día civil local en el momento de escribir. Quien
viaje cruzando husos puede ver un día saltado o duplicado. Compensarlo exige
guardar la zona de cada registro y decidir qué hacer al reinterpretarla;
desproporcionado para una app personal. Si en el futuro aparecen usuarios que
viajan a menudo, la vía es añadir `timezoneAtCreation` al registro.

**El cumplimiento lo declara el usuario.** La app no mide pasos ni gramos. Un
"cumplido" es una afirmación, no un dato verificado. Verificarlo sería integrar
HealthKit / Google Fit, con sus permisos y su revisión de tienda.

**El pasado no se edita.** Una vez cerrado el día, su respuesta es definitiva.
Es lo que da sentido a la racha, pero significa que un olvido no se puede
corregir al día siguiente.

**Sin días libres.** Fallar un día pone la racha a cero. La mitigación es el
porcentaje individual a 30 días (2.5). Si el uso real muestra que desmotiva,
congelar racha es la primera candidata para la v2.
