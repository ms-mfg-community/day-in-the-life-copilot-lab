---
name: ux-system-dialogs
description: System dialog patterns including modal dialogs, confirmation dialogs, progress indicators, and undo patterns. Use when implementing blocking interactions, confirmations, critical user actions, or system-level feedback.
---

### Modal Dialogs

**Problem:** Users need focused interactions for critical actions (confirmations, forms) without leaving current context.

**Solution:** Overlay dialogs that block interaction with underlying content, with clear primary/secondary actions and escape routes.

#### Confirmation Modal

```html
<!-- Destructive action confirmation -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog" aria-labelledby="modal-title">
  <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
    <!-- Icon -->
    <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
      <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </div>

    <!-- Content -->
    <h2 id="modal-title" class="text-xl font-semibold text-neutral-900 mb-2">
      Delete project?
    </h2>
    <p class="text-neutral-600 mb-6">
      This will permanently delete "Marketing Campaign" and all its data. This action cannot be undone.
    </p>

    <!-- Actions -->
    <div class="flex gap-3 justify-end">
      <button type="button" class="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg font-medium transition-colors">
        Cancel
      </button>
      <button type="button" class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-semibold transition-colors">
        Delete project
      </button>
    </div>
  </div>
</div>
```

#### Form Modal

```html
<!-- Modal with form inputs -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog" aria-labelledby="form-modal-title">
  <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-neutral-200">
      <h2 id="form-modal-title" class="text-xl font-semibold text-neutral-900">
        Create new project
      </h2>
      <button type="button" class="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Close modal">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Form content -->
    <form class="p-6 space-y-6">
      <div>
        <label for="project-name" class="block text-sm font-medium text-neutral-700 mb-2">
          Project name <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="project-name"
          class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          placeholder="Enter project name"
          required
        />
      </div>

      <div>
        <label for="project-desc" class="block text-sm font-medium text-neutral-700 mb-2">
          Description
        </label>
        <textarea
          id="project-desc"
          rows="4"
          class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
          placeholder="What's this project about?"
        ></textarea>
      </div>

      <div>
        <label for="project-team" class="block text-sm font-medium text-neutral-700 mb-2">
          Team
        </label>
        <select
          id="project-team"
          class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
        >
          <option>Marketing</option>
          <option>Engineering</option>
          <option>Design</option>
        </select>
      </div>

      <!-- Footer with actions -->
      <div class="flex gap-3 justify-end pt-4 border-t border-neutral-200">
        <button type="button" class="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg font-medium transition-colors">
          Cancel
        </button>
        <button type="submit" class="px-4 py-2 bg-brand-primary text-white hover:bg-blue-600 rounded-lg font-semibold transition-colors">
          Create project
        </button>
      </div>
    </form>
  </div>
</div>
```

#### Alert Modal

```html
<!-- Simple alert/info modal -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="alertdialog" aria-labelledby="alert-title" aria-describedby="alert-desc">
  <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
    <!-- Icon -->
    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
      <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>

    <!-- Content -->
    <h2 id="alert-title" class="text-lg font-semibold text-neutral-900 text-center mb-2">
      Session expired
    </h2>
    <p id="alert-desc" class="text-neutral-600 text-center mb-6">
      Your session has expired. Please log in again to continue.
    </p>

    <!-- Actions -->
    <button type="button" class="w-full px-4 py-2 bg-brand-primary text-white hover:bg-blue-600 rounded-lg font-semibold transition-colors">
      Log in
    </button>
  </div>
</div>
```

#### Full-Screen Modal (Mobile)

```html
<!-- Full-screen modal for mobile devices -->
<div class="fixed inset-0 z-50 bg-white overflow-y-auto" aria-modal="true" role="dialog" aria-labelledby="fullscreen-title">
  <!-- Header -->
  <div class="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
    <button type="button" class="text-neutral-700 hover:text-neutral-900 transition-colors" aria-label="Close">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h1 id="fullscreen-title" class="text-lg font-semibold text-neutral-900">
      Settings
    </h1>
    <button type="button" class="text-brand-primary hover:text-blue-600 font-semibold transition-colors">
      Save
    </button>
  </div>

  <!-- Content -->
  <div class="p-4 space-y-6">
    <section>
      <h2 class="text-base font-semibold text-neutral-900 mb-3">Account</h2>
      <div class="space-y-3">
        <div class="flex items-center justify-between py-3 border-b border-neutral-200">
          <span class="text-neutral-700">Email notifications</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only peer" checked />
            <div class="w-11 h-6 bg-neutral-300 peer-focus:ring-2 peer-focus:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
          </label>
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-base font-semibold text-neutral-900 mb-3">Privacy</h2>
      <div class="space-y-3">
        <div class="flex items-center justify-between py-3 border-b border-neutral-200">
          <span class="text-neutral-700">Profile visibility</span>
          <select class="px-3 py-1 border border-neutral-300 rounded-lg text-sm">
            <option>Public</option>
            <option>Private</option>
          </select>
        </div>
      </div>
    </section>
  </div>
</div>
```

