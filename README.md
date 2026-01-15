# TableSlayer

Table Slayer provides tools for game masters to project animated battle maps on their digital tabletop.

![Table Slayer](https://snid.es/2025MAR/u3TtzdPZ8LzoxyA5.png)

## Credits

[Dave Snider](https://davesnider.com) designs and builds Table Slayer. The Three JS Stage component was built by [Dan Greenheck](https://dangreenheck.com/). Illustrations and logo provided by [Cinnamon Devil](https://cinnamondevilsart.com/).

## License & open source contributions

Table Slayer is available under a functional source [license](LICENSE.md) that becomes Apache 2 after two years. You are free to host and modify Table Slayer on your own as long as you don't try to build a competing business. The primary intention of the source being open is so hobbyists can get familiar with a large Svelte codebase. We welcome PRs and bug reports. If you are planning a large feature, please make an issue first. Any PRs you contribute will fall under the same usage license.

## Design philosophy

This project is managed under some core philosophies. These are hard opinions that will never change.

#### Built for speed

User interactions in Table Slayer should be near instant. The use of loading spinner states should be minimal. Do not load the application piecemeal. You should be able to interact with the application immediately after load. First loads should be server side. Any technology decision should ask "will this make Table Slayer slower?".

#### Don't passively track, actively listen

Table Slayer is built completely in the dark, ignoring modern design trends of analytic-driven decision making. We don't track you. New features are considered by talking to users and listening to the community.

#### The less dependencies, the better

Avoid large dependencies beyond core framework choices. All design components should be hand crafted and use vanilla CSS.

## Development

This repo requires certain Node and `pnpm` versions. These can be checked in `package.json`. If working in multiple Node based projects, you might want to use [nvm](https://github.com/nvm-sh/nvm) to manage your Node version and [corepack](https://nodejs.org/api/corepack.html#enabling-the-feature) (which comes with Node and needs to be enabled) to switch your package manager. If both are installed, it should auto-switch your versions as you enter the folder.

`pnpm run dev` should open all the apps under their own port.

To get started, edit the `.env` file in each `app` and run `pnpm run dev` to load local development.

A full guide for self-hosting is coming soon. Here's a quick list for anyone who wants to get up and running.

1. Copy `.env-example` in the `apps/web` folder to `.env`
2. Create a new database on Turso (or use libsql directly](https://github.com/Siege-Perilous/tableslayer/issues/243#issuecomment-3613109830)). Add the required keys to `.env`.
3. Create a Cloudflare account. Add the required API keys to `.env`.
   - You will need to set up an R2 bucket for assets and uploads. If self-hosting, you can run `pnpm run assets:upload` to populate your bucket with any large files that are excluded from this repo (ex: illustrations and LUT files).
   - You will need to setup [Partykit](https://docs.partykit.io/) with a partykit token. For dev, Parykit will run locally. For production, Partykit is hosted with Cloudflare workers.
4. `pnpm install` in the root of this repo.
5. Jump into the `apps/web` folder and run `pnpm run migrate` to initialize your db.
6. Run `pnpm run dev` from the repo root. Two runservers will open.
   - http://localhost:5174 for the web
   - http://localhost:5173 for the ui docs

There are Fly configs in the root should you want to deploy.

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

### Tech

This is a mono repo powered by [Turbo](https://turbo.build) and [Vite](https://vitejs.dev/). In general Table Slayer aims to use a minimal amount of dependencies. We prefer low-level dependencies, rather than component libraries. Think carefully when submitting a PR that includes a new dependency.

- [Fly](https://fly.io) provides hosting
- [Turbo](https://turbo.build) provides the monorepo build / packaging.
- [Svelte](https://svelte.dev/) provides the frontend framework. This repo uses Svelte 5. [This article](https://sveltekit.io/blog/svelte-5) provides a summary of the changes.
  - [Tanstack / Svelte query](https://tanstack.com/) for client fetching.
  - [Tweakpane](https://kitschpatrol.com/svelte-tweakpane-ui/docs/getting-started) for debug controls for the Three.js scene
- [Cloudflare R2](https://developers.cloudflare.com/r2/) is used for a CDN.
  - [Cloudflare Image Transformations](https://developers.cloudflare.com/images/transform-images/transform-via-url/) is used to resize images.
- [Party Kit](https://www.partykit.io/) hosted on Cloudflare workers handle realtime web socket updates.
  - [Yjs](https://yjs.dev/) provides conflict resolution and typing for the Party Kit Layer
- [Resend](https://resend.com) is used for email management.
- [Turso](https://turso.com) is used for SQLite db hosting.
  - [Drizzle](https://orm.drizzle.team) provides the ORM
- [Stripe](https://stripe.com) provides billing and subscription management

### Security

If you notice a security issue, please report it to `dave@tableslayer.com`
