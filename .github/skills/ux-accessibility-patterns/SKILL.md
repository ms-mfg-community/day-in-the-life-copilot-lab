---
name: ux-accessibility-patterns
description: Accessibility patterns including WCAG guidelines, ARIA attributes, keyboard navigation, screen reader support, focus management, and color contrast. Use when improving accessibility, ensuring WCAG compliance, or making interfaces usable for assistive technologies.
---

## Accessibility UX

### Color Contrast (WCAG 2.1)

**Problem:** Insufficient color contrast makes text unreadable for users with low vision, color blindness, or viewing in bright sunlight. Violates WCAG accessibility standards.

**Solution:** Use WCAG 2.1 contrast ratios (4.5:1 for normal text AA, 7:1 for AAA; 3:1 for large text/UI components AA, 4.5:1 for AAA). Design accessible color palettes that work for light/dark modes.

#### WCAG AA Compliance (Minimum)

```html
<!-- Normal text (4.5:1 minimum contrast ratio) -->
<div class="bg-white p-6">
  <h2 class="text-2xl font-bold text-neutral-900 mb-3">
    Accessible Heading (21:1 contrast)
  </h2>
  <p class="text-base text-neutral-700 mb-4">
    Body text with sufficient contrast (12:1 ratio). Easy to read for all users.
  </p>
  <p class="text-base text-neutral-600">
    Secondary text (7:1 ratio). Still meets AA requirements for normal text.
  </p>
</div>

<!-- Large text (3:1 minimum contrast ratio, 18pt+ or 14pt+ bold) -->
<div class="bg-brand-primary p-6">
  <h1 class="text-4xl font-bold text-white mb-2">
    Large Heading (4.5:1 contrast)
  </h1>
  <p class="text-lg text-white/90">
    Large text (18px+) can use lower contrast (3.9:1 ratio).
  </p>
</div>

<!-- UI components and interactive elements (3:1 minimum) -->
<button class="px-6 py-3 bg-blue-600 text-white rounded-lg border-2 border-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Primary Button (4.5:1 contrast)
</button>

<button class="px-6 py-3 bg-white text-neutral-900 rounded-lg border-2 border-neutral-300 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Secondary Button (3:1 border contrast)
</button>

<!-- Form inputs with accessible borders -->
<div class="space-y-2">
  <label for="email" class="block text-sm font-medium text-neutral-900">
    Email address
  </label>
  <input
    type="email"
    id="email"
    class="w-full px-4 py-2 border-2 border-neutral-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="you@example.com"
  />
  <p class="text-sm text-neutral-600">Enter your email to continue</p>
</div>
```

#### WCAG AAA Compliance (Enhanced)

```html
<!-- Enhanced contrast for maximum readability -->
<div class="bg-white p-6">
  <h2 class="text-2xl font-bold text-neutral-950 mb-3">
    High Contrast Heading (21:1 ratio)
  </h2>
  <p class="text-base text-neutral-900 mb-4">
    Body text with enhanced contrast (18:1 ratio). Exceeds AAA requirements.
  </p>
  <p class="text-base text-neutral-800">
    Secondary text (14:1 ratio). Still meets AAA requirements (7:1 minimum).
  </p>
</div>

<!-- Dark mode with sufficient contrast -->
<div class="bg-neutral-900 p-6">
  <h2 class="text-2xl font-bold text-white mb-3">
    Dark Mode Heading (21:1 contrast)
  </h2>
  <p class="text-base text-neutral-100 mb-4">
    Body text in dark mode (18:1 ratio). Fully accessible.
  </p>
  <p class="text-base text-neutral-300">
    Secondary text (11:1 ratio). Meets AAA requirements.
  </p>
</div>
```

#### Accessible Color Palette

