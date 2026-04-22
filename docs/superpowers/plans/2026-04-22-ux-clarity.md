# UX Clarity Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UX issues flagged by a designer: confusing Theme nav button, missing back navigation on blog posts, unclear floating button tooltips, and hectic background animation defaults.

**Architecture:** Three targeted file edits — SiteHeader gets a ☀️/🌙 pill toggle replacing the "Theme" button; SinglePost gets a `← Notes` breadcrumb; NetworkBackground gets clearer button titles and calmer default config values. No new components, no new files.

**Tech Stack:** Astro 4.x, Tailwind CSS. No test framework — verification is visual via `npm run dev`.

---

### Task 1: Replace "Theme" nav button with ☀️/🌙 pill toggle

**Files:**
- Modify: `src/components/SiteHeader.astro`

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open http://localhost:4321. Confirm the current nav shows: About · Tags · Search · GitHub · 🎨 Theme. The Theme button opens the settings panel. This is the behaviour we're replacing.

- [ ] **Step 2: Replace the Theme button with a pill toggle**

In `src/components/SiteHeader.astro`, replace lines 31–35:

```html
  <button id="open-network-config-header" class="nav-link inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-all duration-300 hover:scale-105">
    <Icon name="tabler:palette" class="w-4 h-4" />
    Theme
  </button>
```

With:

```html
  <div id="theme-pill" class="inline-flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-0.5 gap-0.5">
    <button id="theme-toggle-light" class="px-2 py-1 rounded-full text-sm transition-all duration-200" title="Light mode" aria-label="Light mode">☀️</button>
    <button id="theme-toggle-dark" class="px-2 py-1 rounded-full text-sm transition-all duration-200" title="Dark mode" aria-label="Dark mode">🌙</button>
  </div>
```

- [ ] **Step 3: Add the pill toggle script**

At the bottom of `src/components/SiteHeader.astro`, after the closing `</script>` tag of the existing `initHeaderLink` script block, add a new `<script>` block:

```html
<script>
  function initThemePill() {
    const lightBtn = document.getElementById('theme-toggle-light');
    const darkBtn = document.getElementById('theme-toggle-dark');
    if (!lightBtn || !darkBtn) return;

    const activeClass = ['bg-white', 'dark:bg-slate-700', 'shadow-sm'];

    function updatePill() {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        lightBtn.classList.remove(...activeClass);
        darkBtn.classList.add(...activeClass);
      } else {
        darkBtn.classList.remove(...activeClass);
        lightBtn.classList.add(...activeClass);
      }
    }

    function setTheme(theme: 'light' | 'dark') {
      const isDark = theme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      try { localStorage.setItem('theme', theme); } catch (e) {}
      updatePill();
    }

    lightBtn.addEventListener('click', () => setTheme('light'));
    darkBtn.addEventListener('click', () => setTheme('dark'));

    updatePill();
  }

  initThemePill();
  document.addEventListener('astro:after-swap', initThemePill);
</script>
```

- [ ] **Step 4: Verify in browser**

With dev server running at http://localhost:4321:
- Nav now shows ☀️/🌙 pill instead of "Theme" button
- Active mode icon has white background pill highlight
- Clicking ☀️ switches to light, clicking 🌙 switches to dark
- Pill highlight updates to reflect current mode
- No settings panel opens when clicking the pill
- Settings panel is still reachable via the floating ⚙️ button (bottom-right)

- [ ] **Step 5: Commit**

```bash
git add src/components/SiteHeader.astro
git commit -m "fix(ux) replace Theme nav button with inline light/dark pill toggle"
```

---

### Task 2: Add `← Notes` breadcrumb to blog posts

**Files:**
- Modify: `src/components/blog/SinglePost.astro`

- [ ] **Step 1: Confirm the problem**

