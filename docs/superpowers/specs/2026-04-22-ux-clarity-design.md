# UX Clarity Improvements

**Date:** 2026-04-22  
**Status:** Approved

## Problem

UX designer flagged three clarity issues:
1. Buttons — "Theme" nav link opens a full settings panel (unexpected), dice button purpose unclear
2. Back buttons — blog posts and inner pages have no back navigation
3. Hectic background — default network animation is too busy (lightning + pulse + 60 nodes simultaneously)

## Scope

Four targeted changes. No visual redesign, no layout restructure.

---

## Change 1: Nav theme toggle

**File:** `src/components/SiteHeader.astro`

Remove the "Theme" nav link (which confusingly opens the settings panel). Replace with an inline ☀️/🌙 pill toggle that directly switches light/dark mode.

- Pill sits inline with other nav links, same vertical alignment
- Active mode icon has white background + shadow; inactive is flat
- Clicking either icon calls `applyTheme('light')` or `applyTheme('dark')` directly — same function already used in the settings panel
- "Theme" nav link and its `open-network-config-header` event listener are removed

## Change 2: Back breadcrumb

**File:** `src/components/blog/SinglePost.astro`

Blog posts use `Layout` (not `PageLayout`), so they render no `SiteHeader` and have zero navigation. Inner pages (About, Tags, Search) use `PageLayout` which already includes `SiteHeader` with nav links — no change needed there.

Add `← Notes` link at the top of `SinglePost.astro`, above the post metadata row.

- Text: `← Notes`, links to `/`
- Styled as small muted link matching existing `text-muted` convention
- Placed inside the existing `max-w-3xl mx-auto px-4 sm:px-6` container, above the metadata `<p>` tag

## Change 3: Floating button titles

**File:** `src/components/NetworkBackground.astro`

Fix `title` attributes on the two floating buttons:
- Gear button: `title="Background settings"` (was `"Settings (Ctrl+Shift+G)"`)
- Dice button: `title="Games"` (was `"Play Games"`)

No visual change. Native browser tooltip clarifies purpose on hover.

## Change 4: Background default config

**File:** `src/components/NetworkBackground.astro`

Change `defaultConfig` to match the existing "minimal" preset values:

| Property | Old default | New default |
|---|---|---|
| `nodeCount` | 60 | 25 |
| `nodeSpeed` | 0.3 | 0.15 |
| `nodeSize` | 2 | 3 |
| `connectionDistance` | 150 | 200 |
| `lineOpacity` | 0.15 | 0.1 |
| `mouseLightning` | true | false |
| `headerLightning` | true | false |
| `pulseEnabled` | true | false |

Existing users with a saved `networkConfig` in localStorage are unaffected — their config loads over the default. Only first-time visitors see the new calmer default.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/SiteHeader.astro` | Remove Theme nav link, add ☀️/🌙 pill toggle |
| `src/components/blog/SinglePost.astro` | Add `← Notes` breadcrumb above post metadata |
| `src/components/NetworkBackground.astro` | Fix button titles, update defaultConfig |