```typescript
// Tailwind-compatible accessible color palette
const accessibleColors = {
  light: {
    background: '#FFFFFF',       // White
    surface: '#F9FAFB',          // neutral-50
    text: {
      primary: '#111827',        // neutral-900 (18:1 contrast on white)
      secondary: '#374151',      // neutral-700 (12:1 contrast on white)
      tertiary: '#6B7280',       // neutral-500 (4.6:1 contrast on white - AA compliant)
    },
    border: '#D1D5DB',           // neutral-300 (3.1:1 contrast - AA for UI)
    interactive: {
      primary: '#2563EB',        // blue-600 (4.5:1 contrast on white)
      primaryHover: '#1D4ED8',   // blue-700
      secondary: '#7C3AED',      // violet-600 (4.6:1 contrast)
      success: '#059669',        // green-600 (3.4:1 contrast)
      warning: '#D97706',        // amber-600 (3.4:1 contrast)
      error: '#DC2626',          // red-600 (5.9:1 contrast)
    }
  },
  dark: {
    background: '#111827',       // neutral-900
    surface: '#1F2937',          // neutral-800
    text: {
      primary: '#F9FAFB',        // neutral-50 (18:1 contrast on neutral-900)
      secondary: '#E5E7EB',      // neutral-200 (14:1 contrast)
      tertiary: '#9CA3AF',       // neutral-400 (7:1 contrast - AAA compliant)
    },
    border: '#4B5563',           // neutral-600 (3.2:1 contrast - AA for UI)
    interactive: {
      primary: '#60A5FA',        // blue-400 (7.5:1 contrast on neutral-900)
      primaryHover: '#3B82F6',   // blue-500
      secondary: '#A78BFA',      // violet-400 (7.2:1 contrast)
      success: '#34D399',        // green-400 (8.3:1 contrast)
      warning: '#FBBF24',        // amber-400 (11:1 contrast)
      error: '#F87171',          // red-400 (6.4:1 contrast)
    }
  }
}
```

#### Contrast Checking Tools

```html
<!-- Developer note: Use these tools to verify contrast ratios -->
<!--
  Recommended contrast checkers:
  - WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
  - Coolors Contrast Checker: https://coolors.co/contrast-checker
  - Chrome DevTools: Built-in contrast ratio in color picker
  - Figma: Built-in contrast checker in color picker
  - Adobe Color: Accessibility tools panel

  WCAG 2.1 Requirements:
  - Normal text (< 18pt): 4.5:1 (AA), 7:1 (AAA)
  - Large text (≥ 18pt or ≥ 14pt bold): 3:1 (AA), 4.5:1 (AAA)
  - UI components and graphical objects: 3:1 (AA)

  Testing checklist:
  ✓ Test in light mode
  ✓ Test in dark mode
  ✓ Test with color blindness simulators
  ✓ Test in bright sunlight (mobile devices)
  ✓ Test with browser high contrast mode
-->
```

**Accessibility Notes:**
- Use WCAG 2.1 Level AA as minimum (4.5:1 for normal text, 3:1 for large text/UI)
- Aim for AAA compliance (7:1 for normal text, 4.5:1 for large text) when possible
- Test color contrast with automated tools (WebAIM, Chrome DevTools, Axe)
- Don't rely on color alone to convey information (use icons, text, patterns)
- Provide sufficient contrast for focus indicators (3:1 minimum)
- Test with color blindness simulators (protanopia, deuteranopia, tritanopia)
- Ensure dark mode has equivalent contrast ratios as light mode
- Use semantic color tokens (success, warning, error) with sufficient contrast
- Avoid low contrast for disabled states (make them clearly non-interactive)
- Test on real devices in various lighting conditions

---

### Keyboard Navigation

**Problem:** Mouse-only interfaces exclude keyboard users (motor disabilities, power users, screen reader users). Missing focus indicators and keyboard traps frustrate users.

**Solution:** Support full keyboard navigation (Tab, Shift+Tab, Arrow keys, Enter, Escape), provide visible focus indicators, implement logical tab order, and enable keyboard shortcuts for common actions.

#### Focus Management

