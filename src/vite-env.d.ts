/// <reference types="vite/client" />
 
interface ImportMetaEnv {
  readonly VITE_SF_BASE_URL: string;
  readonly VITE_SF_DATABASE: string;
  readonly VITE_SF_SCHEMA: string;
  readonly VITE_SF_WAREHOUSE: string;
  readonly VITE_SF_AGENT_DEFAULT: string;
  readonly VITE_SF_AGENT_HUMAN: string;
  readonly VITE_SF_AGENT_AUTO: string;
  readonly VITE_SF_BEARER_TOKEN: string;
  // add more variables as needed
}
 
interface ImportMeta {
  readonly env: ImportMetaEnv;
}