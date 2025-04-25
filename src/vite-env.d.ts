/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Don't redeclare MODE as it's already declared in vite/client
  readonly VITE_R1_API_URL?: string;
  readonly VITE_R1_WS_URL?: string;
  readonly VITE_MODE?: string;
  // Add other environment variables as needed
}

// Don't redeclare ImportMeta as it's already declared in vite/client
