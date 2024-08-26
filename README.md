# Table Slayer

Table Slayer provides tools for game masters to project animated battle maps on their digital tabletop.

## Development

To get started, edit your `.env` file and run `pnpm run dev` to load local development.

### Apps and packages

- `web`: a [svelte-kit](https://kit.svelte.dev/) app.
- `docs`: a [svelte-kit](https://kit.svelte.dev/) app.
- `ui`: Svelte components used within the web app.
- `config-eslint`: Shared linting config across the repo.
- `config-typescript` Shared typescript config across the repo.

### Tech

This is a mono repo powered by [Turbo](https://turbo.build) and [Vite](https://vitejs.dev/).

- [Svelte](https://svelte.dev/) provides the frontend framework.
  - [Superforms](https://superforms.rocks/) + [Form Snap](https://formsnap.dev/) power the forms.
  - [Tanstack / Svelte query](https://tanstack.com/) for client fetching.
- [Cloudinary](https://cloudinary.com) is used for a CDN.
- [Resend](https://resend.com) is used for email management.
- [Turso](https://turso.com) is used for SQLite db hosting.
  - [Drizzle](https://orm.drizzle.team) provides the ORM
