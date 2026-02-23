---
name: ux-design-system-foundations
description: Design system foundations including design tokens, color systems, typography, spacing scales, and shadow systems. Use when establishing design systems, creating consistent UI patterns, or standardizing visual design across projects.
---

## Design System Foundations

### Design Tokens Structure

Design tokens are the atomic values of your design system. They create consistency and enable theming.

**Problem:** Hardcoded values scattered across codebase, inconsistent spacing/colors, difficult theme changes.

**Solution:** Centralize all design decisions in a token system.

```typescript
// Design tokens - use CSS custom properties or Tailwind config
const tokens = {
  colors: {
    // Brand colors
    brand: {
      primary: '#3B82F6',    // blue-500
      secondary: '#8B5CF6',  // violet-500
      accent: '#F59E0B',     // amber-500
    },
    // Semantic colors
    semantic: {
      success: '#10B981',    // green-500
      warning: '#F59E0B',    // amber-500
      error: '#EF4444',      // red-500
      info: '#3B82F6',       // blue-500
    },
    // Neutral scale
    neutral: {
      0: '#FFFFFF',
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
      950: '#030712',
    }
  },
  spacing: {
    // 4px base scale
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    2: '0.5rem',      // 8px
    3: '0.75rem',     // 12px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    8: '2rem',        // 32px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
      '5xl': ['3rem', { lineHeight: '1' }],           // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  }
}
```

**Tailwind Config Implementation:**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          accent: '#F59E0B',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    }
  }
}
```

**Usage:**

```html
<!-- Using Tailwind utilities -->
<button class="bg-brand-primary text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow">
  Primary Action
</button>

<div class="text-neutral-700 dark:text-neutral-300 space-y-4">
  <p class="text-base">Body text with proper spacing</p>
