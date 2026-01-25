# Education Slidedeck Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a password-protected reveal.js presentation at `/p/edu-2025` showcasing Diego's research journey.

**Architecture:** Astro page with inline reveal.js initialization, password gate component using localStorage for session persistence, and noindex metadata. Follows existing patterns from tank-battle game for complex JS integration.

**Tech Stack:** Astro, reveal.js (npm), Tailwind CSS, TypeScript

---

## Task 1: Install reveal.js

**Files:**
- Modify: `package.json`

**Step 1: Install reveal.js package**

Run:
```bash
npm install reveal.js
```

**Step 2: Verify installation**

Run:
```bash
npm ls reveal.js
```
Expected: Shows reveal.js version in dependency tree

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add reveal.js dependency"
```

---

## Task 2: Create Password Gate Component

**Files:**
- Create: `src/components/ui/PasswordGate.astro`

**Step 1: Create the password gate component**

```astro
---
interface Props {
  password: string;
  storageKey?: string;
}

const { password, storageKey = 'presentation-access' } = Astro.props;
---

<div id="password-gate" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
  <div class="max-w-md w-full mx-4 p-8 bg-gray-800 rounded-lg shadow-xl">
    <h2 class="text-2xl font-bold text-white mb-4">Access Required</h2>
    <p class="text-gray-300 mb-6">This presentation requires a password to view.</p>
    <form id="password-form" class="space-y-4">
      <input
        type="password"
        id="password-input"
        class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter password"
        autocomplete="off"
      />
      <p id="password-error" class="text-red-400 text-sm hidden">Incorrect password. Please try again.</p>
      <button
        type="submit"
        class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Access Presentation
      </button>
    </form>
  </div>
</div>

<div id="protected-content" class="hidden">
  <slot />
</div>

<script define:vars={{ password, storageKey }}>
  const gate = document.getElementById('password-gate');
  const content = document.getElementById('protected-content');
  const form = document.getElementById('password-form');
  const input = document.getElementById('password-input');
  const error = document.getElementById('password-error');

  function showContent() {
    gate.classList.add('hidden');
    content.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('presentation-unlocked'));
  }

  // Check if already authenticated
  if (sessionStorage.getItem(storageKey) === 'authenticated') {
    showContent();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value === password) {
      sessionStorage.setItem(storageKey, 'authenticated');
      showContent();
    } else {
      error.classList.remove('hidden');
      input.classList.add('border-red-500');
      input.value = '';
      input.focus();
    }
  });
</script>
```

**Step 2: Verify file created**

Run:
```bash
ls -la src/components/ui/PasswordGate.astro
```
Expected: File exists

**Step 3: Commit**

```bash
git add src/components/ui/PasswordGate.astro
git commit -m "feat: add PasswordGate component for protected pages"
```

---

## Task 3: Create Presentation Page Structure

**Files:**
- Create: `src/pages/p/edu-2025.astro`

**Step 1: Create the presentation page with reveal.js setup**

```astro
---
import Layout from '~/layouts/Layout.astro';
import PasswordGate from '~/components/ui/PasswordGate.astro';

const metadata = {
  title: 'From Parasites to Pixels',
  description: 'A research journey presentation',
  robots: {
    index: false,
    follow: false,
  },
};

// Password for presentation access
const PRESENTATION_PASSWORD = 'edu2025';
---

