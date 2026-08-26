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
      promo?: string;
    }
  }

  interface TurnstileRenderOptions {
    sitekey: string;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'flexible' | 'compact';
    appearance?: 'always' | 'execute' | 'interaction-only';
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
  }

  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

declare module '$env/static/private' {
  export const GITHUB_PR_NUMBER: string;
  export const TURSO_API_TOKEN: string;
  export const TURSO_APP_DB_URL: string;
  export const TURSO_APP_DB_AUTH_TOKEN: string;
  export const DEV_EMAIL: string;
  export const BASE_URL: string;
  export const CLOUDFLARE_ACCOUNT_ID: string;
  export const CLOUDFLARE_EMAIL_API_KEY: string;
  export const CLOUDFLARE_R2_ACCESS_KEY: string;
  export const CLOUDFLARE_R2_SECRET_KEY: string;
  export const CLOUDFLARE_R2_BUCKET_NAME: string;
}

export {};
