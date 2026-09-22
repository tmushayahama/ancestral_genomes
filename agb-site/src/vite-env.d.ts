/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: 'dev' | 'beta' | 'prod'
  readonly VITE_AGB_API_URL?: string
  readonly VITE_BASE_URL?: string
  readonly VITE_OUTPUT_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