<Layout metadata={metadata}>
  <PasswordGate password={PRESENTATION_PASSWORD} storageKey="edu-2025-access">
    <div class="reveal-container">
      <div class="reveal">
        <div class="slides">
          <!-- Slide 1: Title -->
          <section data-background-color="#1a1a2e">
            <h1 class="text-5xl font-bold text-white mb-4">From Parasites to Pixels</h1>
            <h2 class="text-2xl text-gray-300">A Research Journey</h2>
            <p class="text-gray-400 mt-8">Diego Staphorst</p>
          </section>

          <!-- Slide 2: Hook -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-8">Two Worlds, One Question</h2>
            <div class="flex justify-center gap-8">
              <div class="text-center">
                <div class="w-48 h-48 bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                  <span class="text-6xl">🦠</span>
                </div>
                <p class="text-gray-300">Malaria Parasites</p>
              </div>
              <div class="text-center">
                <div class="w-48 h-48 bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                  <span class="text-6xl">🔬</span>
                </div>
                <p class="text-gray-300">Cancer Detection</p>
              </div>
            </div>
          </section>

          <!-- Slide 3: Where I Started -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-8">Where I Started</h2>
            <ul class="text-xl text-gray-300 space-y-4 text-left max-w-2xl mx-auto">
              <li class="fragment">Bioinformatics student at Hogeschool Leiden</li>
              <li class="fragment">Curious about where biology meets code</li>
              <li class="fragment">No idea where it would lead...</li>
            </ul>
          </section>

          <!-- Slide 4: The Malaria Problem -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-8">The Malaria Problem</h2>
            <p class="text-6xl font-bold text-red-400 mb-4">445,000</p>
            <p class="text-2xl text-gray-300 mb-8">deaths per year</p>
            <p class="text-xl text-gray-400 fragment">Vaccines exist, but are hard to distribute</p>
            <p class="text-xl text-gray-400 fragment">We need to understand how parasites move through skin</p>
          </section>

          <!-- Slide 5: My Challenge -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-8">My Challenge</h2>
            <p class="text-xl text-gray-300 mb-8">Existing tools couldn't track complex parasite movements in real tissue</p>
            <div class="fragment">
              <p class="text-gray-400">They could only handle simple patterns on glass slides</p>
              <p class="text-gray-400 mt-4">But real skin is messy, complex, and 3D</p>
            </div>
          </section>

          <!-- Slide 6: What I Built -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-4">SMOOT</h2>
            <p class="text-xl text-gray-400 mb-8">Sporozoite Motility Orienting & Organization Tool</p>
            <ul class="text-lg text-gray-300 space-y-4 text-left max-w-2xl mx-auto">
              <li class="fragment">Track parasites in microscopy videos</li>
              <li class="fragment">Handle complex movement patterns</li>
              <li class="fragment">Compare behavior across environments</li>
            </ul>
          </section>

          <!-- Slide 7: The Aha Moment -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-8">The "Aha" Moment</h2>
            <div class="grid grid-cols-2 gap-8 max-w-3xl mx-auto">
              <div class="fragment">
                <p class="text-xl text-gray-300 mb-2">Glass Slides</p>
                <p class="text-4xl">🔄</p>
                <p class="text-gray-400 mt-2">Circular, fast (1.55 μm/s)</p>
                <p class="text-gray-400">98% turning motion</p>
              </div>
              <div class="fragment">
                <p class="text-xl text-gray-300 mb-2">Real Skin</p>
                <p class="text-4xl">↗️</p>
                <p class="text-gray-400 mt-2">Varied paths, slower (0.64 μm/s)</p>
                <p class="text-gray-400">63% turning motion</p>
              </div>
            </div>
            <p class="text-xl text-yellow-400 mt-8 fragment">They behave completely differently!</p>
          </section>

          <!-- Slide 8: Why It Matters -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-8">Why It Matters</h2>
            <p class="text-2xl text-red-400 mb-8 fragment">Lab conditions ≠ Reality</p>
            <p class="text-xl text-gray-300 fragment">If we study parasites only on glass...</p>
            <p class="text-xl text-gray-300 fragment">We miss how they actually behave in your body</p>
            <p class="text-xl text-gray-300 fragment">Understanding real behavior → better vaccines</p>
          </section>

          <!-- Slide 9: What I Learned -->
          <section data-background-color="#1a1a2e">
            <h2 class="text-3xl font-bold text-white mb-8">What I Learned</h2>
            <div class="text-xl text-gray-300 space-y-6">
              <p class="fragment">Coding + Biology + Persistence</p>
              <p class="fragment text-3xl">=</p>
              <p class="fragment text-2xl text-green-400">Tools that matter</p>
            </div>
          </section>

          <!-- Slide 10: The Leap -->
          <section data-background-color="#16213e">
            <h2 class="text-3xl font-bold text-white mb-8">The Leap</h2>
            <p class="text-xl text-gray-300 mb-4">From tracking parasites...</p>
            <p class="text-xl text-gray-300 mb-8">...to questioning AI quality</p>
            <p class="text-2xl text-blue-400 fragment">MSc Artificial Intelligence @ Utrecht University</p>
          </section>

          <!-- Slide 11: New Problem -->
          <section data-background-color="#16213e">
            <h2 class="text-3xl font-bold text-white mb-8">New Problem, Same Question</h2>
            <div class="space-y-4 text-xl text-gray-300">
              <p class="fragment">Cancer cases: 18M → 29M by 2040</p>
              <p class="fragment">Pathologist shortage (62% over 55 in UK)</p>
              <p class="fragment">AI could help... but how do we train it?</p>
            </div>
          </section>

          <!-- Slide 12: The Hidden Cost -->
          <section data-background-color="#16213e">
            <h2 class="text-3xl font-bold text-white mb-8">The Hidden Cost</h2>
            <p class="text-5xl font-bold text-yellow-400 mb-4">€35,000</p>
            <p class="text-xl text-gray-300 mb-8">to label 200 medical images properly</p>
            <p class="text-lg text-gray-400 fragment">360 hours × €99/hour</p>
            <p class="text-xl text-gray-300 mt-8 fragment">Can we use cheaper labels instead?</p>
          </section>

          <!-- Slide 13: What I Tested -->
          <section data-background-color="#16213e">
            <h2 class="text-3xl font-bold text-white mb-8">What I Tested</h2>
            <div class="space-y-6 max-w-2xl mx-auto">
              <div class="fragment text-left">
                <p class="text-green-400 font-bold">Fine annotations</p>
                <p class="text-gray-400">Detailed polygon outlines (expensive)</p>
              </div>
              <div class="fragment text-left">
                <p class="text-yellow-400 font-bold">Coarse annotations</p>
                <p class="text-gray-400">Rough bounding boxes (cheaper)</p>
              </div>
              <div class="fragment text-left">
                <p class="text-red-400 font-bold">Synthetic data</p>
                <p class="text-gray-400">Computer-generated (almost free)</p>
              </div>
            </div>
          </section>

          <!-- Slide 14: The Verdict -->
          <section data-background-color="#16213e">
            <h2 class="text-3xl font-bold text-white mb-8">The Verdict</h2>
            <div class="space-y-6 text-xl">
              <p class="fragment"><span class="text-green-400 font-bold">Fine labels:</span> <span class="text-white">93.5% accuracy</span></p>
              <p class="fragment"><span class="text-yellow-400 font-bold">Coarse labels:</span> <span class="text-white">85% accuracy</span></p>
              <p class="fragment"><span class="text-red-400 font-bold">Synthetic only:</span> <span class="text-white">Worse than guessing</span></p>
            </div>
            <p class="text-2xl text-red-400 mt-8 fragment">Shortcuts have real consequences</p>
          </section>

          <!-- Slide 15: Pattern Across Both -->
          <section data-background-color="#0f0f23">
            <h2 class="text-3xl font-bold text-white mb-8">The Pattern</h2>
            <div class="space-y-8 text-xl text-gray-300">
              <p class="fragment">Glass slides lied about parasites</p>
              <p class="fragment">Cheap labels lied about cancer</p>
              <p class="fragment text-2xl text-yellow-400 mt-8">Real problems need real data</p>
            </div>
          </section>

          <!-- Slide 16: Research is Accessible -->
          <section data-background-color="#0f0f23">
            <h2 class="text-3xl font-bold text-white mb-8">Research is Accessible</h2>
            <div class="space-y-6 text-xl text-gray-300">
              <p class="fragment">I started as a curious student</p>
              <p class="fragment">Learned to code along the way</p>
              <p class="fragment">No genius required</p>
              <p class="fragment text-2xl text-green-400 mt-8">Just questions and persistence</p>
            </div>
          </section>

          <!-- Slide 17: Your Thesis Can Matter -->
          <section data-background-color="#0f0f23">
            <h2 class="text-3xl font-bold text-white mb-8">Your Thesis Can Matter</h2>
            <div class="space-y-6 text-xl text-gray-300">
              <p class="fragment">SMOOT → Still used in malaria research</p>
              <p class="fragment">Annotation study → Informs clinical AI development</p>
              <p class="fragment text-2xl text-green-400 mt-8">Student work has real impact</p>
            </div>
          </section>

          <!-- Slide 18: Where I Am Now -->
          <section data-background-color="#0f0f23">
            <h2 class="text-3xl font-bold text-white mb-8">Where I Am Now</h2>
            <p class="text-xl text-gray-300 mb-4">Data Engineer at IFF</p>
            <p class="text-lg text-gray-400 mb-8">Still bridging biology and code</p>
            <div class="text-gray-400 space-y-2">
              <p>Lab automation • Data pipelines • Cloud infrastructure</p>
            </div>
          </section>

          <!-- Slide 19: Final Thought -->
          <section data-background-color="#0f0f23">
            <h2 class="text-4xl font-bold text-white mb-12">What problem makes you curious?</h2>
            <div class="mt-12 text-gray-400">
              <p>Diego Staphorst</p>
              <p class="text-blue-400">djaygo.github.io</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </PasswordGate>
