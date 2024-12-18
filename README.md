# TableSlayer

Table Slayer provides tools for game masters to project animated battle maps on their digital tabletop. Test

## Development

This repo requires certain Node and `pnpm` versions. These can be checked in `package.json`. If working in multiple Node based projects, you might want to use [nvm](https://github.com/nvm-sh/nvm) to manage your Node version and [corepack](https://nodejs.org/api/corepack.html#enabling-the-feature) (which comes with Node and needs to be enabled) to switch your package manager. If both are installed, it should auto-switch your versions as you enter the folder.

`pnpm run dev` should open all the apps under their own port.

To get started, edit the `.env` file in each `app` and run `pnpm run dev` to load local development.

### Apps and packages

- `web`: a [svelte-kit](https://kit.svelte.dev/) app.
- `docs`: a [svelte-kit](https://kit.svelte.dev/) app.
- `ui`: Svelte components used within the web app.
- `config-eslint`: Shared linting config across the repo.
- `config-typescript` Shared typescript config across the repo.

## Linting, prettier and CI

Because TypeScript, linting and prettier are provided globally within the repo, you'll need to make sure your IDE's project starts from the root of the monorepo to receive auto-fixes. During CI, Husky should check as you make commits.

General CI operations look like this:

- Format
- Lint
- TSC
- Create Turso DB prefixed with the PR number
- Deploy Vercel previews (setting env vars to the Turso DB and PR number)
  - Any child DBs made in the preview (like game sessions) will also get prefixed names
- On PR merge, clean up the DBs (with the prefix) made for / during the preview website

## Tests

Tests are run with [Playwright](https://playwright.dev/). Drop your tests in any of the app-folders and they will be run against the vercel preview URLs that are generated with your PR.

## Styling

- Vanilla CSS
- Global variables are stored in [a global CSS file](https://github.com/Siege-Perilous/tableslayer/blob/main/packages/ui/styles/globals.css) that can be imported into a top level [layout file](https://github.com/Siege-Perilous/tableslayer/blob/main/apps/web/src/routes/%252Blayout.svelte).

### Tech

This is a mono repo powered by [Turbo](https://turbo.build) and [Vite](https://vitejs.dev/).

- [Turbo](https://turbo.build) provides the monorepo build / packaging.
- [Svelte](https://svelte.dev/) provides the frontend framework. This repo uses Svelte 5. [This article](https://sveltekit.io/blog/svelte-5) provides a summary of the changes.
  - [Superforms](https://superforms.rocks/) + [Form Snap](https://formsnap.dev/) power the forms.
  - [Tanstack / Svelte query](https://tanstack.com/) for client fetching.
  - [Tweakpane](https://kitschpatrol.com/svelte-tweakpane-ui/docs/getting-started) for debug controls for the Three.js scene
- [Cloudflare R2](https://developers.cloudflare.com/r2/) is used for a CDN.
  - [Cloudflare Image Transformations](https://developers.cloudflare.com/images/transform-images/transform-via-url/) is used to resize images.
- [Resend](https://resend.com) is used for email management.
- [Turso](https://turso.com) is used for SQLite db hosting.
  - [Drizzle](https://orm.drizzle.team) provides the ORM
