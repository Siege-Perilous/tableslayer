## Summary

We need a UI component for rendering the battlemap. This will be used to display the game field to both the Game Master (GM) and the players.

## Delivery

OK to deliver as a single branch, multiple or single PRs... whatever feels comfortable. The `apps/doc` application can be used to render the component and provide any additional wrappers / functionality needed to complete the prototype. The component should be viewable at http://localhost:5173/stage (which already works).

## Svelte considerations

- We're using Svelte 5, which is nearing production. In general Svelte 4 is mostly compatible with Svelte 5, but if possible do things the Svelte 5 way. A good summary is [available here](https://sveltekit.io/blog/svelte-5).

## Tech requirements

The monorepo will likely change often in the `app` project. The current version of `svelte` will need to be in sync in the `ui` and `app/web` packages so you might want to merge up often.

- Component should live in the `packages/ui/` directory and be exportable for use in the `web` or `docs` app. A basic example already exists in the docs.
- Can work with either native `three` or `threlte`. `threlte` will require `@next` (already in the example) to work with Svelte 5.
- The prototype does not require real controls, and can be provided by [Dat](https://github.com/dataarts/dat.gui) or simple buttons provided from outside the component if needed.
- This can be a stateless component. The assumption should be that the web app will handle data storage, and everything should be passed down through props.
- The component should have prop passthru.
- Any CSS required should be vanilla.

## Layer order

The `<Stage />` always maintains the same `layers`. Some layers might not be in use, but the layer positioning on the z-axis should always remain the same:

- Pings
- Grid
- Weather
- Fog of war
- Lighting
- Terrain

## View modes

The stage will be viewable in three modes. This likely will have nothing to do with the component itself, and can be provided by outside routing and prop passthru. It's discussed here only for background context.

- Editor mode: for creating scenes and making edits to the map.
- GM play mode: for editing the fog of war and placing "pings".
- Viewer mode: displayed on a separate monitor from the GM. No interaction is possible.

## Feature checklist

[Basic wireframe](https://whimsical.com/VgRYQvLYUrSNxqtHsGUWLy)

- [ ] Can set the size of the stage (from an array of typical monitor / tv size... 1080p, 720p... etc).
- [ ] Can rotate the stage in 90deg increments.
- [ ] Can upload an image for the background layer
- [ ] Can move and scale the image within the screen.
  - Any overflow outside the screen should be hidden
  - The image should initially try to size itself properly within the screen (similar to CSS `cover`)
- [ ] Can create a grid layer with square and hex format. The size, color and opacity of the grid should be configurable.
  - This can be a simple CSS layer above the canvas.
- [ ] Can create a fog of war that sits above the background
  - Fog of war starts as a full plane that covers the entire size of the stage.
  - If the screen size changes, the fog of war should reset and resize.
  - Fog of war might provide different styles (volumetric clouds, solid color...etc)
  - The fog of war needs to be "erasable" from the GMs point of view.
  - The fog of war should allow to be "reset" or "removed" in one click.
  - Once erased, a separate mode should allow fog of war to be added back onto erased areas.
  - Able to set opacity of this layer. For example, you might want players to "see through" the fog.
- [ ] Can create a weather effect created from an array of effects provided.
  - Snow, drizzle, downpour, heat effect...etc. A proof of concept is good enough here.
  - The weather should size appropriately to the screen automatically.
  - Able to set opacity of this layer
- [ ] An exploration for what a lighting layer might look like
  - Could be hue / lightness slider presets that are assigned to a "mood"? This could just be a layer that sits above the image itself and performs an overlay.
  - Could be placable "lights" that sit over the background layer?
- [ ] GM should be able to "ping" a location on the grid using their mouse pointer. This can just be a basic circle effect for now. The ping should show above all layers.

## Outside considerations

- The stage component will exist as a "scene" within a "game session". A GM will rapidly change scenes, but rarely change a "session" during each play.
- We'll want to provide a wipe effect for transitioning between scenes. This could be a fun three JS effect that might mask a loader?
- The web app will be powered by SQLite. We'll need to eventually think of the best way to work with real-time updates with the data layer so the GM vs. Player view syncs.

## Things specifically not expected at this point of the project

The following would happen in a later stage of this project

- Wiring up the component into the app
- Maintaining edits outside of the browser session through a data layer
- Refinement of all the layers beyond a prototype (more and better effects)
- Maintaining real-time state without a data layer.
