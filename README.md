# TableSlayer

Table Slayer provides tools for game masters to project animated battle maps on their digital tabletop.

## Credits

[Dave Snider](https://davesnider.com) designed and built Table Slayer. The Three JS Stage component was built by [Dan Greenheck](https://dangreenheck.com/). Illustrations by [Cinnamon Devil](https://cinnamondevilsart.com/)

## License & open source contributions

Table Slayer is available under a functional source [license](LICENSE.md) that becomes Apache 2 after two years. You are free to host and modify Table Slayer on your own as long as you don't try to build a competing business. The primary intention of the source being open is so hobbyists can get familiar with a large Svelte codebase. We welcome PRs and bug reports. If you are planning a large feature, please make an issue first. Any PRs you contribute will fall under the same usage license.

## Design philosophies

This project is managed under some core philosophies. These are hard opinions that will never change.

#### Built for speed

User interactions in Table Slayer should be near instant. The use of loading spinner states should be minimal. Do not load the application piecemeal. You should be able to interact with the application immediately after load. First loads should be server side. Any technology decision should ask "will this make Table Slayer slower?".

#### Don't passively track, actively listen

Table Slayer is built completely in the dark, ignoring modern design trends of analytic-driven decision making. We don't track you. New features are considered by talking to users and listening to the community.

#### The less dependencies, the better

Avoid large dependencies beyond the core framework choices. All design components should be hand crafted and use vanilla CSS.

## Development

This repo requires certain Node and `pnpm` versions. These can be checked in `package.json`. If working in multiple Node based projects, you might want to use [nvm](https://github.com/nvm-sh/nvm) to manage your Node version and [corepack](https://nodejs.org/api/corepack.html#enabling-the-feature) (which comes with Node and needs to be enabled) to switch your package manager. If both are installed, it should auto-switch your versions as you enter the folder.

`pnpm run dev` should open all the apps under their own port.

To get started, edit the `.env` file in each `app` and run `pnpm run dev` to load local development.

### Apps and packages

Table Slayer is a Turbo mono repo split into several projects.

- `web`: a [svelte-kit](https://kit.svelte.dev/) app for [tableslayer.com](https://tableslayer.com).
- `docs`: a [svelte-kit](https://kit.svelte.dev/) app that is a playground of UI components.
- `ui`: Svelte components used within the web app.
- `config-eslint`: Shared linting config across the repo.
- `config-typescript` Shared typescript config across the repo.

### Linting, prettier and CI

Because TypeScript, linting and prettier are provided globally within the repo, you'll need to make sure your IDE's project starts from the root of the monorepo to receive auto-fixes. During CI, Husky should check as you make commits.

The CI scripts will make a pass on any incoming PRs and do the following:

- Check for Prettier, TypeScript and Svelte errors.
- Create a Turso DB prefixed with the PR number, then run any migrations in your PR
- Deploy a Fly preview app (setting env vars to the Turso DB and PR number)
- Run Playwright tests against the preview
- On PR merge, destroy the temporary DBs and Fly apps.

### Tests

Tests are run with [Playwright](https://playwright.dev/). Drop your tests in any of the app-folders and they will be run against the Fly preview URLs that are generated with your PR.

### Styling

- Vanilla CSS
- Global variables are stored in [a global CSS file](https://github.com/Siege-Perilous/tableslayer/blob/main/packages/ui/styles/globals.css) that can be imported into a top level [layout file](https://github.com/Siege-Perilous/tableslayer/blob/main/apps/web/src/routes/%252Blayout.svelte).

### Billing

Billing is handled through [Stripe](https://stripe.com). To test the billing system locally you will need to set up webhook forwarding through Stripe's tooling.

### Tech

This is a mono repo powered by [Turbo](https://turbo.build) and [Vite](https://vitejs.dev/). In general Table Slayer aims to use a minimal amount of dependencies. We prefer low-level dependencies, rather than component libraries. Think carefully when submitting a PR that includes a new dependency.

- [Fly](https://fly.io) provides hosting
- [Turbo](https://turbo.build) provides the monorepo build / packaging.
- [Svelte](https://svelte.dev/) provides the frontend framework. This repo uses Svelte 5. [This article](https://sveltekit.io/blog/svelte-5) provides a summary of the changes.
  - [Tanstack / Svelte query](https://tanstack.com/) for client fetching.
  - [Tweakpane](https://kitschpatrol.com/svelte-tweakpane-ui/docs/getting-started) for debug controls for the Three.js scene
- [Cloudflare R2](https://developers.cloudflare.com/r2/) is used for a CDN.
  - [Cloudflare Image Transformations](https://developers.cloudflare.com/images/transform-images/transform-via-url/) is used to resize images.
- [Resend](https://resend.com) is used for email management.
- [Turso](https://turso.com) is used for SQLite db hosting.
  - [Drizzle](https://orm.drizzle.team) provides the ORM
