/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API (backend Fastify). Default em client.ts se ausente. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
