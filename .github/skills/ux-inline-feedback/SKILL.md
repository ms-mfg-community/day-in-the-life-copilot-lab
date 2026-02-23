---
name: ux-inline-feedback
description: Inline feedback patterns including toast notifications and tooltips. Use when implementing non-blocking, temporary user feedback, success messages, help text, or contextual information displays.
---

## User Feedback Patterns

### Toast Notifications

**Problem:** Users need non-blocking feedback for actions (save success, error occurred) without interrupting their workflow.

**Solution:** Temporary notifications that appear at screen edges, auto-dismiss after 3-5 seconds, with option to manually dismiss or take action.

#### Success Toast

```html
<!-- Success toast with auto-dismiss -->
<div class="fixed top-4 right-4 z-50 flex items-start gap-3 bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-md animate-slide-in" role="alert" aria-live="polite">
  <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
    <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
  </div>

  <div class="flex-1 min-w-0">
    <p class="text-sm font-semibold text-neutral-900">Changes saved</p>
    <p class="text-sm text-neutral-600 mt-0.5">Your profile has been updated successfully</p>
  </div>

  <button class="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Dismiss notification">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>

<!-- Success toast with action button (undo) -->
<div class="fixed top-4 right-4 z-50 flex items-start gap-3 bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-md" role="alert" aria-live="polite">
  <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
    <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
  </div>

  <div class="flex-1 min-w-0">
    <p class="text-sm font-semibold text-neutral-900">Item deleted</p>
    <button class="text-sm text-brand-primary hover:text-blue-600 font-medium mt-1">
      Undo
    </button>
  </div>

  <button class="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Dismiss notification">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>
```

#### Error Toast

```html
<!-- Error toast with retry action -->
<div class="fixed top-4 right-4 z-50 flex items-start gap-3 bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-md" role="alert" aria-live="assertive">
  <div class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
    <svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </div>

  <div class="flex-1 min-w-0">
    <p class="text-sm font-semibold text-neutral-900">Upload failed</p>
    <p class="text-sm text-neutral-600 mt-0.5">Connection timeout. Please try again.</p>
    <button class="text-sm text-brand-primary hover:text-blue-600 font-medium mt-2">
      Retry upload
    </button>
  </div>

  <button class="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Dismiss notification">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>
```

#### Warning and Info Toasts

```html
<!-- Warning toast -->
<div class="fixed top-4 right-4 z-50 flex items-start gap-3 bg-white border-l-4 border-amber-500 rounded-lg shadow-lg p-4 max-w-md" role="alert" aria-live="polite">
  <div class="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
    <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  </div>

  <div class="flex-1 min-w-0">
    <p class="text-sm font-semibold text-neutral-900">Storage almost full</p>
    <p class="text-sm text-neutral-600 mt-0.5">You've used 95% of your storage quota</p>
    <a href="/upgrade" class="text-sm text-brand-primary hover:text-blue-600 font-medium mt-2 inline-block">
      Upgrade plan
    </a>
  </div>

  <button class="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Dismiss notification">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>

<!-- Info toast -->
<div class="fixed top-4 right-4 z-50 flex items-start gap-3 bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-4 max-w-md" role="alert" aria-live="polite">
  <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
    <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </div>

  <div class="flex-1 min-w-0">
    <p class="text-sm font-semibold text-neutral-900">New feature available</p>
    <p class="text-sm text-neutral-600 mt-0.5">Try our new collaboration tools</p>
    <a href="/whats-new" class="text-sm text-brand-primary hover:text-blue-600 font-medium mt-2 inline-block">
      Learn more
    </a>
  </div>

  <button class="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Dismiss notification">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>
```

#### Toast Stack (Multiple Toasts)

```html
<!-- Container for stacking multiple toasts -->
<div class="fixed top-4 right-4 z-50 space-y-3 max-w-md">
  <!-- First toast -->
  <div class="flex items-start gap-3 bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4" role="alert" aria-live="polite">
    <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
      <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-neutral-900">File uploaded</p>
    </div>
    <button class="text-neutral-400 hover:text-neutral-600" aria-label="Dismiss notification">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Second toast -->
  <div class="flex items-start gap-3 bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-4" role="alert" aria-live="polite">
    <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
      <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-neutral-900">Processing started</p>
    </div>
    <button class="text-neutral-400 hover:text-neutral-600" aria-label="Dismiss notification">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</div>
```

**Accessibility Notes:**
- Use `role="alert"` for all toast notifications
- Use `aria-live="assertive"` for errors (interrupts screen reader), `aria-live="polite"` for other types
- Auto-dismiss after 5 seconds for info/success, 7-10 seconds for warnings, never auto-dismiss errors
- Provide clear dismiss button with `aria-label="Dismiss notification"`
- Ensure sufficient color contrast (not relying on color alone)
- Stack toasts vertically, newest on top
- Limit to 3-5 toasts visible at once (queue older ones)
- Make action buttons keyboard accessible

---

### Tooltips

**Problem:** Users need contextual help or additional information without cluttering the interface.

**Solution:** Small overlays that appear on hover or click, providing just-in-time information near the trigger element.

#### Hover Tooltip (Simple)

