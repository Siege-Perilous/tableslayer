## Summary

This stage has the following primary goals:

- Polish and provide variety to the effects.
- Keymapping / function exposure
- Allow for scene rotation and test full-screen usage
- Allow for MP4s in place of image backgrounds.
- Integration requests

### Effects

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

### Keymapping / function exposure

As the integration matures, I'm pretty sure there are going to be times where I will need more of the functions exposed with callbacks. Generally speaking, everything at the prop layer are things I can building keymapping around in the application, but I bet we'll run into things I'll need.

### Rotation of scene / fullscreen

We'll need a way to rotate the scene presented within the stage. Although the stage will be presented horizontally as far as the screen is concerned, the DM might think of the map vertically (players move "up" rather than "across"). We'll need a new prop to allow for this in editing mode, that will likely be ignored in the player view.

As we wire up the app, we'll need to consider how to do full screen. I THINK it'll just be fullscreening the browser itself, but I'd allot some time to issues that might come up between the two modes.

### MP4s as backgrounds

There is already a small community of MP4 mapmakers. Although Table Slayer allows you to build animating composite maps, players might still want to utilize MP4s. These would work exactly like the background images, but would loop.

### Integration requests

As I integrate the component into the app there are likely to be more integration requests. Things like "removing flicker during resize".

## Preview to v3 work

These are some features that I see happening in the next stage. They are not as important for a fully working system, so I mention them only for awareness as you set up your code.

- NPC Cards (Character cards you "drop" on the map temporarily).
- Transition animations
- Loading animations
- Non-map scenes (possibly different component)
- Realtime considerations (During app wireup)

## Preview to v4 work

- Procedural map generation (the dream!)
