// Grupo y secciones. La app es del grupo; cada sección (rama) tiene sus datos, su insignia y sus funciones.
// Para sumar la Unidad más adelante: habilitar `unidad`, darle logo, insignias (`seed`) y funciones, y
// adaptar los textos que aún dicen «Caminante». Los datos ya se guardan separados por `section`.
const GROUP = { name: 'Grupo Scout', tagline: 'Scouts de Panamá', logo: 'assets/grupo.png' };

const SECTIONS = {
  caminantes: {
    id: 'caminantes', name: 'Comunidad de Caminantes', short: 'Caminantes', people: 'Caminantes', ages: '15 a 18 años',
    motto: 'Trazando Rumbos', logo: 'assets/insignia.png', accent: '#1c4a9a', enabled: true,
    features: { stages: true, specifics: true, honor: true },
    seed: SEED_BADGES,
  },
  unidad: {
    id: 'unidad', name: 'Unidad Scout', short: 'Unidad', people: 'Scouts', ages: '11 a 14 años',
    motto: '', logo: '', accent: '#2f7d32', enabled: false,
    features: { stages: false, specifics: false, honor: false },
    seed: [],
  },
};
const Sec = () => SECTIONS[Store.section];
