// Insignias de competencias de la Comunidad de Caminantes (Scouts de Panamá).
// Áreas según el manual 2019. Los requisitos son los mismos en todas: 3 actividades, proyecto final e informe
// (las actividades concretas las define el grupo). Se editan en Insignias → Editar.
const AREAS = [
  { id: 'a1', name: 'Ciencia y Tecnología', icon: 'flask', color: '#1c4a9a',
    description: 'Desarrollar habilidades científicas y tecnológicas: investigar, analizar, resolver problemas y aplicar el método científico.', },
  { id: 'a2', name: 'Ciencias Naturales', icon: 'pine', color: '#3b8fc4',
    description: 'Comprender el mundo natural: medio ambiente, seres vivos, ecosistemas y recursos naturales, con actitud responsable hacia el planeta.', },
  { id: 'a3', name: 'Desarrollo Físico', icon: 'mountain', color: '#33383f',
    description: 'Bienestar y salud mediante actividad física regular: resistencia, flexibilidad, fuerza y coordinación.', },
  { id: 'a4', name: 'Socio Cultural', icon: 'book', color: '#b8860b',
    description: 'Actividades humanísticas, artísticas y culturales: creatividad, expresión personal y apreciación cultural.', },
  { id: 'a5', name: 'Servicio Público', icon: 'heart', color: '#5a6fa8',
    description: 'Responsabilidad y compromiso con la comunidad: voluntariado y proyectos de servicio comunitario.', },
];
// Requisitos de TODAS las áreas: 3 actividades (las define el grupo), proyecto final e informe.
// Los ids se mantienen estables entre versiones (r4 quedó libre al quitar la «Actividad 4»).
const REQS = [['r1', 'Actividad 1'], ['r2', 'Actividad 2'], ['r3', 'Actividad 3'], ['r5', 'Proyecto final'], ['r6', 'Entrega del informe']];
const REQ_VERSION = 3;
// «Servicio Público» está vinculada a la labor social: sus actividades son horas acumuladas (50 y 100 h), se marcan solas.
const SERVICIO_PUBLICO_REQS = [['r1', 'Actividad 1: 50 horas de labor social', 50], ['r2', 'Actividad 2: 100 horas de labor social', 100], ['r5', 'Proyecto final'], ['r6', 'Entrega del informe']];
const SEED_BADGES = AREAS.map((a, i) => ({
  ...a, section: 'caminantes', group: 'competencia', order: i + 1, reqVersion: REQ_VERSION,
  requirements: (a.id === 'a5' ? SERVICIO_PUBLICO_REQS : REQS).map(([k, text, hours]) => ({ id: a.id + k, text, ...(hours ? { hours } : {}) })),
}));
const SEED_IDS = new Set(SEED_BADGES.map(b => b.id));

// ---- Etapas de progresión (insignias de progresión, se entregan al comenzar cada etapa)
const STAGES = [
  { k: 'busqueda', name: 'Búsqueda', age: '15 años', desc: 'Primera etapa. Se da con el cumplimiento del 50 % de los objetivos personales de la etapa.' },
  { k: 'encuentro', name: 'Encuentro', age: '16 años', desc: 'Segunda etapa. Se da al alcanzar la mayoría de los objetivos de la etapa (50 % cumplido), tras un tiempo de permanencia en la comunidad.' },
  { k: 'desafio', name: 'Desafío', age: '17 años', desc: 'Tercera etapa. Se entrega al alcanzar la mayor parte o la totalidad de los objetivos intermedios de la sección.' },
];

// ---- Competencias específicas: certificadas por un ente externo, se acreditan en un área
const SPECIFIC_PRESETS = [
  { name: 'Primeros auxilios', ente: 'Cruz Roja, Bomberos o SINAPROC', area: 'a5' },
  { name: 'Seguridad vial', ente: 'Policía Nacional / Autoridad de Tránsito', area: 'a5' },
  { name: 'Bachiller técnico, cursos o seminarios tecnológicos', ente: 'Colegios técnicos (públicos o privados) o institutos vocacionales', area: 'a1' },
  { name: 'Idiomas', ente: 'Colegios públicos o privados, instituciones privadas', area: 'a4' },
];

// ---- Insignia de Máximo Logro: Condecoración Istmeña
const HONOR_CRITERIA = [
  { k: 'proyectos', t: 'Proyectos desarrollados para la adquisición de competencias' },
  { k: 'areas', t: 'Competencias alcanzadas en por lo menos 3 áreas diferentes', auto: true },
  { k: 'progresion', t: 'Progresión personal (desarrollo acorde a su etapa de crecimiento)' },
  { k: 'participacion', t: 'Participación efectiva en la vida de grupo y comunidad' },
  { k: 'impacto', t: 'Proyectos de impacto dentro de su entorno' },
  { k: 'proyecto75', t: 'Proyecto de Caminante elaborado al 75 % o más', pct: true },
];
const HONOR_STEPS = [
  { k: 'informe', t: 'El comité de comunidad emite un informe escrito al consejo de grupo solicitando el máximo logro' },
  { k: 'consejo', t: 'El consejo de grupo informa a la Dirección Nacional de Programa de Jóvenes' },
  { k: 'direccion', t: 'La Dirección Nacional emite el certificado e insignia, registrados en la asociación' },
  { k: 'entrega', t: 'Entrega de la Condecoración Istmeña al Caminante' },
];