```html
<!-- Clear focus indicators (WCAG 2.4.7) -->
<style>
/* Custom focus ring (3:1 contrast minimum) */
.focus-visible:focus {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

/* Alternative: Use Tailwind's focus-visible utilities */
</style>

<button class="px-6 py-3 bg-brand-primary text-white rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-shadow">
  Accessible Focus State
</button>

<!-- Logical tab order (use tabindex sparingly) -->
<form class="space-y-4">
  <!-- tabindex="0" makes non-interactive elements focusable -->
  <div tabindex="0" class="p-4 border-2 border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
    <h3 class="font-medium mb-2">Important Notice</h3>
    <p class="text-sm text-neutral-600">This content is keyboard accessible.</p>
  </div>

  <!-- Natural tab order (no tabindex needed for interactive elements) -->
  <input
    type="text"
    class="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="First name"
  />
  <input
    type="text"
    class="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="Last name"
  />
  <button type="submit" class="px-6 py-3 bg-brand-primary text-white rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
    Submit
  </button>
</form>

<!-- tabindex="-1" makes element programmatically focusable but not in tab order -->
<div tabindex="-1" id="error-message" class="p-4 bg-red-50 border-l-4 border-red-500 rounded focus:outline-none focus:ring-2 focus:ring-red-500">
  <p class="text-red-800">Error message that JavaScript can focus programmatically.</p>
</div>
```

#### Skip Links

```html
<!-- Skip to main content link (hidden until focused) -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-brand-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500">
  Skip to main content
</a>

<!-- Skip navigation link -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-brand-primary focus:text-white focus:rounded-lg">
  Skip navigation
</a>

<!-- Full skip links pattern -->
<div class="sr-only focus-within:not-sr-only">
  <nav class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 p-4 flex gap-4" aria-label="Skip links">
    <a href="#main-content" class="px-4 py-2 bg-brand-primary text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
      Skip to main content
    </a>
    <a href="#navigation" class="px-4 py-2 bg-brand-primary text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
      Skip to navigation
    </a>
    <a href="#footer" class="px-4 py-2 bg-brand-primary text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
      Skip to footer
    </a>
  </nav>
</div>

<header id="navigation">
  <!-- Navigation content -->
</header>

<main id="main-content" tabindex="-1" class="focus:outline-none">
  <!-- Main content -->
</main>

<footer id="footer">
  <!-- Footer content -->
</footer>
```

#### Keyboard Shortcuts

```html
<!-- Keyboard shortcut hints -->
<div class="space-y-2">
  <button class="flex items-center justify-between w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
    <span>Open search</span>
    <kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">
      Ctrl K
    </kbd>
  </button>

  <button class="flex items-center justify-between w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
    <span>Save document</span>
    <kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">
      Ctrl S
    </kbd>
  </button>

  <button class="flex items-center justify-between w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
    <span>Undo</span>
    <div class="flex gap-1">
      <kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">
        Ctrl
      </kbd>
      <span class="text-neutral-400">+</span>
      <kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">
        Z
      </kbd>
    </div>
  </button>
</div>

<!-- Keyboard shortcut documentation -->
<div class="p-6 bg-white rounded-lg shadow">
  <h3 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
  <dl class="space-y-3">
    <div class="flex items-center justify-between">
      <dt class="text-sm text-neutral-600">Search</dt>
      <dd><kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">Ctrl K</kbd></dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-sm text-neutral-600">Create new</dt>
      <dd><kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">Ctrl N</kbd></dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-sm text-neutral-600">Save</dt>
      <dd><kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">Ctrl S</kbd></dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-sm text-neutral-600">Close dialog</dt>
      <dd><kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-300 rounded">Esc</kbd></dd>
    </div>
  </dl>
</div>
```

#### Focus Trapping (Modals)

