# Education Journey Slidedeck Design

## Overview

A reveal.js presentation for Diego's personal site showcasing his research journey from bachelor to master thesis. Aimed at inspiring students considering research careers.

## Goals

- **Primary goal:** Inspirational talk motivating students by showing real-world thesis impact
- **Key messages:**
  1. "Research is accessible" - curiosity, persistence, and coding opens doors
  2. "Real problems need real data" - shortcuts don't give you truth
- **Duration:** 15 minutes (15-20 slides)
- **Audience:** Students and general public, no technical background assumed

## Content Structure

### Opening (2 slides)
1. **Title slide** - "From Parasites to Pixels: A Research Journey"
2. **Hook** - Striking visual: malaria parasites + cancer slide scan side by side

### Act 1: The Beginning (3 slides)
3. **Where I started** - Bioinformatics student, curious about biology meets code
4. **The malaria problem** - 445,000 deaths/year, need to understand parasite movement
5. **My challenge** - Existing tools couldn't track complex movements in real tissue

### Act 2: Bachelor Thesis - SMOOT (4 slides)
6. **What I built** - SMOOT software: tracking parasites in microscopy videos
7. **The "aha" moment** - Parasites behave differently on glass vs. real skin
8. **Why it matters** - Lab conditions ≠ reality, understanding helps vaccine development
9. **What I learned** - Coding + biology + persistence = tools that matter

### Transition (1 slide)
10. **The leap** - From tracking parasites to questioning AI quality → MSc in AI

### Act 3: Master Thesis - Cancer Detection AI (4 slides)
11. **New problem, same question** - Cancer cases rising, pathologist shortage, AI could help
12. **The hidden cost** - Quality training data costs ~€35,000 for 200 images
13. **What I tested** - Fine annotations vs. coarse vs. synthetic data
14. **The verdict** - Fine labels: 93.5% accuracy. Coarse: 85%. Synthetic: worse than guessing

### Act 4: The Takeaways (3 slides)
15. **Pattern across both** - Glass slides lied about parasites. Cheap labels lied about cancer.
16. **Research is accessible** - Started as curious student who learned to code
17. **Your thesis can matter** - Both projects contributed to real research

### Closing (2 slides)
18. **Where I am now** - Data engineer at IFF, bridging biology and code
19. **Final thought + Q&A** - "What problem makes you curious?" + contact info

## Visual Design

### Theme
- Dark background (matches site aesthetic, good for microscopy images)
- Accent colors for highlights
- Minimal text per slide - headlines + one supporting point
- Image-heavy design

### Key Visuals to Source
- Cover image from bachelor thesis (glowing parasites on black)
- Figure 6 from bachelor thesis: in vitro vs ex vivo samples
- Pattern heatmaps showing parasite movement differences
- Annotation comparison visuals from master thesis (polygon vs bounding box)
- Simple diagrams for "shortcuts don't work" message

### Content Tone
- Conversational ("Here's what I found" not "Results demonstrated")
- No jargon without explanation
- Memorable numbers: "445,000 deaths" not "high mortality rate"

## Technical Implementation

### Framework
- reveal.js integrated with Astro
- Route: `/p/edu-2025` (obscure path)

### Security (Hybrid Approach)
1. **Obscure URL** - Not obvious path, hard to guess
2. **Client-side password gate** - JavaScript prompt before revealing content
3. **No indexing** - `noindex, nofollow` meta tag
4. **No sitemap** - Exclude from sitemap.xml
5. **No navigation links** - Never linked from public pages

### Features
- reveal.js fragments for progressive disclosure
- Speaker notes for presenter reference
- Mobile-friendly (students may view on phones)
- Keyboard navigation support

## File Structure

```
src/
  pages/
    p/
      edu-2025.astro      # Password-gated presentation page
  components/
    presentations/
      PasswordGate.astro  # Reusable password component
      RevealSlides.astro  # reveal.js wrapper
  assets/
    presentations/
      edu-2025/           # Images for this presentation
```

## Dependencies

- reveal.js (npm package or CDN)
- No additional major dependencies needed

## Security Notes

- Client-side password is not bulletproof (can be bypassed via dev tools)
- Sufficient for "don't want random visitors" use case
- Thesis content is already public in /docs/ folder
- For truly sensitive content, would need server-side auth

## Next Steps

1. Install/configure reveal.js with Astro
2. Create password gate component
3. Build slide content with images from thesis PDFs
4. Test on mobile and desktop
5. Deploy to obscure URL
