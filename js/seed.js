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
const SEED_BADGES = AREAS.map((a, i) => ({
  ...a, section: 'caminantes', order: i + 1, reqVersion: REQ_VERSION,
  requirements: REQS.map(([k, text]) => ({ id: a.id + k, text })),
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