```html
<!-- Modal with focus trap -->
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" data-focus-trap>
    <!-- First focusable element (close button) -->
    <div class="flex items-center justify-between mb-4">
      <h2 id="modal-title" class="text-xl font-semibold">Confirm Action</h2>
      <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Close">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <p class="text-neutral-600 mb-6">
      Are you sure you want to proceed with this action? This cannot be undone.
    </p>

    <!-- Last focusable elements (action buttons) -->
    <div class="flex gap-3">
      <button class="flex-1 px-4 py-2 border-2 border-neutral-300 rounded-lg font-medium hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        Cancel
      </button>
      <button class="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        Confirm
      </button>
    </div>
  </div>
</div>

<!-- JavaScript pattern for focus trapping -->
<!--
const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
const modal = document.querySelector('[data-focus-trap]')
const firstFocusableElement = modal.querySelectorAll(focusableElements)[0]
const focusableContent = modal.querySelectorAll(focusableElements)
const lastFocusableElement = focusableContent[focusableContent.length - 1]

// Trap focus within modal
modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    if (e.shiftKey) { // Shift + Tab
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus()
        e.preventDefault()
      }
    } else { // Tab
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement.focus()
        e.preventDefault()
      }
    }
  }

  if (e.key === 'Escape') {
    closeModal()
  }
})

// Focus first element when modal opens
firstFocusableElement.focus()
-->
```

**Accessibility Notes:**
- Provide visible focus indicators (3:1 contrast, 2px minimum outline)
- Use `:focus-visible` to hide focus ring for mouse users, show for keyboard users
- Support standard keyboard patterns (Tab, Shift+Tab, Enter, Escape, Arrow keys)
- Implement skip links for keyboard users to bypass repetitive content
- Maintain logical tab order (matches visual order, left-to-right, top-to-bottom)
- Avoid keyboard traps (unless intentional like modals with Escape key exit)
- Don't use `tabindex` values greater than 0 (creates unpredictable tab order)
- Trap focus within modals, restore focus when closed
- Support arrow key navigation for custom components (tabs, menus, sliders)
- Document keyboard shortcuts (Ctrl+K, Ctrl+S, etc.) and avoid conflicts with browser/OS shortcuts
- Test navigation with keyboard only (unplug mouse)
- Ensure all interactive elements are keyboard accessible

---

### Screen Reader Support

**Problem:** Visual-only interfaces exclude blind and low-vision users. Missing semantic HTML, ARIA labels, and proper structure make content inaccessible to screen readers.

**Solution:** Use semantic HTML elements, provide ARIA labels and roles where needed, implement landmark regions, and announce dynamic content changes with live regions.

#### Semantic HTML & Landmark Regions

```html
<!-- Use semantic HTML elements (not divs for everything) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessible Page Structure</title>
</head>
<body class="bg-neutral-50">
  <!-- Skip link for keyboard users -->
  <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-brand-primary focus:text-white focus:rounded-lg">
    Skip to main content
  </a>

  <!-- Header landmark -->
  <header class="bg-white border-b border-neutral-200" role="banner">
    <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold">
        <span class="sr-only">Home - </span>Brand Name
      </a>

      <!-- Primary navigation -->
      <nav aria-label="Main navigation">
        <ul class="flex gap-6">
          <li><a href="#" class="text-neutral-700 hover:text-neutral-900">Products</a></li>
          <li><a href="#" class="text-neutral-700 hover:text-neutral-900">About</a></li>
          <li><a href="#" class="text-neutral-700 hover:text-neutral-900">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <!-- Main content landmark -->
  <main id="main" tabindex="-1" class="max-w-7xl mx-auto px-4 py-8 focus:outline-none">
    <!-- Article with proper heading hierarchy -->
    <article>
      <h1 class="text-3xl font-bold mb-4">Page Title (H1)</h1>

      <section aria-labelledby="section-1-heading">
        <h2 id="section-1-heading" class="text-2xl font-semibold mb-3">Section Title (H2)</h2>
        <p class="text-neutral-600 mb-4">Content for this section...</p>

        <h3 class="text-xl font-medium mb-2">Subsection (H3)</h3>
        <p class="text-neutral-600 mb-4">More detailed content...</p>
      </section>

      <section aria-labelledby="section-2-heading">
        <h2 id="section-2-heading" class="text-2xl font-semibold mb-3">Another Section (H2)</h2>
        <p class="text-neutral-600 mb-4">Content for this section...</p>
      </section>
    </article>

    <!-- Aside/complementary content -->
    <aside aria-label="Related links" class="mt-8 p-6 bg-white rounded-lg border border-neutral-200">
      <h2 class="text-lg font-semibold mb-3">Related Content</h2>
      <ul class="space-y-2">
        <li><a href="#" class="text-brand-primary hover:underline">Related Article 1</a></li>
        <li><a href="#" class="text-brand-primary hover:underline">Related Article 2</a></li>
      </ul>
    </aside>
  </main>

  <!-- Footer landmark -->
  <footer class="bg-neutral-900 text-neutral-300 mt-12" role="contentinfo">
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Footer navigation -->
      <nav aria-label="Footer navigation">
        <ul class="flex gap-6">
          <li><a href="#" class="hover:text-white">Privacy</a></li>
          <li><a href="#" class="hover:text-white">Terms</a></li>
          <li><a href="#" class="hover:text-white">Contact</a></li>
        </ul>
      </nav>
      <p class="mt-4 text-sm">&copy; 2024 Brand Name. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>
```

