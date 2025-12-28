# Djaygo.github.io

Personal website built with [Hugo](https://gohugo.io/) and hosted on GitHub Pages.

🌐 **Live Site**: [https://djaygo.github.io/](https://djaygo.github.io/)

## 📋 About

This is a static website generated using Hugo, a fast and flexible static site generator. The site uses the [Ananke theme](https://github.com/theNewDynamic/gohugo-theme-ananke) and is automatically deployed to GitHub Pages via GitHub Actions.

## 🚀 Quick Start

### Prerequisites

- [Hugo](https://gohugo.io/getting-started/installing/) (extended version recommended)
- [Git](https://git-scm.com/)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Djaygo/Djaygo.github.io.git
   cd Djaygo.github.io
   ```

2. **Initialize the theme submodule**
   ```bash
   git submodule update --init --recursive
   ```

3. **Run the development server**
   ```bash
   hugo server -D
   ```

4. **View the site**

   Open your browser and navigate to `http://localhost:1313`

   The `-D` flag includes draft posts in the preview.

## 📝 Creating Content

### New Blog Post

To create a new blog post:

```bash
hugo new posts/my-new-post.md
```

This will create a new markdown file in `content/posts/` with the default frontmatter. Edit the file to add your content.

### Frontmatter

Each post includes frontmatter (metadata) at the top:

```yaml
---
title: "Post Title"
date: 2024-01-01T12:00:00+00:00
draft: false
tags: ["tag1", "tag2"]
categories: ["category"]
---
```

**Important**: Set `draft: false` to publish the post on the live site.

## 🏗️ Project Structure

```
Djaygo.github.io/
├── .github/workflows/    # GitHub Actions CI/CD
│   └── gh-pages.yml     # Auto-deployment workflow
├── archetypes/          # Content templates
├── content/             # Site content (posts, pages)
│   └── posts/          # Blog posts
├── public/              # Generated static files (auto-generated)
├── themes/              # Hugo themes
│   └── ananke/         # Current theme (submodule)
├── config.toml          # Hugo configuration
└── README.md           # This file
```

## 🔧 Configuration

Site configuration is managed in `config.toml`. Key settings include:

- `baseURL`: Site URL
- `title`: Site title
- `theme`: Theme name
- Additional parameters for navigation, social links, etc.

## 🚢 Deployment

The site is automatically deployed using GitHub Actions:

1. Push changes to the `master` branch
2. GitHub Actions workflow triggers automatically
3. Hugo builds the static site
4. Content is deployed to the `gh-pages` branch
5. GitHub Pages serves the site from the `gh-pages` branch

### Manual Build

To build the site manually:

```bash
hugo
```

The generated site will be in the `public/` directory.

## 🎨 Theme

This site uses the [Ananke theme](https://github.com/theNewDynamic/gohugo-theme-ananke). The theme is included as a Git submodule.

To update the theme:

```bash
git submodule update --remote themes/ananke
```

## 📚 Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Ananke Theme Documentation](https://github.com/theNewDynamic/gohugo-theme-ananke)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## 📄 License

This repository contains personal content and code. Please contact the owner for usage permissions.

---

Built with ❤️ using Hugo