</Layout>

<style is:global>
  .reveal-container {
    width: 100vw;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
  }

  .reveal {
    width: 100%;
    height: 100%;
  }

  .reveal .slides {
    text-align: center;
  }

  .reveal .slides section {
    padding: 2rem;
  }

  .reveal ul {
    list-style: none;
    padding: 0;
  }

  .reveal ul li::before {
    content: "→ ";
    color: #60a5fa;
  }
</style>

<script>
  import Reveal from 'reveal.js';
  import 'reveal.js/dist/reveal.css';
  import 'reveal.js/dist/theme/black.css';

  let deck: Reveal.Api | null = null;

  function initReveal() {
    const revealElement = document.querySelector('.reveal');
    if (!revealElement) return;

    deck = new Reveal(revealElement as HTMLElement, {
      hash: true,
      controls: true,
      progress: true,
      center: true,
      transition: 'slide',
      backgroundTransition: 'fade',
    });

    deck.initialize();
  }

  // Initialize when content is unlocked
  window.addEventListener('presentation-unlocked', () => {
    // Small delay to ensure DOM is ready
    setTimeout(initReveal, 100);
  });

  // Also check if already unlocked (page refresh)
  if (!document.getElementById('password-gate')?.classList.contains('hidden') === false) {
    initReveal();
  }

  // Cleanup for View Transitions
  document.addEventListener('astro:before-swap', () => {
    if (deck) {
      deck.destroy();
      deck = null;
    }
  }, { once: true });