#### ARIA Labels & Descriptions

```html
<!-- Icon buttons need aria-label -->
<button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100" aria-label="Close">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>

<!-- aria-labelledby references another element -->
<div role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
  <h2 id="dialog-title" class="text-xl font-semibold mb-2">Delete Account</h2>
  <p id="dialog-description" class="text-neutral-600 mb-4">
    This action cannot be undone. All your data will be permanently deleted.
  </p>
  <div class="flex gap-3">
    <button class="px-4 py-2 border border-neutral-300 rounded-lg">Cancel</button>
    <button class="px-4 py-2 bg-red-500 text-white rounded-lg">Delete</button>
  </div>
</div>

<!-- aria-label for search -->
<form role="search" aria-label="Site search">
  <label for="search" class="sr-only">Search</label>
  <input
    type="search"
    id="search"
    placeholder="Search..."
    class="px-4 py-2 border border-neutral-300 rounded-lg"
    aria-describedby="search-help"
  />
  <p id="search-help" class="sr-only">Press enter to search, escape to close</p>
</form>

<!-- aria-current for current page/item -->
<nav aria-label="Breadcrumb">
  <ol class="flex gap-2 text-sm">
    <li><a href="/" class="text-brand-primary hover:underline">Home</a></li>
    <li aria-hidden="true">/</li>
    <li><a href="/products" class="text-brand-primary hover:underline">Products</a></li>
    <li aria-hidden="true">/</li>
    <li aria-current="page" class="text-neutral-600">Laptop</li>
  </ol>
</nav>

<!-- aria-expanded for collapsible content -->
<button
  class="flex items-center justify-between w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg"
  aria-expanded="false"
  aria-controls="faq-answer-1"
>
  <span class="font-medium">What is your return policy?</span>
  <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>
</button>
<div id="faq-answer-1" class="hidden px-4 py-3 text-neutral-600">
  You can return items within 30 days for a full refund.
</div>
```

#### Live Regions (Dynamic Content)

```html
<!-- aria-live for dynamic updates -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="status-message">
  <!-- Screen reader will announce updates here -->
</div>

<!-- Toast notification (assertive) -->
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  class="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg"
>
  <div class="flex items-center gap-3">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
    <p>Changes saved successfully</p>
  </div>
</div>

<!-- Loading state announcement -->
<div aria-live="polite" aria-busy="true" class="flex items-center gap-3 p-4">
  <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  <span>Loading content...</span>
</div>

<!-- Form validation (polite) -->
<div class="space-y-2">
  <label for="email" class="block text-sm font-medium text-neutral-900">
    Email address
    <span class="text-red-500" aria-label="required">*</span>
  </label>
  <input
    type="email"
    id="email"
    required
    aria-required="true"
    aria-invalid="false"
    aria-describedby="email-error"
    class="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <!-- Error message (announced when aria-invalid changes to true) -->
  <p id="email-error" role="alert" class="text-sm text-red-600 hidden">
    Please enter a valid email address
  </p>
</div>

<!-- Progress updates -->
<div role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress" class="w-full bg-neutral-200 rounded-full h-2">
  <div class="bg-brand-primary h-2 rounded-full" style="width: 45%"></div>
</div>
<p aria-live="polite" class="text-sm text-neutral-600 mt-2">45% complete</p>
```

