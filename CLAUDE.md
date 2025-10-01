# Claude code guidelines for Table Slayer

## Implementation best practices

### 0 — Purpose

These rules ensure maintainability, safety, and developer velocity.
**MUST** rules are enforced by CI; **SHOULD** rules are strongly recommended

### 1 — Before Coding

- **BP-1 (MUST)** Ask the user clarifying questions.
- **BP-2 (SHOULD)** Draft and confirm an approach for complex work.
- **BP-3 (SHOULD)** If ≥ 2 approaches exist, list clear pros and cons.
- **BP-4 (MUST)** For large tasks (>3 files or new features), ask to create a spec document in `/spec` folder before coding
- **BP-5 (SHOULD)** After completing a spec-driven task, ask if an architecture document should be created in `/docs` for future reference

### 2 — While Coding

- **C-1 (MUST)** Name functions with existing domain vocabulary and style
- **C-2 (SHOULD)** Prefer arrow functions
- **C-3 (SHOULD)** Put small, reusable functions into utility files
- **C-4 (SHOULD NOT)** Add comments except for critical caveats or tops of functions; rely on self‑explanatory code
- **C-5 (MUST)** Use `apiFactory` for all API endpoints in `/routes/api/` to ensure consistent validation and error handling
- **C-6 (MUST)** Use `mutationFactory` for frontend mutations and `createQuery` for frontend queries in `/lib/queries/`

### 3 — Database

- **D-1 (SHOULD)** Use existing drizzle schema patterns in scehema.ts file
- **D-2 (SHOULD)** Creating typing and Zod types according to that file
- **D-3 (DO NOT)** generate or run migrations. Prompt the user to perform these tasks instead, waiting for confirmation
- **D-4 (DO NOT)** run `pnpm run push` or any direct database commands. Always ask the user to run these commands
- **D-5 (IMPORTANT)** Timestamps in this database use `integer({ mode: 'timestamp' })` which stores **Unix timestamps in SECONDS** (not milliseconds). When user provides a timestamp from the database, use `date -d @<timestamp>` to convert it to a readable date. Do not attempt manual conversion as you frequently make errors with this.

### 4 - Tooling gates

- **G-1** `pnpm run check` passes
- **G-2** `pnpm run format-check` passes

### 5 - Important File References

- **REF-1** CSS variables are defined in `packages/ui/src/lib/styles/globals.css`
- **REF-2** Database schema is in `apps/web/src/lib/db/app/schema.ts`
- **REF-3** UI components are in `/packages/ui/src/lib/components/`

## Writing functions best practices

When evaluating whether a function you implemented is good or not, use this checklist:

1. Can you read the function and HONESTLY easily follow what it's doing? If yes, then stop here.
2. Does the function have very high cyclomatic complexity? (number of independent paths, or, in a lot of cases, number of nesting if if-else as a proxy). If it does, then it's probably sketchy.
3. Are there any common data structures and algorithms that would make this function much easier to follow and more robust? Parsers, trees, stacks / queues, etc.
4. Are there any unused parameters in the function?
5. Are there any unnecessary type casts that can be moved to function arguments?
6. Brainstorm 3 better function names and see if the current name is the best, consistent with rest of codebase.

IMPORTANT: you SHOULD NOT refactor out a separate function unless there is a compelling need, such as:

- the refactored function is used in more than one place
- the refactored function is easily unit testable while the original function is not AND you can't test it any other way
- the original function is extremely hard to follow and you resort to putting comments everywhere just to explain it

## CSS best practices

1. **CSS-1 (MUST)** Use BEM (Block Element Modifier) naming convention:
   - Block: The main component name (e.g., `promo`, `admin`)
   - Element: Sub-parts of the block with double underscores (e.g., `promo__panel`, `admin__section`)
   - Modifier: Variations with double hyphens (e.g., `promo__party--selected`, `admin__status--active`)
   - Example: `.block__element--modifier`
2. **CSS-2 (MUST)** Use CSS variables from `packages/ui/src/lib/styles/globals.css` instead of hardcoded colors
   - Use theme-aware variables like `var(--fg)`, `var(--bg)`, `var(--fgPrimary)`, `var(--fgMuted)`, `var(--fgDanger)`
   - Avoid using specific color values directly
3. **CSS-3 (SHOULD)** Follow existing component patterns and spacing conventions

## UI Text Guidelines

- **UI-1 (MUST)** Use sentence case for all UI text including:
  - Page titles and headings (e.g., "Verify your email" not "Verify Your Email")
  - Button labels (e.g., "Create party" not "Create Party")
  - Form labels (e.g., "Party name" not "Party Name")
  - Navigation items (e.g., "Sign up" not "Sign Up")
  - Error messages (e.g., "Email already in use" not "Email Already In Use")
- **UI-2** Exception: Proper nouns and product names should retain their capitalization (e.g., "Table Slayer", "Google")

## Component Guidelines

- **COMP-1** Use `.svelte` files for components
- **COMP-2** Export types from `types.ts` files
- **COMP-3** Use barrel exports in `index.ts` files
- **COMP-4** Follow existing component patterns in `/packages/ui`

## Documentation and Specifications

### Spec Documents (Before Implementation)

- **SPEC-1 (MUST)** For any large task (affecting >3 files, adding new features, or significant refactoring), offer to create a spec document
- **SPEC-2** Spec documents should be created in `/spec` folder with descriptive names (e.g., `user-authentication-flow.md`)
- **SPEC-3** Spec should include:
  - Problem statement
  - Proposed solution
  - Implementation approach
  - Files to be modified/created
  - Testing strategy
  - Potential edge cases

### Architecture Documents (After Implementation)

- **ARCH-1 (SHOULD)** After completing a spec-driven task, ask: "Should I create an architecture document in /docs for future reference?"
- **ARCH-2** Architecture docs should explain:
  - High-level design decisions
  - Component interactions
  - Data flow
  - Key functions and their purposes
  - How to modify or extend the feature
