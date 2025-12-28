---
publishDate: 2024-12-28
title: Building with Astro
excerpt: Why I chose Astro for my digital garden and how the site is structured.
tags:
  - astro
  - webdev
  - tools
category: notes
---

## Why Astro?

Astro is a modern static site generator that's perfect for content-focused sites. Key features:

- **Zero JS by default** — Ship HTML, add JS only when needed
- **Content Collections** — Type-safe content management
- **Fast** — Optimized for performance out of the box
- **Flexible** — Use any UI framework or none at all

## Site Structure

This site uses the [AstroWind](https://github.com/onwidget/astrowind) template as a foundation, customized for a digital garden:

```
src/
├── components/    # UI components
├── data/post/     # Notes as Markdown files
├── layouts/       # Page layouts
├── pages/         # Routes
└── config.yaml    # Site configuration
```

## Features

### From AstroWind
- Tailwind CSS styling
- Dark mode support
- SEO optimization
- RSS feed

### Digital Garden Additions
- Tag-based navigation
- Backlinks between notes
- Clean, reading-focused design

## Related

- [My Obsidian Workflow](/obsidian-workflow) — How notes start in Obsidian
- [What is a Digital Garden?](/digital-garden) — The philosophy behind this site