**Accessibility Notes:**
- Use semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`)
- Provide meaningful `alt` text for images (describe content/function, not just "image")
- Use proper heading hierarchy (H1 → H2 → H3, don't skip levels)
- Add `aria-label` to icon-only buttons and navigation regions
- Use `aria-live="polite"` for status updates, `aria-live="assertive"` for urgent alerts
- Mark required form fields with `aria-required="true"` and visual indicator
- Use `aria-invalid` and `aria-describedby` for form validation errors
- Provide `aria-current="page"` for current navigation item
- Use `role="alert"` for important messages that need immediate attention
- Add `aria-expanded` to expandable/collapsible components
- Test with screen readers (NVDA, JAWS, VoiceOver, TalkBack)
- Ensure all content is accessible via keyboard alone

---

### Reduced Motion

**Problem:** Animations and transitions can trigger vestibular disorders, motion sickness, or seizures in users sensitive to motion. Auto-playing animations are distracting for users with ADHD or cognitive disabilities.

**Solution:** Respect `prefers-reduced-motion` media query, provide alternative non-animated experiences, and allow users to disable animations entirely.

#### Respecting prefers-reduced-motion

```css
/* Tailwind config approach */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      animation: {
        // Default animations (full motion)
        'spin': 'spin 1s linear infinite',
        'bounce': 'bounce 1s infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    // Automatically disable animations for prefers-reduced-motion
    function({ addBase }) {
      addBase({
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            'animation-duration': '0.01ms !important',
            'animation-iteration-count': '1 !important',
            'transition-duration': '0.01ms !important',
            'scroll-behavior': 'auto !important',
          },
        },
      })
    },
  ],
}
```

#### CSS-based Reduced Motion

```html
<style>
/* Default animations */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

.slide-in {
  animation: slideIn 0.5s ease-out;
}

.scale-up {
  transition: transform 0.3s ease;
}