**Accessibility Notes:**
- Use `role="dialog"` or `role="alertdialog"` on modal container
- Set `aria-modal="true"` to indicate modal context
- Use `aria-labelledby` (points to title) and `aria-describedby` (points to description)
- Trap focus within modal (Esc key closes, Tab cycles through modal elements)
- Disable body scroll when modal is open
- Return focus to trigger element when modal closes
- Provide visible close button and allow Esc key to close
- Use clear visual hierarchy (primary vs. secondary actions)
- For destructive actions, make primary button red and labeled clearly
- Ensure backdrop click closes modal (except for critical confirmations)

---

### Progress Indicators

**Problem:** Users need feedback during long-running operations to know the system is working and how long they'll wait.

**Solution:** Visual indicators showing determinate (known duration) or indeterminate (unknown duration) progress.

#### Linear Progress Bar (Determinate)

```html
<!-- Progress bar with percentage -->
<div class="space-y-2">
  <div class="flex items-center justify-between text-sm">
    <span class="font-medium text-neutral-700">Uploading files...</span>
    <span class="text-neutral-600">68%</span>
  </div>
  <div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
    <div class="h-full bg-brand-primary rounded-full transition-all duration-300" style="width: 68%" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress"></div>
  </div>
  <p class="text-xs text-neutral-500">3 of 12 files uploaded</p>
</div>

<!-- Progress bar with ETA -->
<div class="space-y-2">
  <div class="flex items-center justify-between text-sm">
    <span class="font-medium text-neutral-700">Processing video...</span>
    <span class="text-neutral-600">~2 min remaining</span>
  </div>
  <div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
    <div class="h-full bg-green-500 rounded-full transition-all duration-300" style="width: 45%" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" aria-label="Video processing progress"></div>
  </div>
</div>

<!-- Stepped progress (multi-step process) -->
<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
        ✓
      </div>
      <span class="text-sm font-medium text-neutral-900">Upload</span>
    </div>
    <div class="flex-1 mx-4 h-0.5 bg-green-500"></div>

    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
        2
      </div>
      <span class="text-sm font-medium text-neutral-900">Process</span>
    </div>
    <div class="flex-1 mx-4 h-0.5 bg-neutral-200"></div>

    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center text-sm font-semibold">
        3
      </div>
      <span class="text-sm font-medium text-neutral-500">Complete</span>
    </div>
  </div>

  <div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
    <div class="h-full bg-brand-primary rounded-full transition-all duration-300" style="width: 60%" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" aria-label="Overall progress"></div>
  </div>
</div>
```

#### Linear Progress Bar (Indeterminate)

```html
<!-- Indeterminate progress (unknown duration) -->
<div class="space-y-2">
  <p class="text-sm font-medium text-neutral-700">Loading...</p>
  <div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
    <div class="h-full w-1/3 bg-brand-primary rounded-full animate-progress-indeterminate" role="progressbar" aria-busy="true" aria-label="Loading"></div>
  </div>
</div>

<!-- Tailwind config for animation -->
<!--
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' }
        }
      },
      animation: {
        'progress-indeterminate': 'progress-indeterminate 1.5s ease-in-out infinite'
      }
    }
  }
}
-->
```

#### Circular Progress (Determinate)

