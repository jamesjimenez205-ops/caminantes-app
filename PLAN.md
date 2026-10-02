# Caminantes · Progreso Scout — Plan

App privada para dos dirigentes. Sin servidor, sin build: se abre `index.html` (o `python -m http.server`).
Datos en **IndexedDB** del navegador (fotos incluidas, comprimidas a ≤1600 px). Respaldo/restauración en JSON para pasar los datos entre los dos dirigentes.

## Estructura

```
index.html            shell: barra lateral + <main> + raíz de modales
css/styles.css        tema (verde bosque, crema, tierra), componentes, responsive
js/db.js              envoltorio mínimo de IndexedDB
js/seed.js            5 áreas de competencia del manual de Caminantes (editables desde la app)
js/store.js           estado en memoria + reglas de negocio (progreso, recordatorios, respaldo)
js/ui.js              iconos SVG, ilustraciones, barras, modal, toast, fotos
js/views/*.js         una vista por sección (inicio, caminantes, insignias, actividades, progreso, reportes, recordatorios)
js/report.js          generación de PDF (jsPDF)
js/app.js             router por hash, navegación, acciones delegadas
```

## Modelo de datos (un object store por entidad, `keyPath: id`)

| Store | Campos |
|---|---|
| `scouts` | id, name, birthdate?, notes?, createdAt |
| `badges` | id, order, name, description, color, icon, requirements: `[{id, text}]` |
| `completions` | id = `scoutId_reqId`, scoutId, badgeId, reqId, activityId (null si se marcó a mano), date |
| `activities` | id, date, badgeId, reqIds[], scoutIds[], description, photoIds[], createdAt |
| `photos` | id, blob |

Reglas clave
- Guardar una actividad crea una *completion* por cada participante × requisito marcado → el progreso se actualiza solo. Editar/borrar la actividad retira las que ella creó (las marcadas a mano se conservan).
- Progreso = requisitos completados / total (por Caminante e insignia). Estado: 0 % sin iniciar · 1–99 % en progreso · 100 % completada.
- Recordatorio = actividad sin fotos, con descripción < 15 caracteres, sin participantes o sin requisitos asociados.

## Componentes
Sidebar/nav (con contador de recordatorios) · Tarjeta de estadística · Parche de insignia · Barra de progreso · Tarjeta de actividad · Modal · Formulario de actividad (insignia → requisitos → participantes → texto → fotos) · Lista de requisitos con checkbox · Tabla de progreso · Filtros de reporte · Generador PDF.

## Insignias
Las 5 áreas de competencia del manual 2019. Los requisitos de cada área vienen de la presentación "Progresión, Insignia" del grupo (actividades, proyecto, informe, horas de labor social) y son editables. Área alcanzada (para la Condecoración Istmeña) = todos sus requisitos completos o una competencia específica acreditada en ella.

## Seguridad
- `js/validate.js`: validación estricta en el almacén de datos (`Store`): normalización NFKC, lista blanca de caracteres, lista negra de patrones de código/comandos, límites por campo, fechas reales, ids con formato fijo, referencias existentes, imágenes reales (firma del archivo + decodificación + recompresión) y restauración de respaldos reconstruida campo por campo.
- Salida: todo texto se escapa con `esc()` al pintar; colores e íconos se fuerzan a valores válidos.
- `index.html` y `_headers`: CSP restrictiva, SRI para jsPDF, sin indexación, sin referrer.

## Grupo y secciones
- `js/sections.js`: `GROUP` (nombre, logo `assets/grupo.png`) y `SECTIONS` (Caminantes activa; Unidad deshabilitada). Cada sección define nombre, logo, lema, funciones (`stages`, `specifics`, `honor`) y sus insignias iniciales (`seed`).
- Los datos llevan el campo `section` (por defecto `caminantes`); `Store` carga solo la sección activa (`S`) y conserva todo en `ALL`. Respaldos incluyen todas las secciones.
- Colores: verde, amarillo y rojo del logo del grupo para la interfaz; el azul de la insignia de Caminantes queda en el logo de la sección y en sus áreas.
- Unidad Scout (11 a 15 años) está activa: 58 destrezas (sin requisitos, los agrega el grupo), 4 etapas de progresión (Pista, Senda, Rumbo, Travesía) y «Segmentos» que se crean desde Insignias → Agregar insignia. Las insignias tienen tipo (`group`) y cualquiera puede crearse, editarse o eliminarse. La sección elegida se recuerda en el dispositivo.

## Fotos e imágenes
- Cada Caminante/Scout puede tener foto de perfil (campo `photoId`, se guarda reducida en el almacén de fotos). Las insignias usan: foto propia (`photoId`) > imagen del proyecto (`image`, solo rutas `assets/…`) > ícono.
- Las destrezas de Unidad traen su imagen recortada del documento DESTREZAS en `assets/destrezas/*.webp` (Electricista no tiene imagen en el documento).

## Labor social
Colección `service`: un registro por jornada con participantes (las horas cuentan por participante), fecha, horas (múltiplos de 0.25), lugar, descripción, evidencia (hasta 6 fotos) y certificado (imagen o PDF ≤ 680 KB, guardado en `photos`). Totales por Caminante/Scout en Labor social, en el perfil y en el PDF. **Requiere que las reglas de Firestore incluyan `'service'`** (ver `firestore.rules`).

## Insignias vinculadas a la labor social
Un requisito puede llevar `hours`: se marca solo cuando el total de horas de labor social del joven (en su sección) llega a esa cantidad, y se desmarca si baja (completions con `activityId: 'labor'`). Vinculadas de fábrica: «Servicio Público» (Caminantes: 50 h y 100 h, más proyecto final e informe) y «Servicio a la comunidad» (Unidad: 50 h y 100 h). La casilla «Horas» del editor solo aparece en esas dos insignias (y en cualquier otra que ya tenga requisitos con horas); las demás insignias no llevan horas.

## Unidad: listas desplegables y Scout Balboa
- En el menú, **Insignias** de Unidad se despliega en **Segmentos** (vacía, el grupo la irá llenando) y **Destrezas**: una página por tipo (`#/insignias/segmento`, `#/insignias/destreza`); `#/insignias` muestra las dos opciones (también en el celular). Caminantes mantiene su lista única.
- **Máximo logro** de Unidad = **Scout Balboa** (insignia `maximo01`, tipo oculto `maximo`): va aparte de las listas y de las estadísticas (`S.maximo`). Sus requisitos los define el grupo con «Editar requisitos»; se marca el avance de cada Scout y la fecha de entrega.

## Progreso
Resumen arriba (insignias completas, en progreso, labor social, progreso general). Caminantes: tarjetas por área y matriz de jóvenes × insignias (con labor social y asistencia). Unidad: pestañas **Destrezas / Segmentos**, cada una con su resumen, las insignias con más avance y un detalle desplegable por Scout (con su labor social y asistencia).