Navigate to any blog post (e.g. http://localhost:4321/visualizing-code-evolution-with-gource or any post slug). Notice there is no back link — no nav, no breadcrumb. Only way back is browser back button or manually editing the URL.

- [ ] **Step 2: Add the back link**

In `src/components/blog/SinglePost.astro`, inside the `<header>` block, find the `<div class="flex justify-between flex-col sm:flex-row max-w-3xl mx-auto mt-0 mb-2 px-4 sm:px-6 sm:items-center">` on line 28.

Add a new `<div>` containing the back link **immediately before** that existing div (still inside `<header>`):

```html
    <div class="max-w-3xl mx-auto mt-0 px-4 sm:px-6 mb-4">
      <a href="/" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Notes
      </a>
    </div>
```

The full updated `<header>` opening now reads:

```html
    <header
      class={post.image
        ? 'intersect-once intersect-quarter motion-safe:md:opacity-0 motion-safe:md:intersect:animate-fade'
        : 'intersect-once intersect-quarter motion-safe:md:opacity-0 motion-safe:md:intersect:animate-fade'}
    >
      <div class="max-w-3xl mx-auto mt-0 px-4 sm:px-6 mb-4">
        <a href="/" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Notes
        </a>
      </div>
      <div class="flex justify-between flex-col sm:flex-row max-w-3xl mx-auto mt-0 mb-2 px-4 sm:px-6 sm:items-center">
```

- [ ] **Step 3: Verify in browser**

Navigate to a blog post. Confirm:
- `← Notes` link appears above the date/author metadata line
- It is styled in muted colour, turns primary on hover
- Clicking it navigates to `/` (home/notes feed)

- [ ] **Step 4: Commit**

```bash
git add src/components/blog/SinglePost.astro
git commit -m "fix(ux) add back-to-notes breadcrumb on blog posts"
```

---

### Task 3: Fix floating button tooltip titles

**Files:**
- Modify: `src/components/NetworkBackground.astro`

- [ ] **Step 1: Update the gear button title**

In `src/components/NetworkBackground.astro`, find the Settings button around line 135:

```html
    title="Settings (Ctrl+Shift+G)"
```

Change it to:

```html
    title="Background settings"
```

- [ ] **Step 2: Update the dice button title**

Find the Dice/Games button around line 126:

```html
    title="Play Games"
```

Change it to:

```html
    title="Games"
```

- [ ] **Step 3: Verify in browser**

On http://localhost:4321, hover over each floating button (bottom-right):
- ⚙️ button shows tooltip: `Background settings`
- 🎲 button shows tooltip: `Games`

- [ ] **Step 4: Commit**

```bash
git add src/components/NetworkBackground.astro
git commit -m "fix(ux) clarify floating button tooltip titles"
```

---

### Task 4: Set calmer background defaults

**Files:**
- Modify: `src/components/NetworkBackground.astro`

- [ ] **Step 1: Locate defaultConfig**

In `src/components/NetworkBackground.astro`, find `const defaultConfig = {` around line 416. The block looks like:

```typescript
    const defaultConfig = {
      // Nodes
      nodeCount: 60,
      nodeSize: 2,
      nodeSpeed: 0.3,
      ...
      mouseLightning: true,
      headerLightning: true,
      ...
      pulseEnabled: true,
      ...
    };
```

- [ ] **Step 2: Apply minimal preset values**

Update the following properties inside `defaultConfig` (leave all other properties unchanged):

```typescript
      nodeCount: 25,
      nodeSize: 3,
      nodeSpeed: 0.15,
      connectionDistance: 200,
      lineOpacity: 0.1,
      mouseLightning: false,
      headerLightning: false,
      pulseEnabled: false,
```

The exact lines to change:

| Find | Replace with |
|------|-------------|
| `nodeCount: 60,` | `nodeCount: 25,` |
| `nodeSize: 2,` | `nodeSize: 3,` |
| `nodeSpeed: 0.3,` | `nodeSpeed: 0.15,` |
| `connectionDistance: 150,` | `connectionDistance: 200,` |
| `lineOpacity: 0.15,` | `lineOpacity: 0.1,` |
| `mouseLightning: true,` | `mouseLightning: false,` |
| `headerLightning: true,` | `headerLightning: false,` |
| `pulseEnabled: true,` | `pulseEnabled: false,` |

- [ ] **Step 3: Verify in browser — first-time visitor**

To simulate a first-time visitor (no saved config), open browser DevTools → Application → Local Storage → delete the `networkConfig` key. Reload http://localhost:4321.

Confirm:
- Fewer nodes visible (~25 instead of 60)
- No lightning effects when moving mouse
- No auto-pulse radiating from cursor
- Background feels ambient, not distracting

- [ ] **Step 4: Verify existing config is preserved**

Without deleting localStorage, reload the page. If a `networkConfig` key exists, the saved config should load unchanged (the user's existing settings are unaffected).

- [ ] **Step 5: Verify "Default" preset still resets to old values**

Open the ⚙️ settings panel → click "Default" preset. The animation should return to the original busy defaults (60 nodes, lightning on, pulse on). This confirms the preset system is independent from `defaultConfig`.

Wait — the `default` preset is defined as `{ ...defaultConfig }` which spreads the default config at the time the presets object is created. Since we changed `defaultConfig`, the "Default" preset will now apply the new minimal values too. 

**Decision:** This is intentional — the "Default" preset should reflect our new default. The "Electric", "Dense", etc presets are the way to get the busier effects. No code change needed here, just confirm this behaviour is acceptable.

- [ ] **Step 6: Commit**

```bash
git add src/components/NetworkBackground.astro
git commit -m "fix(ux) set minimal background animation as default for new visitors"
```
