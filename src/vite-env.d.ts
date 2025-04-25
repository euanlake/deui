/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly VITE_R1_API_URL?: string;
  readonly VITE_R1_WS_URL?: string;
  readonly VITE_MODE?: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
