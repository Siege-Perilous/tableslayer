# Getting GPU acceleration working for Playwright + ThreeJS testing

**TL;DR**: Using a GPU runner for your GitHub Actions doesn't automatically give you GPU acceleration in Chromium. You need xvfb, headed mode, special Chrome flags, AND you might need to load the NVIDIA kernel modules yourself.

## The problem

We have a ThreeJS-based virtual tabletop app. The scene editor and playfield both render to a WebGL canvas. Our Playwright tests were taking forever - like 5+ minutes - because every time a test loaded a page with a canvas, it would sit there for 20-30 seconds waiting for the ThreeJS scene to initialize.

The obvious solution: use a GPU runner! GitHub has them now. Problem solved, right?

Nope.

## What we tried first

We switched our test job to use `gpu-linux-4`, which gives you an NVIDIA Tesla T4 with 16GB VRAM. Fancy.

```yaml
runs-on: gpu-linux-4
```

Tests still took 5 minutes. Canvas still took 20+ seconds to load.

We added a diagnostic test to check what WebGL renderer Chromium was actually using:

```
Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device...))
Status: SOFTWARE RENDERING
```

SwiftShader. That's Chromium's built-in _software_ renderer. It was completely ignoring the Tesla T4.

## The first realization: headless Chromium doesn't use GPUs

Turns out, headless Chromium just... doesn't use GPU hardware. By design. Even if you have a fancy Tesla T4 sitting right there, headless mode uses software rendering.

The fix? Run in **headed mode** with **xvfb** (X Virtual Framebuffer). xvfb creates a virtual display, and headed Chromium will actually use the GPU rendering pipeline.

```yaml
run: xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" pnpm run test:xvfb
```

And in our Playwright config, we added Chrome flags to encourage GPU usage:

```typescript
const gpuArgs = process.env.CI
  ? [
      '--ignore-gpu-blocklist',
      '--use-angle=vulkan',
      '--enable-features=Vulkan',
      '--use-gl=angle',
      '--enable-gpu-rasterization',
      '--enable-zero-copy'
    ]
  : [];
```

This got us somewhere! Tests dropped to 1.6 minutes. But we still weren't using the actual GPU:

```
Renderer: ANGLE (Mesa, Vulkan 1.4.318 (llvmpipe (LLVM 20.1.2...)))
```

llvmpipe is Mesa's software renderer. Way faster than SwiftShader, but still not hardware acceleration.

## Side quest: can we just use xvfb on a cheaper runner?

At this point we thought - if we're just using software rendering anyway, why pay for a GPU runner? Let's try xvfb on a standard `linux-4-core` runner.

Nope. Back to SwiftShader, back to 5+ minute test times.

The GPU runner image ("Ubuntu NVIDIA GPU-Optimized Image for AI and HPC") comes with Mesa and llvmpipe pre-installed. The standard Ubuntu runner doesn't have those - it only has Chromium's built-in SwiftShader. So even the "failed" GPU setup was giving us a 3x speedup just from the better software renderer in the image.

We switched back to the GPU runner.

## The second realization: the GPU driver isn't loaded

We ran `nvidia-smi` in CI to check on our fancy GPU:

```
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.
```

Wait, what? We have a GPU runner with a Tesla T4 but the driver isn't working?

Checked for device files:

```
/dev/nvidiactl  ← exists
/dev/nvidia0   ← missing!
```

The NVIDIA driver is _installed_ on the GPU runner image, but the kernel modules aren't _loaded_ by default. The `/dev/nvidia0` device (the actual GPU) only appears after you load the modules.

## The fix

```yaml
- name: Setup and check GPU
  run: |
    sudo modprobe nvidia
    sudo modprobe nvidia_uvm
    nvidia-smi
```

That's it. Two modprobe commands.

After that:

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 570.133.20    Driver Version: 570.133.20    CUDA Version: 12.8   |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
|   0  Tesla T4            On   | 00000001:00:00.0 Off |                  Off |
+-------------------------------+----------------------+----------------------+
```

And our diagnostic test now shows:

```
Renderer: ANGLE (NVIDIA, Vulkan 1.4.303 (NVIDIA Tesla T4...))
Status: NVIDIA GPU DETECTED
```

## The results

| Setup                        | Renderer    | Canvas Load | Total Time |
| ---------------------------- | ----------- | ----------- | ---------- |
| Standard runner              | SwiftShader | 20-32s      | 5+ min     |
| GPU runner (no setup)        | SwiftShader | 20-32s      | 5+ min     |
| GPU runner + xvfb            | llvmpipe    | 1-6s        | 1.6 min    |
| GPU runner + xvfb + modprobe | Tesla T4    | 300ms-1.4s  | 1.4 min    |

Canvas loads went from 20-30 seconds to under a second. Total test time went from 5+ minutes to 1.4 minutes.

**But the bigger win was stability.** With SwiftShader, tests were flaky - canvas timeouts, elements not ready, interactions failing. The 20-30 second canvas loads meant we were constantly bumping up timeouts and adding retry logic. With actual GPU rendering (or even llvmpipe), the canvas initializes fast enough that the normal test flow just works.

**On cost**: GPU runners are more expensive than standard runners (roughly 3-4x per minute), but when your tests run in 1.4 minutes instead of 5+, you end up paying about the same or less. And you're not babysitting flaky tests. For us, the stability alone justified the GPU runner - the speed improvement was a bonus.

## What you need

If you're testing a WebGL/ThreeJS app with Playwright on GitHub Actions GPU runners:

1. **Use a GPU runner**: `runs-on: gpu-linux-4` (or similar)

2. **Load the NVIDIA kernel modules**:

   ```yaml
   - run: |
       sudo modprobe nvidia
       sudo modprobe nvidia_uvm
   ```

3. **Run tests in headed mode with xvfb**:

   ```yaml
   - run: xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" playwright test --headed
   ```

4. **Add GPU flags to Playwright config**:

   ```typescript
   launchOptions: {
     args: ['--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan', '--use-gl=angle'];
   }
   ```

5. **Add a diagnostic test** to verify what renderer you're actually getting. You don't want to find out months later that you've been paying for a GPU runner that was using software rendering the whole time.

## Fallback behavior

The nice thing about this setup is it degrades gracefully. If the modprobe fails for some reason, you still get llvmpipe (1.6min). If xvfb fails, you fall back to SwiftShader (slow, but tests still pass). The GPU acceleration is a nice speedup, not a hard requirement.

---

_This was way more complicated than "just use a GPU runner" and took a fair bit of debugging to figure out. Hopefully this saves someone else the trouble._
