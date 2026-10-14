// Secrets and optional overrides are not in wrangler.jsonc, so `wrangler types`
// cannot see them; declare them here so they merge into the generated Env.
declare namespace Cloudflare {
  interface Env {
    INTERNAL_API_TOKEN?: string;
    APP_API_URL?: string;
  }
}
