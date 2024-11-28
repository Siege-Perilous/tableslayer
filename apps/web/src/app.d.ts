// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface PageData {}
    // interface Platform {}
    interface Locals {
      user: User | null;
      session: Session | null;
    }
    namespace Superforms {
      type Message = {
        type: 'error' | 'success';
        text: string;
      };
    }
  }
}

declare module '$env/static/private' {
  export const TURSO_API_TOKEN: string;
  export const TURSO_APP_DB_URL: string;
  export const TURSO_APP_DB_AUTH_TOKEN: string;
  export const TURSO_GS_PARENT_DB_URL: string;
  export const TURSO_GS_PARENT_DB_AUTH_TOKEN: string;
  export const RESEND_TOKEN: string;
  export const DEV_EMAIL: string;
  export const BASE_URL: string;
  export const CLOUDFLARE_ACCOUNT_ID: string;
  export const CLOUDFLARE_R2_ACCESS_KEY: string;
  export const CLOUDFLARE_R2_SECRET_KEY: string;
  export const CLOUDFLARE_R2_BUCKET_NAME: string;
}

export {};
