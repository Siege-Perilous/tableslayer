## Summary

This stage has three primary goals:

- Polish and provide variety to the effects.
- Provide a "selected layer" concept, and provide documentation patterns for how to pass down prop state based on mouse / click patterns.
- Provide helper functions for sensible prop defaults

## Effects

Please be creative and add your expertise. The list below is suggestive, rather than specific. Follow your artistic fancies.

- Fog of war variety
  - Clouds of various types
- Weather variety
  - Snow
  - Lightning
  - Fog (as weather under Fog of war)
  - More rain / snow types
- Mood
  - Provide a color / shading system that change the "mood" of the sandwiched stage (outside of grid). This can be slightly animated.
    - Vampire
    - Dusk
    - Dawn
    - Ethereal
    - Overcast
    - High noon
    - ...etc?

## Selected layer / Documentation of event -> prop passdown

At the prop level we should likely have a concept of a "Selected Layer". I'm unsure if this event system should live outside of the `Stage` and just provide passdown (probably?), or if they should be built in abilities to the component itself (seems less flexible?).

As an example you might have the following scenarios.

#### Dealing with Fog

- Selected layer is Fog of war
  - Left click erases
  - Shift click adds back
  - Scroll up / down increase size of brush
  - (likely something I should do with other components)
    - Right click provides context menu, allowing selection of brush type, reset, and reveal buttons...etc.

#### Background layer

- Selected layer is background
  - Scroll up / down scales
  - Left mouse drag pans

#### Grid

- Selected layer is Grid
  - Left mouse drag sets offset
  - Scroll up / down sets scale

### Weather Layer

- Selected layer is weather
  - Scroll up / down for scale
  - Shift scroll up / down for speed ...etc

## Helper functions for defaults

A lot of the prop layer should come with sensible defaults that can be calculated from the screen dimensions and size. Given screen size and resolution, we can calculate the scales of most everything.

- Grid scale (presets and defaults 1 inch, 1.5 inch...etc)
- Grid alignment
- Fog of war effect scale
- Weather scale
- Ping size...etc

## Preview to v3 work

These are some features that I see happening in the next stage. They are not as important for a fully working system, so I mention them only for awareness as you set up your code.

- MP4s as a background layer
- NPC Cards (Character cards you "drop" on the map temporarily).
- Transition animations
- Loading animations
- Non-map scenes (possibly different component)
- Realtime considerations (During app wireup)

## Preview to v4 work

- Procedural map generation (the dream!)
