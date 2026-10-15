// PROTOTYPE: prototypes run in dev builds and in the prototype demo build
// (`bun run build:demo`); a normal production build has none.
export const PROTOTYPES_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_PROTOTYPE_DEMO === 'true';