/* Disable animations for reduced motion users */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Keep essential state changes (opacity) but remove motion */
  .fade-in {
    animation: none;
    opacity: 1;
  }

  .slide-in {
    animation: none;
    transform: none;
  }

  .scale-up {
    transition: none;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>

<!-- Elements with animations -->
<div class="fade-in p-6 bg-white rounded-lg shadow">
  <h3 class="text-lg font-semibold mb-2">Animated Content</h3>
  <p class="text-neutral-600">
    This will fade in for users who allow motion, instantly appear for reduced motion users.
  </p>
</div>

<button class="scale-up px-6 py-3 bg-brand-primary text-white rounded-lg hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
  Hover to Scale (disabled for reduced motion)
</button>
```

#### Alternative Patterns (Motion vs. Reduced Motion)

```html
<!-- Loading spinner (motion) vs. static indicator (reduced motion) -->
<div class="flex items-center gap-3 p-4">
  <!-- Full motion: spinning loader -->
  <svg class="w-5 h-5 animate-spin motion-safe:block motion-reduce:hidden" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>

  <!-- Reduced motion: pulsing dots -->
  <div class="hidden motion-reduce:flex gap-1">
    <div class="w-2 h-2 bg-brand-primary rounded-full"></div>
    <div class="w-2 h-2 bg-brand-primary rounded-full"></div>
    <div class="w-2 h-2 bg-brand-primary rounded-full"></div>
  </div>

  <span>Loading...</span>
</div>

<!-- Smooth scroll (motion) vs. instant jump (reduced motion) -->
<style>
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
</style>

<a href="#section-2" class="text-brand-primary hover:underline">
  Jump to section 2 (smooth scroll for motion users, instant for reduced motion)
</a>

<!-- Parallax effect (motion) vs. static (reduced motion) -->
<div class="relative h-96 overflow-hidden">
  <!-- Full motion: parallax background -->
  <div
    class="absolute inset-0 bg-cover bg-center motion-safe:transform motion-safe:scale-110"
    style="background-image: url('hero-bg.jpg')"
    data-parallax
  ></div>

  <!-- Reduced motion: static background -->
  <div
    class="absolute inset-0 bg-cover bg-center motion-reduce:block motion-safe:hidden"
    style="background-image: url('hero-bg.jpg')"
  ></div>

  <div class="relative z-10 flex items-center justify-center h-full">
    <h1 class="text-4xl font-bold text-white">Hero Section</h1>
  </div>
</div>

<!-- Auto-playing carousel (motion) vs. manual controls (reduced motion) -->
<div class="relative" data-carousel>
  <!-- Carousel slides -->
  <div class="overflow-hidden">
    <div class="flex transition-transform duration-500 motion-reduce:transition-none">
      <div class="w-full flex-none p-6 bg-white rounded-lg">
        <h3 class="font-semibold mb-2">Slide 1</h3>
        <p class="text-neutral-600">Content for slide 1</p>
      </div>
    </div>
  </div>

  <!-- Manual controls (always visible for reduced motion, optional for motion) -->
  <div class="flex justify-center gap-2 mt-4">
    <button class="px-4 py-2 bg-neutral-200 rounded-lg hover:bg-neutral-300">Previous</button>
    <button class="px-4 py-2 bg-neutral-200 rounded-lg hover:bg-neutral-300">Next</button>
  </div>

  <!-- Auto-play indicator (motion only) -->
  <p class="text-center text-sm text-neutral-500 mt-2 motion-safe:block motion-reduce:hidden">
    Auto-advancing every 5 seconds
  </p>
</div>
```

#### User Preference Toggle

```html
<!-- Allow users to override system preference -->
<div class="p-6 bg-white rounded-lg shadow">
  <h3 class="text-lg font-semibold mb-4">Motion Preferences</h3>

  <div class="space-y-3">
    <label class="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name="motion-preference"
        value="system"
        checked
        class="w-4 h-4 text-brand-primary focus:ring-2 focus:ring-blue-500"
      />
      <div>
        <div class="font-medium">System default</div>
        <div class="text-sm text-neutral-600">Use your device's motion settings</div>
      </div>
    </label>

    <label class="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name="motion-preference"
        value="enabled"
        class="w-4 h-4 text-brand-primary focus:ring-2 focus:ring-blue-500"
      />
      <div>
        <div class="font-medium">Enable animations</div>
        <div class="text-sm text-neutral-600">Show all transitions and effects</div>
      </div>
    </label>

    <label class="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name="motion-preference"
        value="reduced"
        class="w-4 h-4 text-brand-primary focus:ring-2 focus:ring-blue-500"
      />
      <div>
        <div class="font-medium">Reduce motion</div>
        <div class="text-sm text-neutral-600">Minimize animations and effects</div>
      </div>
    </label>
  </div>

  <button class="mt-4 w-full py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-blue-600">
    Save Preferences
  </button>
</div>

<!-- JavaScript to apply preference -->
<!--
const preference = localStorage.getItem('motion-preference') || 'system'

if (preference === 'reduced') {
  document.documentElement.classList.add('reduce-motion')
} else if (preference === 'enabled') {
  document.documentElement.classList.add('enable-motion')
}

// CSS
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
-->
```

**Accessibility Notes:**
- Always respect `prefers-reduced-motion: reduce` media query (WCAG 2.3.3)
- Disable all non-essential animations for reduced motion users
- Keep essential state changes (opacity, visibility) but remove motion
- Provide alternative indicators (static icons instead of spinners)
- Don't auto-play videos or carousels for reduced motion users
- Allow manual control over all animations (play/pause buttons)
- Test with browser DevTools (emulate prefers-reduced-motion)
- Avoid flashing content (no more than 3 flashes per second - WCAG 2.3.1)
- Use `motion-safe:` and `motion-reduce:` Tailwind variants
- Provide user preference toggle to override system settings
- Consider cognitive load: fewer animations = less distraction
- Document animation preferences in settings/accessibility panel

---