```html
<!-- Circular progress with percentage -->
<div class="relative w-24 h-24">
  <!-- SVG circle -->
  <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
    <!-- Background circle -->
    <circle
      cx="50"
      cy="50"
      r="42"
      fill="none"
      stroke="#E5E7EB"
      stroke-width="8"
    />
    <!-- Progress circle (75% complete) -->
    <circle
      cx="50"
      cy="50"
      r="42"
      fill="none"
      stroke="#3B82F6"
      stroke-width="8"
      stroke-dasharray="264"
      stroke-dashoffset="66"
      stroke-linecap="round"
      role="progressbar"
      aria-valuenow="75"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Download progress"
    />
  </svg>
  <!-- Percentage text -->
  <div class="absolute inset-0 flex items-center justify-center">
    <span class="text-lg font-semibold text-neutral-900">75%</span>
  </div>
</div>

<!-- Circular progress with label -->
<div class="flex flex-col items-center gap-2">
  <div class="relative w-20 h-20">
    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" stroke-width="8" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#10B981" stroke-width="8" stroke-dasharray="264" stroke-dashoffset="0" stroke-linecap="round" />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <svg class="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  </div>
  <p class="text-sm font-medium text-neutral-700">Upload complete</p>
</div>
```

#### Circular Progress (Indeterminate/Spinner)

```html
<!-- Spinning loader -->
<div class="flex items-center justify-center p-8">
  <svg class="animate-spin h-12 w-12 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="img" aria-label="Loading">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
</div>

<!-- Spinner with label -->
<div class="flex flex-col items-center gap-3 p-8">
  <svg class="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  <p class="text-sm text-neutral-600">Loading your data...</p>
</div>

<!-- Dots loader (alternative) -->
<div class="flex items-center gap-2 p-8">
  <div class="w-3 h-3 bg-brand-primary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
  <div class="w-3 h-3 bg-brand-primary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
  <div class="w-3 h-3 bg-brand-primary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
</div>
```

#### Skeleton Loader

```html
<!-- Skeleton loader for card content -->
<div class="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
  <!-- Header skeleton -->
  <div class="flex items-center gap-3">
    <div class="w-12 h-12 bg-neutral-200 rounded-full animate-pulse"></div>
    <div class="flex-1 space-y-2">
      <div class="h-4 bg-neutral-200 rounded w-1/3 animate-pulse"></div>
      <div class="h-3 bg-neutral-200 rounded w-1/4 animate-pulse"></div>
    </div>
  </div>

  <!-- Content skeleton -->
  <div class="space-y-2">
    <div class="h-3 bg-neutral-200 rounded animate-pulse"></div>
    <div class="h-3 bg-neutral-200 rounded w-5/6 animate-pulse"></div>
    <div class="h-3 bg-neutral-200 rounded w-4/6 animate-pulse"></div>
  </div>

  <!-- Footer skeleton -->
  <div class="flex items-center gap-2">
    <div class="h-8 bg-neutral-200 rounded w-20 animate-pulse"></div>
    <div class="h-8 bg-neutral-200 rounded w-16 animate-pulse"></div>
  </div>
</div>
```

**Accessibility Notes:**
- Use `role="progressbar"` on progress elements
- Set `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for determinate progress
- Use `aria-busy="true"` for indeterminate progress
- Provide `aria-label` describing what's loading/processing
- Use `aria-live="polite"` for progress percentage announcements
- Don't rely on color alone (provide text/percentage)
- For long operations (>10s), provide ETA or step information
- Consider adding cancel button for long operations
- Update screen readers periodically (not on every 1% change)
- Use skeleton loaders for better perceived performance

---

### Undo Patterns

**Problem:** Users make mistakes and need a way to reverse actions without data loss or frustration.

**Solution:** Provide clear, immediate undo mechanisms that preserve user data and confidence.

#### Undo Toast (Destructive Action)

```html
<!-- Undo toast appears after delete -->
<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-neutral-900 text-white rounded-lg shadow-xl px-4 py-3 max-w-md" role="alert" aria-live="polite">
  <div class="flex items-center gap-3 flex-1">
    <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
    <span class="text-sm font-medium">Deleted "Project Alpha"</span>
  </div>

  <button class="px-3 py-1.5 bg-white text-neutral-900 hover:bg-neutral-100 rounded font-medium text-sm transition-colors">
    Undo
  </button>

  <!-- Auto-dismiss timer (visual indicator) -->
  <div class="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-full animate-shrink" style="width: 100%; animation: shrink 5s linear forwards"></div>
</div>

