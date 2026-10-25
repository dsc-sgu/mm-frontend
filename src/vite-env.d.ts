/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true` starts the MSW mock backend in the dev server. */
  readonly VITE_MOCK_BACKEND?: string;
  /**
   * PROTOTYPE: `true` keeps the prototype bar and the mock backend in a
   * production build, for a public prototype demo.
   */
  readonly VITE_PROTOTYPE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