```html
<!-- Simple hover tooltip -->
<div class="relative inline-block group">
  <button class="p-2 text-neutral-600 hover:text-neutral-900 transition-colors">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </button>

  <!-- Tooltip -->
  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none" role="tooltip">
    More information
    <!-- Arrow -->
    <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900"></div>
  </div>
</div>

<!-- Tooltip positioned on different sides -->
<div class="flex gap-4">
  <!-- Top tooltip -->
  <div class="relative inline-block group">
    <button class="px-4 py-2 bg-neutral-100 rounded-lg">Hover (top)</button>
    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none" role="tooltip">
      Tooltip appears above
      <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900"></div>
    </div>
  </div>

  <!-- Right tooltip -->
  <div class="relative inline-block group">
    <button class="px-4 py-2 bg-neutral-100 rounded-lg">Hover (right)</button>
    <div class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none" role="tooltip">
      Tooltip appears right
      <div class="absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-neutral-900"></div>
    </div>
  </div>

  <!-- Bottom tooltip -->
  <div class="relative inline-block group">
    <button class="px-4 py-2 bg-neutral-100 rounded-lg">Hover (bottom)</button>
    <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none" role="tooltip">
      Tooltip appears below
      <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-neutral-900"></div>
    </div>
  </div>

  <!-- Left tooltip -->
  <div class="relative inline-block group">
    <button class="px-4 py-2 bg-neutral-100 rounded-lg">Hover (left)</button>
    <div class="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none" role="tooltip">
      Tooltip appears left
      <div class="absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-neutral-900"></div>
    </div>
  </div>
</div>
```

#### Click Tooltip (Toggleable)

```html
<!-- Click-to-toggle tooltip with close button -->
<div class="relative inline-block">
  <button class="px-4 py-2 bg-brand-primary text-white rounded-lg" aria-describedby="tooltip-help">
    Need help?
  </button>

  <!-- Tooltip (toggle with JavaScript) -->
  <div id="tooltip-help" class="hidden absolute top-full left-0 mt-2 w-64 p-4 bg-white border border-neutral-200 rounded-lg shadow-lg z-10" role="tooltip">
    <div class="flex items-start justify-between gap-2 mb-2">
      <p class="text-sm font-semibold text-neutral-900">Getting started</p>
      <button class="text-neutral-400 hover:text-neutral-600" aria-label="Close tooltip">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <p class="text-sm text-neutral-600 mb-3">
      Click the "+" button to create your first project. You can organize projects by team or department.
    </p>
    <a href="/docs" class="text-sm text-brand-primary hover:text-blue-600 font-medium">
      View full guide →
    </a>
    <!-- Arrow -->
    <div class="absolute bottom-full left-4 -mb-1 border-4 border-transparent border-b-white"></div>
    <div class="absolute bottom-full left-4 -mb-2 border-4 border-transparent border-b-neutral-200"></div>
  </div>
</div>
```

#### Rich Tooltip with Formatting

```html
<!-- Rich tooltip with icons, links, and formatting -->
<div class="relative inline-block group">
  <button class="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors">
    <span>Feature details</span>
    <svg class="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </button>

  <!-- Rich tooltip -->
  <div class="absolute top-full left-0 mt-2 w-80 p-4 bg-white border border-neutral-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10" role="tooltip">
    <!-- Header with icon -->
    <div class="flex items-start gap-3 mb-3">
      <div class="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <p class="text-sm font-semibold text-neutral-900">Real-time collaboration</p>
        <span class="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
          Pro feature
        </span>
      </div>
    </div>

    <!-- Description -->
    <p class="text-sm text-neutral-600 mb-3">
      Work together in real-time with your team. See cursors, edits, and comments as they happen.
    </p>

    <!-- Feature list -->
    <ul class="space-y-2 mb-3">
      <li class="flex items-center gap-2 text-sm text-neutral-700">
        <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Live cursor tracking
      </li>
      <li class="flex items-center gap-2 text-sm text-neutral-700">
        <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Instant sync
      </li>
      <li class="flex items-center gap-2 text-sm text-neutral-700">
        <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Conflict resolution
      </li>
    </ul>

    <!-- CTA -->
    <a href="/upgrade" class="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-blue-600 font-medium">
      Upgrade to Pro
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>

    <!-- Arrow -->
    <div class="absolute bottom-full left-6 -mb-1 border-4 border-transparent border-b-white"></div>
    <div class="absolute bottom-full left-6 -mb-2 border-4 border-transparent border-b-neutral-200"></div>
  </div>
</div>
```

#### Keyboard Shortcut Tooltip

```html
<!-- Tooltip showing keyboard shortcut -->
<div class="relative inline-block group">
  <button class="p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors" aria-label="Save (Ctrl+S)">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  </button>

  <!-- Tooltip with keyboard shortcut -->
  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none flex items-center gap-2" role="tooltip">
    <span>Save</span>
    <kbd class="px-1.5 py-0.5 bg-neutral-700 rounded text-xs font-mono">Ctrl+S</kbd>
    <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900"></div>
  </div>
</div>
```

**Accessibility Notes:**
- Use `role="tooltip"` on tooltip element
- Use `aria-describedby` to associate tooltip with trigger element
- Show tooltip on both hover and keyboard focus (`:focus` state)
- Tooltip should appear on focus and disappear on blur
- Don't hide interactive elements inside hover-only tooltips (use click tooltips instead)
- Ensure tooltip doesn't interfere with reading/clicking underlying content
- Use `pointer-events: none` on hover tooltips to prevent interference
- Provide 300-500ms delay before showing tooltip (prevent accidental triggers)
- Keep tooltip text concise (1-2 sentences max)
- Position tooltips so they don't overflow viewport (use JS for smart positioning)

---

