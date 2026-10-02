// Grupo y secciones. La app es del grupo; cada sección (rama) tiene sus datos, su insignia y sus funciones.
// Para sumar la Unidad más adelante: habilitar `unidad`, darle logo, insignias (`seed`) y funciones, y
// adaptar los textos que aún dicen «Caminante». Los datos ya se guardan separados por `section`.
const GROUP = { name: 'Grupo Scout', tagline: 'Scouts de Panamá', logo: 'assets/grupo.png' };

const SECTIONS = {
  caminantes: {
    id: 'caminantes', name: 'Comunidad de Caminantes', short: 'Caminantes', people: 'Caminantes', person: 'Caminante', ages: '15 a 18 años',
    motto: 'Trazando Rumbos', logo: 'assets/insignia.png', accent: '#1c4a9a', enabled: true,
    features: { stages: true, specifics: true, honor: true, attendance: true, service: true },
    stages: STAGES, autoProgress: 'actividad', honorName: 'Condecoración Istmeña',
    groups: [{ k: 'competencia', name: 'Competencias', one: 'Competencia', color: '#1c4a9a', icon: 'compass' }],
    seed: SEED_BADGES,
  },
  unidad: {
    id: 'unidad', name: 'Unidad Scout', short: 'Unidad', people: 'Scouts', person: 'Scout', ages: '11 a 15 años',
    motto: '', logo: 'assets/unidad.png', accent: '#3f9a52', enabled: true,
    features: { stages: true, specifics: false, honor: true, attendance: true, service: true },
    stages: UNIT_STAGES, autoProgress: 'todos', honorName: 'Scout Balboa',
    groups: [
      { k: 'segmento', name: 'Segmentos', one: 'Segmento', color: '#d9a21b', icon: 'star' },
      { k: 'destreza', name: 'Destrezas', one: 'Destreza', color: '#3f9a52', icon: 'award' },
      { k: 'maximo', name: 'Máximo logro', one: 'Máximo logro', color: '#c9971a', icon: 'star', hidden: true },
    ],
    seed: [...UNIT_SEED, ...UNIT_MAXIMO],
  },
};
const Sec = () => SECTIONS[Store.section];