</div>
```

**Accessibility Notes:**
- Ensure color tokens meet WCAG 2.1 contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Use semantic color names (`success`, `error`) not literal names (`green`, `red`) for better screen reader context
- Test tokens in both light and dark modes

---

### Color System Patterns

**Problem:** Inconsistent colors, poor contrast, no dark mode support, accessibility issues.

**Solution:** Systematic color palette with semantic naming and tested contrast ratios.

#### Semantic Color Mapping

```typescript
// Semantic colors for different states
const semanticColors = {
  // Interactive states
  interactive: {
    default: 'bg-brand-primary text-white',
    hover: 'hover:bg-blue-600',
    active: 'active:bg-blue-700',
    disabled: 'bg-neutral-300 text-neutral-500 cursor-not-allowed',
  },
  // Feedback states
  feedback: {
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  // Content hierarchy
  content: {
    primary: 'text-neutral-900 dark:text-neutral-100',
    secondary: 'text-neutral-600 dark:text-neutral-400',
    tertiary: 'text-neutral-500 dark:text-neutral-500',
    disabled: 'text-neutral-400 dark:text-neutral-600',
  }
}
```

#### Dark Mode Pattern

```html
<!-- Dark mode using Tailwind's dark: variant -->
<div class="bg-white dark:bg-neutral-900">
  <!-- Primary text -->
  <h1 class="text-neutral-900 dark:text-neutral-100">
    Heading
  </h1>

  <!-- Secondary text -->
  <p class="text-neutral-600 dark:text-neutral-400">
    Supporting text
  </p>

  <!-- Cards -->
  <div class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
    Card content
  </div>

  <!-- Interactive elements -->
  <button class="bg-brand-primary hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
    Action
  </button>
</div>
```

**Dark Mode Setup:**

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for system preference
  theme: {
    extend: {
      colors: {
        // Define dark mode variants
      }
    }
  }
}
```

```typescript
// Dark mode toggle (framework-agnostic)
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme',
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )
}

// Initialize dark mode from system preference or localStorage
function initializeDarkMode() {
  const savedTheme = localStorage.getItem('theme')
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark')
  }
}
```

#### Contrast Ratios & Accessibility

**WCAG 2.1 Requirements:**
- **Normal text (< 18px):** 4.5:1 minimum
- **Large text (≥ 18px or ≥ 14px bold):** 3:1 minimum
- **UI components:** 3:1 minimum

**Testing Pattern:**

```typescript
// Contrast ratio checker (informational)
const contrastRatios = {
  // Text on background
  'neutral-900 on white': 19.8,     // ✓ AAA (7:1)
  'neutral-700 on white': 11.4,     // ✓ AAA (7:1)
  'neutral-600 on white': 7.8,      // ✓ AAA (7:1)
  'neutral-500 on white': 4.7,      // ✓ AA (4.5:1)
  'neutral-400 on white': 3.0,      // ✗ Fails for normal text

  // Interactive elements
  'blue-500 on white': 4.5,         // ✓ AA for normal text
  'green-500 on white': 3.8,        // ✗ Use green-600 instead
  'red-500 on white': 4.9,          // ✓ AA for normal text
}
```

**Accessible Color Pairings (Tailwind):**

```html
<!-- ✓ GOOD: High contrast text -->
<p class="text-neutral-900 dark:text-neutral-100">Primary text</p>
<p class="text-neutral-700 dark:text-neutral-300">Secondary text</p>

<!-- ✗ BAD: Low contrast text -->
<p class="text-neutral-400">Hard to read on white background</p>

<!-- ✓ GOOD: Status badges with sufficient contrast -->
<span class="bg-green-100 text-green-800 border border-green-200">Success</span>
<span class="bg-red-100 text-red-800 border border-red-200">Error</span>

<!-- ✓ GOOD: Interactive elements with focus states -->
<button class="bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-200">
  Action
</button>
```

**Accessibility Notes:**
- Never rely on color alone to convey information (add icons or text labels)
- Test all color combinations with a contrast checker (Chrome DevTools, WebAIM)
- Provide focus indicators with 3:1 contrast against background
- Use `prefers-reduced-transparency` media query for users who need high contrast

---

### Typography Scale

**Problem:** Inconsistent font sizes, poor hierarchy, unreadable line heights.

**Solution:** Modular typography scale with paired line heights and consistent hierarchy.

#### Type Scale Pattern

```html
<!-- Display text (marketing, hero sections) -->
<h1 class="text-5xl font-bold leading-tight">
  Display Large (48px)
</h1>

<h2 class="text-4xl font-bold leading-tight">
  Display Medium (36px)
</h2>

<!-- Headings (structured content) -->
<h1 class="text-3xl font-bold leading-snug">
  Heading 1 (30px)
</h1>

<h2 class="text-2xl font-semibold leading-snug">
  Heading 2 (24px)
</h2>

<h3 class="text-xl font-semibold leading-normal">
  Heading 3 (20px)
</h3>

<h4 class="text-lg font-medium leading-normal">
  Heading 4 (18px)
</h4>

<!-- Body text -->
<p class="text-base leading-relaxed">
  Body text (16px) - Default for reading content
</p>

<p class="text-sm leading-relaxed">
  Small text (14px) - Secondary content, captions
</p>

<p class="text-xs leading-normal">
  Extra small (12px) - Metadata, timestamps
</p>
```

#### Line Height Guidelines

| Size | Line Height | Usage |
|------|-------------|-------|
| Display (4xl-5xl) | `leading-tight` (1.25) | Hero text, short headlines |
| Headings (xl-3xl) | `leading-snug` (1.375) | Section headings |
| Body (base-lg) | `leading-relaxed` (1.625) | Readable paragraphs |
| Small (sm-xs) | `leading-normal` (1.5) | UI text, labels |

#### Font Weight Hierarchy

```html
<!-- Bold (700) - Primary headings, strong emphasis -->
<h1 class="font-bold">Critical Information</h1>

<!-- Semibold (600) - Subheadings, UI elements -->
<h2 class="font-semibold">Section Title</h2>
<button class="font-semibold">Call to Action</button>

<!-- Medium (500) - Emphasized body text, labels -->
<label class="font-medium">Form Label</label>
<p class="font-medium">Highlighted paragraph</p>

<!-- Normal (400) - Body text, default weight -->
<p class="font-normal">Standard paragraph text</p>
```

#### Reading Width Pattern

```html
<!-- ✓ GOOD: Optimal reading width (45-75 characters per line) -->
<article class="max-w-prose mx-auto">
  <p class="text-base leading-relaxed">
    Long-form content with optimal line length for comfortable reading.
    The max-w-prose utility (65ch) ensures text doesn't stretch too wide.
  </p>
</article>

<!-- ✗ BAD: Text too wide -->
<p class="w-full text-base">
  This text stretches across the entire viewport, making it hard to track
  from line to line on wide screens.
</p>
```

**Accessibility Notes:**
- Minimum font size: 16px for body text (better for low vision users)
- Line height: 1.5+ for body text (WCAG 2.1 Success Criterion 1.4.8)
- Allow text zoom up to 200% without layout breaking
- Use relative units (`rem`, `em`) not fixed pixels for better scaling

---

### Spacing System

**Problem:** Arbitrary spacing values, visual inconsistency, poor rhythm.

**Solution:** 4px or 8px base unit with consistent scale for all spacing.

#### Spacing Scale Pattern (4px base)

```html
<!-- Component internal spacing -->
<div class="p-4">         <!-- 16px padding -->
  <h3 class="mb-2">Title</h3>    <!-- 8px margin-bottom -->
  <p class="mb-4">Content</p>    <!-- 16px margin-bottom -->
</div>

<!-- Stack spacing (vertical rhythm) -->
<div class="space-y-4">   <!-- 16px gap between children -->
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
  <div class="card">Item 3</div>
</div>

<!-- Inline spacing (horizontal rhythm) -->
<div class="flex gap-2">  <!-- 8px gap between items -->
  <button>Cancel</button>
  <button>Confirm</button>
</div>
```

#### Layout Spacing Guidelines

| Space | Value | Usage |
|-------|-------|-------|
| `space-0.5` | 2px | Tight inline elements, icon-text spacing |
| `space-1` | 4px | Compact UI, dense tables |
| `space-2` | 8px | Related items, tight sections |
| `space-4` | 16px | Default spacing, paragraph breaks |
| `space-6` | 24px | Section separation, card padding |
| `space-8` | 32px | Major sections, generous padding |
| `space-12` | 48px | Page sections, hero spacing |
| `space-16` | 64px | Layout landmarks, hero sections |

#### Common Spacing Patterns

```html
<!-- Card spacing -->
<div class="bg-white rounded-lg shadow-md p-6 space-y-4">
  <h3 class="text-xl font-semibold">Card Title</h3>
  <p class="text-neutral-600">Card content with proper spacing</p>
  <div class="flex gap-3">
    <button>Action 1</button>
    <button>Action 2</button>
  </div>
</div>

<!-- Form spacing -->
<form class="space-y-6">
  <div class="space-y-2">
    <label class="block font-medium">Field Label</label>
    <input class="w-full px-4 py-2 border rounded-md" />
    <p class="text-sm text-neutral-500">Helper text</p>
  </div>

  <div class="flex gap-3">
    <button class="px-4 py-2">Submit</button>
  </div>
</form>

<!-- List spacing -->
<ul class="space-y-3">
  <li class="flex items-center gap-2">
    <span class="w-2 h-2 bg-brand-primary rounded-full"></span>
    List item with icon
  </li>
  <li class="flex items-center gap-2">
    <span class="w-2 h-2 bg-brand-primary rounded-full"></span>
    Another item
  </li>
</ul>

<!-- Page layout spacing -->
<div class="container mx-auto px-4 py-8 space-y-12">
  <section class="space-y-6">
    <h2 class="text-3xl font-bold">Section Title</h2>
    <div class="space-y-4">
      <!-- Section content -->
    </div>
  </section>

  <section class="space-y-6">
    <!-- Another section -->
  </section>
</div>
```

**Accessibility Notes:**
- Maintain consistent spacing for predictable navigation
- Use `gap` utilities for flex/grid to avoid margin collapse issues
- Ensure touch targets have minimum 44x44px size (use `p-2` + content for buttons)
- Provide adequate whitespace around interactive elements

---

### Responsive Breakpoints

**Problem:** Inconsistent breakpoints, poor mobile experience, layout breaks on edge cases.

**Solution:** Mobile-first responsive design with semantic breakpoints.

#### Tailwind Breakpoint System

| Breakpoint | Value | Device Target | Usage |
|------------|-------|---------------|-------|
| `sm` | 640px | Large phones | Adjust typography, simple layouts |
| `md` | 768px | Tablets | Multi-column layouts, sidebars |
| `lg` | 1024px | Small laptops | Complex layouts, navigation changes |
| `xl` | 1280px | Desktops | Max content width, extra columns |
| `2xl` | 1536px | Large displays | Generous spacing, large grids |

#### Mobile-First Pattern

```html
<!-- Start with mobile layout, enhance for larger screens -->
<div class="
  grid
  grid-cols-1       /* Mobile: single column */
  sm:grid-cols-2    /* Small: 2 columns */
  lg:grid-cols-3    /* Large: 3 columns */
  gap-4
  sm:gap-6          /* Increase gap on larger screens */
">
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
  <div class="card">Item 3</div>
</div>

<!-- Responsive typography -->
<h1 class="
  text-2xl          /* Mobile: 24px */
  sm:text-3xl       /* Small: 30px */
  lg:text-4xl       /* Large: 36px */
  font-bold
  leading-tight
">
  Responsive Heading
</h1>

<!-- Responsive spacing -->
<section class="
  px-4              /* Mobile: 16px horizontal padding */
  sm:px-6           /* Small: 24px */
  lg:px-8           /* Large: 32px */
  py-8              /* Vertical padding */
  sm:py-12
">
  Content
</section>
```

#### Container Patterns

```html
<!-- Centered container with max width -->
<div class="
  container         /* Auto margins, responsive max-width */
  mx-auto           /* Center horizontally */
  px-4              /* Edge padding */
  sm:px-6
  lg:px-8
">
  Content constrained to readable width
</div>

<!-- Custom max-width pattern -->
<div class="
  max-w-7xl        /* Maximum 1280px wide */
  mx-auto
  px-4
">
  Wide content area
</div>

<div class="
  max-w-prose      /* ~65 characters wide, ideal for reading */
  mx-auto
  px-4
">
  Article content
</div>
```

#### Responsive Navigation Pattern

```html
<!-- Mobile: Hamburger menu, Desktop: Horizontal nav -->
<nav class="
  flex
  flex-col          /* Mobile: vertical stack */
  lg:flex-row       /* Desktop: horizontal row */
  lg:items-center
  gap-4
  lg:gap-8
">
  <!-- Mobile menu toggle (hide on desktop) -->
  <button class="lg:hidden">
    <svg>...</svg> <!-- Hamburger icon -->
  </button>

  <!-- Nav items (hidden on mobile unless menu open) -->
  <div class="
    hidden            /* Mobile: hidden by default */
    lg:flex           /* Desktop: always visible */
    lg:gap-6
  ">
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </div>
</nav>
```

#### Responsive Grid Patterns

```html
<!-- Auto-fit grid: automatically adjusts columns based on space -->
<div class="
  grid
  grid-cols-[repeat(auto-fit,minmax(250px,1fr))]
  gap-6
">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
  <div class="card">Card 4</div>
</div>

<!-- Dashboard layout: responsive sidebar -->
<div class="
  grid
  grid-cols-1       /* Mobile: single column, sidebar on top */
  lg:grid-cols-[250px,1fr]  /* Desktop: fixed sidebar + main */
  gap-6
">
  <aside class="bg-neutral-100">Sidebar</aside>
  <main>Main content</main>
</div>
```

#### Media Query Patterns (CSS)

```css
/* When you need custom breakpoints beyond Tailwind utilities */

/* Mobile first approach */
.element {
  /* Mobile styles (default) */
  font-size: 1rem;
  padding: 1rem;
}

@media (min-width: 640px) {
  /* Tablet and up */
  .element {
    font-size: 1.125rem;
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop and up */
  .element {
    font-size: 1.25rem;
    padding: 2rem;
  }
}

/* Orientation queries */
@media (orientation: portrait) {
  .hero {
    height: 60vh;
  }
}

@media (orientation: landscape) {
  .hero {
    height: 100vh;
  }
}
```

**Accessibility Notes:**
- Test all breakpoints with browser zoom (up to 200%)
- Ensure touch targets remain 44x44px minimum at all sizes
- Maintain readable font sizes (16px minimum) at all breakpoints
- Use `prefers-reduced-motion` for users who need less animation

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