</script>
```

**Step 2: Create parent directory**

Run:
```bash
mkdir -p src/pages/p
```

**Step 3: Verify file created**

Run:
```bash
ls -la src/pages/p/edu-2025.astro
```
Expected: File exists

**Step 4: Commit**

```bash
git add src/pages/p/edu-2025.astro
git commit -m "feat: add education slidedeck presentation page"
```

---

## Task 4: Exclude from Sitemap

**Files:**
- Modify: `astro.config.ts`

**Step 1: Read current astro.config.ts**

Run:
```bash
cat astro.config.ts
```

**Step 2: Add sitemap filter to exclude /p/ routes**

Find the `sitemap()` integration and add a filter. The sitemap config should look like:

```typescript
sitemap({
  filter: (page) => !page.includes('/p/'),
}),
```

**Step 3: Verify config is valid**

Run:
```bash
npm run build
```
Expected: Build succeeds

**Step 4: Commit**

```bash
git add astro.config.ts
git commit -m "chore: exclude /p/ routes from sitemap"
```

---

## Task 5: Test Locally

**Files:**
- None (testing only)

**Step 1: Start dev server**

Run:
```bash
npm run dev
```

**Step 2: Test password gate**

Open: `http://localhost:4321/p/edu-2025`
Expected:
- See password prompt
- Wrong password shows error
- Correct password (`edu2025`) reveals presentation

**Step 3: Test reveal.js functionality**

After entering password:
- Arrow keys navigate slides
- Fragments animate in
- Progress bar shows at bottom
- Press `?` for help overlay

**Step 4: Test noindex**

View page source, verify:
```html
<meta name="robots" content="noindex, nofollow">
```

**Step 5: Stop dev server**

Press Ctrl+C

---

## Task 6: Build and Verify Production

**Files:**
- None (verification only)

**Step 1: Run production build**

Run:
```bash
npm run build
```
Expected: Build completes without errors

**Step 2: Preview production build**

Run:
```bash
npm run preview
```

**Step 3: Verify presentation works in production**

Open: `http://localhost:4321/p/edu-2025`
Expected: Same behavior as dev

**Step 4: Verify sitemap exclusion**

Run:
```bash
cat dist/sitemap-0.xml | grep -c "edu-2025"
```
Expected: `0` (not in sitemap)

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete education slidedeck implementation

- Password-protected reveal.js presentation
- Noindex meta tags for search engine exclusion
- Excluded from sitemap
- View Transitions cleanup support"
```

---

## Summary

After completing all tasks, you will have:

1. **reveal.js** installed as npm dependency
2. **PasswordGate** reusable component for future protected pages
3. **Presentation** at `/p/edu-2025` with:
   - 19 slides following the journey arc
   - Password protection (password: `edu2025`)
   - `noindex, nofollow` meta tags
   - Not in sitemap
   - No navigation links (obscure URL)
4. **Production build** verified and working

**To share the presentation:**
- Give the URL: `https://yoursite.com/p/edu-2025`
- Give the password: `edu2025`
- They can access for the browser session (sessionStorage)