<!-- CSS for shrink animation -->
<!--
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
-->
```

#### Undo Toast with Details

```html
<!-- Undo toast with more context -->
<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white rounded-lg shadow-xl p-4 max-w-lg" role="alert" aria-live="polite">
  <div class="flex items-start justify-between gap-4 mb-2">
    <div class="flex items-start gap-3">
      <svg class="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <div>
        <p class="text-sm font-semibold">3 items deleted</p>
        <p class="text-sm text-neutral-300 mt-0.5">Project Alpha, Beta Design, Marketing Plan</p>
      </div>
    </div>

    <button class="text-neutral-400 hover:text-white transition-colors" aria-label="Dismiss">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <div class="flex items-center gap-2">
    <button class="px-4 py-2 bg-white text-neutral-900 hover:bg-neutral-100 rounded-lg font-semibold text-sm transition-colors">
      Undo
    </button>
    <span class="text-xs text-neutral-400">Auto-deleting in 5s</span>
  </div>
</div>
```

#### Bulk Undo (Batch Operations)

```html
<!-- Bulk action with undo -->
<div class="fixed top-4 right-4 z-50 bg-white border border-neutral-200 rounded-lg shadow-xl p-4 max-w-md" role="alert" aria-live="polite">
  <div class="flex items-start gap-3 mb-3">
    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
      <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div class="flex-1">
      <p class="text-sm font-semibold text-neutral-900">Archived 12 conversations</p>
      <p class="text-sm text-neutral-600 mt-1">They've been moved to your archive.</p>
    </div>
  </div>

  <div class="flex items-center gap-2">
    <button class="px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg font-medium text-sm transition-colors">
      Undo
    </button>
    <button class="px-3 py-1.5 text-neutral-600 hover:text-neutral-900 text-sm transition-colors">
      View archive
    </button>
  </div>

  <!-- Progress indicator -->
  <div class="mt-3 w-full h-1 bg-neutral-200 rounded-full overflow-hidden">
    <div class="h-full bg-green-500 rounded-full animate-shrink"></div>
  </div>
</div>
```

#### Undo History Stack

```html
<!-- Undo/redo history UI (e.g., in toolbar) -->
<div class="flex items-center gap-1 border border-neutral-300 rounded-lg p-1">
  <!-- Undo button -->
  <button class="p-2 text-neutral-600 hover:bg-neutral-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Undo" title="Undo (Ctrl+Z)">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  </button>

  <!-- Redo button -->
  <button class="p-2 text-neutral-600 hover:bg-neutral-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Redo" title="Redo (Ctrl+Y)" disabled>
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
    </svg>
  </button>

  <!-- Dropdown showing undo history -->
  <button class="p-2 text-neutral-600 hover:bg-neutral-100 rounded transition-colors" aria-label="View history">
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
</div>

<!-- Undo history dropdown -->
<div class="absolute top-full mt-2 w-64 bg-white border border-neutral-200 rounded-lg shadow-xl p-2 z-10">
  <div class="text-xs font-semibold text-neutral-500 uppercase px-3 py-2">
    Recent actions
  </div>
  <div class="max-h-64 overflow-y-auto">
    <button class="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded transition-colors">
      Deleted "Marketing Plan.pdf"
    </button>
    <button class="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded transition-colors">
      Edited "Project Overview"
    </button>
    <button class="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded transition-colors">
      Added 3 new files
    </button>
    <button class="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded transition-colors">
      Renamed folder "Archive"
    </button>
  </div>
  <div class="border-t border-neutral-200 mt-2 pt-2">
    <button class="w-full text-left px-3 py-2 text-sm text-brand-primary hover:bg-blue-50 rounded transition-colors font-medium">
      Clear history
    </button>
  </div>
</div>
```

#### Inline Undo (Form Field)

```html
<!-- Undo recent change in a form field -->
<div class="space-y-2">
  <label for="project-name" class="block text-sm font-medium text-neutral-700">
    Project name
  </label>
  <div class="relative">
    <input
      type="text"
      id="project-name"
      class="w-full px-4 py-2 pr-20 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
      value="New Project Title"
    />
    <!-- Undo button appears after edit -->
    <button class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-brand-primary hover:text-blue-600 font-medium">
      Undo
    </button>
  </div>
  <p class="text-xs text-neutral-500">Changed from "Project Alpha"</p>
</div>
```

**Accessibility Notes:**
- Provide clear visual and text indication of what was undone
- Auto-dismiss undo toasts after 5-10 seconds (enough time to react)
- Make undo button keyboard accessible with clear focus states
- Use `aria-live="polite"` for undo notifications (don't interrupt)
- Support keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y for redo)
- Clearly communicate when undo is no longer possible ("Changes saved")
- For bulk operations, show what will be undone
- Disable undo/redo buttons when history is empty
- Provide visual countdown/timer for auto-expire
- Consider implementing multi-level undo (history stack)

---