// ================= UNIDAD SCOUT (11 a 15 años) =================
// Destrezas (insignias de habilidades) según el documento DESTREZAS del grupo. Sin requisitos: los agrega
// el grupo (varían según la insignia). Los «Segmentos» se agregan desde Insignias → Agregar insignia.
const UNIT_DESTREZAS = [
  'Oficinista', 'Numismático', 'Naturalista', 'Músico', 'Mecánico/a', 'Lector', 'Juegos', 'Jardinero/a', 'Fotógrafo',
  'Explorador', 'Excursionista', 'Desarrollo personal', 'Deportista', 'Defensa civil', 'Cultura nacionales',
  'Condiciones físicas', 'Coleccionista', 'Cocinero', 'Ciclista', 'Bombero', 'Baile', 'Atleta', 'Artista', 'Arquero',
  'Amigos del mundo', 'Amigo de los animales', 'Ajedrez', 'Actriz/Actor', 'Actitud escolar', 'Acampador',
  'Protocolo y etiqueta', 'Natación', 'Intérprete', 'Inclusión', 'Huella', 'Habilidoso/a', 'Rapel', 'Canal de Panamá',
  'Turismo', 'Tradiciones indígenas', 'Tiro', 'Servicio a la comunidad', 'Seguridad vial', 'Seguridad marítima',
  'Seguridad', 'Electricista', 'Robótica', 'Reciclaje', 'Radio', 'Programador', 'Primeros auxilios',
  'Prevención del crimen', 'Preparador para emergencias', 'Pionero', 'Pesca', 'Patinaje', 'Orientación', 'Orador',
];
// Imágenes recortadas del documento DESTREZAS (assets/destrezas/<nombre>.webp). Electricista no tiene imagen en el documento.
const SLUG = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const UNIT_SIN_IMAGEN = new Set(['Electricista']);
const UNIT_SEED = [...UNIT_DESTREZAS].sort((a, b) => a.localeCompare(b, 'es')).map((name, i) => ({
  id: 'd' + String(i + 1).padStart(2, '0'), section: 'unidad', group: 'destreza', order: i + 1, name,
  description: '', icon: 'award', color: '#3f9a52', reqVersion: REQ_VERSION,
  // «Servicio a la comunidad» está vinculada a la labor social (50 y 100 horas acumuladas); las demás no tienen requisitos aún
  requirements: name === 'Servicio a la comunidad'
    ? [{ id: 'd' + String(i + 1).padStart(2, '0') + 'r1', text: 'Actividad 1: 50 horas de labor social', hours: 50 }, { id: 'd' + String(i + 1).padStart(2, '0') + 'r2', text: 'Actividad 2: 100 horas de labor social', hours: 100 }]
    : [],
  image: UNIT_SIN_IMAGEN.has(name) ? '' : 'assets/destrezas/' + SLUG(name) + '.webp',
}));

// Etapas de progresión de Unidad (Dirección Nacional de Programa · El Cómo para el Dirigente de Sección Media).
// Se entregan con el Consejo de Patrulla, con acuerdo del dirigente encargado del seguimiento.
const UNIT_STAGES = [
  { k: 'pista', name: 'Pista', age: '11 a 12 años', desc: 'Cuando el joven o la joven comienza a trabajar con los objetivos personales correspondientes a las edades de 11 a 12 años.' },
  { k: 'senda', name: 'Senda', age: '12 a 13 años', desc: 'Cuando ha alcanzado aproximadamente la mitad de los objetivos para las edades de 12 a 13 años.' },
  { k: 'rumbo', name: 'Rumbo', age: '13 a 14 años', desc: 'Desde que ha alcanzado la totalidad, poco más o poco menos, de los objetivos personales para las edades de 13 a 14 años.' },
  { k: 'travesia', name: 'Travesía', age: '14 a 15 años', desc: 'En el momento en que ha logrado desarrollar con éxito al menos la mitad de los objetivos personales para las edades de 14 a 15 años.' },
];

// Máximo logro de la Unidad Scout: «Scout Balboa». Va aparte de las destrezas y segmentos (grupo oculto en las listas);
// requisitos según «El Cómo para el Dirigente de Sección Media» (Dirección Nacional de Programa); editables en Máximo logro.
const UNIT_MAXIMO = [{
  id: 'maximo01', section: 'unidad', group: 'maximo', order: 1, name: 'Scout Balboa', description: 'Insignia de Logro de la Sección Media',
  icon: 'star', color: '#c9971a', reqVersion: REQ_VERSION, image: '',
  requirements: [
    'Proyecto institucional 1 + 1.',
    'Progresión de acuerdo a la edad.',
    'Segmentos de conocimiento del escultismo y civismo.',
    'Una de las siguientes destrezas: Explorador, Excursionista o Acampador.',
    'Destreza en Primeros auxilios.',
    'Una destreza adicional en cada una de las áreas de desarrollo.',
  ].map((text, i) => ({ id: 'maximo01r' + (i + 1), text })),
}];
