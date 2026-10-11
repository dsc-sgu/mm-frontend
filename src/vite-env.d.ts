/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true` starts the MSW mock backend in the dev server. */
  readonly VITE_MOCK_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
