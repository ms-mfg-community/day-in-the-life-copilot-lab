---
name: ux-component-states
description: Component state patterns including loading states, empty states, error states, and success states. Use when implementing UI state management, skeleton loaders, state transitions, or handling async operations.
---

## Interaction Design Patterns

### Loading States

**Problem:** Users need feedback during data fetching or processing, otherwise they assume the app is broken.

**Solution:** Provide clear visual indicators that work is happening, with appropriate patterns for different loading scenarios.

#### Skeleton Loaders (Content Placeholders)

```html
<!-- Article skeleton loader -->
<div class="bg-white rounded-lg shadow-md p-6 space-y-4 animate-pulse">
  <!-- Title skeleton -->
  <div class="h-6 bg-neutral-200 rounded w-3/4"></div>

  <!-- Subtitle skeleton -->
  <div class="h-4 bg-neutral-200 rounded w-1/2"></div>

  <!-- Paragraph skeletons -->
  <div class="space-y-2">
    <div class="h-4 bg-neutral-200 rounded"></div>
    <div class="h-4 bg-neutral-200 rounded"></div>
    <div class="h-4 bg-neutral-200 rounded w-5/6"></div>
  </div>

  <!-- Action skeleton -->
  <div class="h-10 bg-neutral-200 rounded w-32"></div>
</div>

<!-- Card grid skeleton -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div class="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <!-- Image skeleton -->
    <div class="h-48 bg-neutral-200"></div>

    <!-- Content skeleton -->
    <div class="p-6 space-y-3">
      <div class="h-4 bg-neutral-200 rounded w-1/4"></div>
      <div class="h-6 bg-neutral-200 rounded w-3/4"></div>
      <div class="space-y-2">
        <div class="h-3 bg-neutral-200 rounded"></div>
        <div class="h-3 bg-neutral-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>

  <!-- Repeat for multiple cards -->
  <div class="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div class="h-48 bg-neutral-200"></div>
    <div class="p-6 space-y-3">
      <div class="h-4 bg-neutral-200 rounded w-1/4"></div>
      <div class="h-6 bg-neutral-200 rounded w-3/4"></div>
      <div class="space-y-2">
        <div class="h-3 bg-neutral-200 rounded"></div>
        <div class="h-3 bg-neutral-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
</div>

<!-- Table skeleton -->
<div class="bg-white rounded-lg shadow-md overflow-hidden">
  <table class="w-full">
    <thead class="bg-neutral-50 border-b border-neutral-200">
      <tr>
        <th class="px-6 py-3"><div class="h-4 bg-neutral-200 rounded w-24"></div></th>
        <th class="px-6 py-3"><div class="h-4 bg-neutral-200 rounded w-32"></div></th>
        <th class="px-6 py-3"><div class="h-4 bg-neutral-200 rounded w-20"></div></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-neutral-200 animate-pulse">
      <tr>
        <td class="px-6 py-4"><div class="h-4 bg-neutral-200 rounded w-32"></div></td>
        <td class="px-6 py-4"><div class="h-4 bg-neutral-200 rounded w-48"></div></td>
        <td class="px-6 py-4"><div class="h-4 bg-neutral-200 rounded w-16"></div></td>
      </tr>
      <!-- Repeat rows -->
    </tbody>
  </table>
</div>
```

#### Spinners (Indeterminate Progress)

```html
<!-- Basic spinner -->
<div class="flex items-center justify-center p-8">
  <div class="w-8 h-8 border-4 border-neutral-200 border-t-brand-primary rounded-full animate-spin"></div>
</div>

<!-- Spinner with text -->
<div class="flex flex-col items-center justify-center p-8 space-y-3">
  <div class="w-10 h-10 border-4 border-neutral-200 border-t-brand-primary rounded-full animate-spin"></div>
  <p class="text-sm text-neutral-600">Loading your data...</p>
</div>

<!-- Inline spinner (for buttons) -->
<button class="px-4 py-2 bg-brand-primary text-white rounded-lg flex items-center gap-2" disabled>
  <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  Processing...
</button>

<!-- Overlay spinner (full-screen loading) -->
<div class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
  <div class="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-4">
    <div class="w-12 h-12 border-4 border-neutral-200 border-t-brand-primary rounded-full animate-spin"></div>
    <p class="text-neutral-900 font-medium">Loading...</p>
    <p class="text-sm text-neutral-600">Please wait while we fetch your data</p>
  </div>
</div>

<!-- Pulsing dots (alternative to spinner) -->
<div class="flex items-center gap-2">
  <span class="w-3 h-3 bg-brand-primary rounded-full animate-pulse"></span>
  <span class="w-3 h-3 bg-brand-primary rounded-full animate-pulse [animation-delay:0.2s]"></span>
  <span class="w-3 h-3 bg-brand-primary rounded-full animate-pulse [animation-delay:0.4s]"></span>
</div>
```

#### Progress Bars (Determinate Progress)

```html
<!-- Linear progress bar -->
<div class="space-y-2">
  <div class="flex items-center justify-between text-sm">
    <span class="font-medium text-neutral-700">Uploading file...</span>
    <span class="text-neutral-600">68%</span>
  </div>

  <div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
    <div
      class="h-full bg-brand-primary rounded-full transition-all duration-300"
      style="width: 68%"
      role="progressbar"
      aria-valuenow="68"
      aria-valuemin="0"
      aria-valuemax="100"
    ></div>
  </div>
</div>

<!-- Progress bar with steps -->
<div class="space-y-4">
  <div class="flex items-center justify-between text-sm font-medium">
    <span class="text-neutral-700">Step 2 of 4: Review Details</span>
    <span class="text-neutral-600">50%</span>
  </div>

  <div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
    <div class="h-full bg-brand-primary rounded-full" style="width: 50%"></div>
  </div>

  <!-- Step indicators -->
  <div class="flex items-center justify-between">
    <div class="flex flex-col items-center gap-1">
      <div class="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
        ✓
      </div>
      <span class="text-xs text-neutral-600">Account</span>
    </div>

    <div class="flex flex-col items-center gap-1">
      <div class="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
        2
      </div>
      <span class="text-xs text-neutral-900 font-medium">Details</span>
    </div>

    <div class="flex flex-col items-center gap-1">
      <div class="w-8 h-8 bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center text-sm font-medium">
        3
      </div>
      <span class="text-xs text-neutral-500">Payment</span>
    </div>

    <div class="flex flex-col items-center gap-1">
      <div class="w-8 h-8 bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center text-sm font-medium">
        4
      </div>
      <span class="text-xs text-neutral-500">Confirm</span>
    </div>
  </div>
</div>

<!-- Circular progress -->
<div class="relative w-24 h-24">
  <svg class="w-full h-full -rotate-90">
    <!-- Background circle -->
    <circle
      cx="48"
      cy="48"
      r="40"
      stroke="currentColor"
      stroke-width="8"
      fill="none"
      class="text-neutral-200"
    />
    <!-- Progress circle -->
    <circle
      cx="48"
      cy="48"
      r="40"
      stroke="currentColor"
      stroke-width="8"
      fill="none"
      stroke-linecap="round"
      class="text-brand-primary transition-all duration-300"
      stroke-dasharray="251.2"
      stroke-dashoffset="75.36"
    />
  </svg>
  <div class="absolute inset-0 flex items-center justify-center">
    <span class="text-lg font-semibold text-neutral-900">70%</span>
  </div>
</div>
```

#### Shimmer Effect (Animated Loading)

```html
<!-- Shimmer animation CSS (add to your styles) -->
<style>
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.shimmer {
  animation: shimmer 2s infinite;
  background: linear-gradient(
    to right,
    #f3f4f6 0%,
    #e5e7eb 20%,
    #f3f4f6 40%,
    #f3f4f6 100%
  );
  background-size: 1000px 100%;
}
</style>

<!-- Shimmer skeleton card -->
<div class="bg-white rounded-lg shadow-md overflow-hidden">
  <div class="h-48 shimmer"></div>
  <div class="p-6 space-y-3">
    <div class="h-4 shimmer rounded w-1/4"></div>
    <div class="h-6 shimmer rounded w-3/4"></div>
    <div class="space-y-2">
      <div class="h-3 shimmer rounded"></div>
      <div class="h-3 shimmer rounded w-5/6"></div>
    </div>
  </div>
</div>
```

**Accessibility Notes:**
- Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for progress bars
- Provide text alternatives for visual loading indicators
- Use `aria-live="polite"` for loading status updates
- Ensure loading overlays don't trap keyboard focus
- Match skeleton loader structure to actual content structure (helps screen reader users)

---

### Empty States

**Problem:** Users encounter pages with no data and don't know if it's an error, if they should wait, or what action to take.

**Solution:** Design helpful empty states that explain the situation and guide users toward productive actions.

#### First-Use Empty States

```html
<!-- Onboarding empty state -->
<div class="flex flex-col items-center justify-center p-12 text-center">
  <!-- Illustration placeholder -->
  <div class="w-64 h-64 mb-6 bg-neutral-100 rounded-lg flex items-center justify-center">
    <svg class="w-32 h-32 text-neutral-300">
      <!-- Illustration or icon -->
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="48">📁</text>
    </svg>
  </div>

  <!-- Message -->
  <h3 class="text-2xl font-bold text-neutral-900 mb-2">
    No projects yet
  </h3>
  <p class="text-neutral-600 mb-6 max-w-md">
    Get started by creating your first project. Projects help you organize your work and collaborate with your team.
  </p>

  <!-- Primary action -->
  <button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
    Create Your First Project
  </button>

  <!-- Secondary action (optional) -->
  <button class="mt-3 text-brand-primary hover:underline text-sm">
    Watch tutorial video
  </button>
</div>

<!-- Multi-step onboarding empty state -->
<div class="bg-white rounded-lg shadow-md p-8">
  <div class="text-center mb-8">
    <div class="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-10 h-10 text-brand-primary">🚀</svg>
    </div>
    <h3 class="text-xl font-bold text-neutral-900 mb-2">Welcome! Let's get you set up</h3>
    <p class="text-neutral-600">Follow these steps to get the most out of your account</p>
  </div>

  <!-- Checklist -->
  <div class="space-y-4">
    <div class="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
        ✓
      </div>
      <div class="flex-1">
        <h4 class="font-semibold text-neutral-900">Create your account</h4>
        <p class="text-sm text-neutral-600">Completed</p>
      </div>
    </div>

    <button class="flex items-start gap-4 p-4 border-2 border-brand-primary bg-brand-primary/5 rounded-lg hover:bg-brand-primary/10 transition-colors w-full text-left">
      <div class="w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
        2
      </div>
      <div class="flex-1">
        <h4 class="font-semibold text-neutral-900">Complete your profile</h4>
        <p class="text-sm text-neutral-600">Add your name and profile photo</p>
      </div>
      <svg class="w-5 h-5 text-neutral-400">→</svg>
    </button>

    <div class="flex items-start gap-4 p-4 border border-neutral-200 rounded-lg opacity-60">
      <div class="w-6 h-6 bg-neutral-300 text-white rounded-full flex items-center justify-center flex-shrink-0">
        3
      </div>
      <div class="flex-1">
        <h4 class="font-semibold text-neutral-900">Invite team members</h4>
        <p class="text-sm text-neutral-600">Collaborate with your team</p>
      </div>
    </div>
  </div>
</div>
```

#### No Results Found (Search/Filter)

```html
<!-- Search no results -->
<div class="flex flex-col items-center justify-center p-12 text-center">
  <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-neutral-400">🔍</svg>
  </div>

  <h3 class="text-lg font-semibold text-neutral-900 mb-2">
    No results found for "dark mode toggle"
  </h3>
  <p class="text-neutral-600 mb-6 max-w-md">
    Try adjusting your search or filter to find what you're looking for.
  </p>

  <!-- Suggestions -->
  <div class="space-y-2">
    <p class="text-sm font-medium text-neutral-700">Suggestions:</p>
    <ul class="text-sm text-neutral-600 space-y-1">
      <li>• Check your spelling</li>
      <li>• Try different keywords</li>
      <li>• Remove some filters</li>
    </ul>
  </div>

  <!-- Action -->
  <button class="mt-6 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors">
    Clear all filters
  </button>
</div>

<!-- Filter no results (with reset action) -->
<div class="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
  <svg class="w-12 h-12 text-neutral-400 mx-auto mb-3">📊</svg>
  <h3 class="text-lg font-semibold text-neutral-900 mb-1">
    No items match your filters
  </h3>
  <p class="text-sm text-neutral-600 mb-4">
    Try adjusting your filters to see more results
  </p>
  <button class="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-white transition-colors">
    Reset filters
  </button>
</div>
```

#### Error Recovery Empty States

```html
<!-- Failed to load data -->
<div class="flex flex-col items-center justify-center p-12 text-center">
  <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-red-600">⚠️</svg>
  </div>

  <h3 class="text-lg font-semibold text-neutral-900 mb-2">
    Unable to load projects
  </h3>
  <p class="text-neutral-600 mb-6 max-w-md">
    We couldn't fetch your projects. This might be a temporary network issue.
  </p>

  <!-- Recovery actions -->
  <div class="flex gap-3">
    <button class="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 transition-colors">
      Try again
    </button>
    <button class="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors">
      Contact support
    </button>
  </div>

  <!-- Error details (collapsible) -->
  <details class="mt-6 text-left max-w-md">
    <summary class="text-sm text-neutral-600 cursor-pointer hover:text-neutral-900">
      Technical details
    </summary>
    <pre class="mt-2 p-3 bg-neutral-100 rounded text-xs text-neutral-700 overflow-x-auto">
Error: Network request failed
Status: 503 Service Unavailable
    </pre>
  </details>
</div>

<!-- Permission denied empty state -->
<div class="flex flex-col items-center justify-center p-12 text-center">
  <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-amber-600">🔒</svg>
  </div>

  <h3 class="text-lg font-semibold text-neutral-900 mb-2">
    You don't have access
  </h3>
  <p class="text-neutral-600 mb-6 max-w-md">
    This content is restricted. Contact your administrator to request access.
  </p>

  <button class="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 transition-colors">
    Request access
  </button>
</div>
```

**Accessibility Notes:**
- Use proper heading hierarchy (h2, h3) for empty state titles
- Provide clear, actionable error messages (not technical jargon)
- Ensure illustrations have `alt` text or are decorative (`alt=""` or `aria-hidden="true"`)
- Make action buttons keyboard accessible
- Use appropriate ARIA roles for status messages

---

### Error States

**Problem:** Errors happen, and users need clear feedback about what went wrong and how to fix it.

**Solution:** Provide contextual error messages with clear recovery paths at appropriate levels (inline, banner, page).

#### Inline Form Errors

```html
<!-- Input field with error -->
<div class="space-y-1">
  <label for="email" class="block text-sm font-medium text-neutral-700">
    Email address
  </label>
  <input
    type="email"
    id="email"
    class="w-full px-4 py-2 border-2 border-red-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-100"
    value="invalid-email"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <div class="flex items-start gap-2 text-sm text-red-700" id="email-error" role="alert">
    <svg class="w-5 h-5 flex-shrink-0">⚠️</svg>
    <span>Please enter a valid email address</span>
  </div>
</div>

<!-- Multiple field errors in a form -->
<form class="space-y-6">
  <!-- Error summary at top (for multiple errors) -->
  <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
    <div class="flex items-start gap-3">
      <svg class="w-5 h-5 text-red-500 flex-shrink-0">⚠️</svg>
      <div>
        <h3 class="text-sm font-semibold text-red-800">Please fix the following errors:</h3>
        <ul class="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
          <li><a href="#email" class="underline hover:no-underline">Email address is invalid</a></li>
          <li><a href="#password" class="underline hover:no-underline">Password is too short</a></li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Fields with inline errors -->
  <div class="space-y-1">
    <label for="email" class="block text-sm font-medium text-neutral-700">
      Email
    </label>
    <input
      type="email"
      id="email"
      class="w-full px-4 py-2 border-2 border-red-500 rounded-lg"
      aria-invalid="true"
      aria-describedby="email-error"
    />
    <p class="text-sm text-red-700" id="email-error">
      Please enter a valid email address
    </p>
  </div>

  <div class="space-y-1">
    <label for="password" class="block text-sm font-medium text-neutral-700">
      Password
    </label>
    <input
      type="password"
      id="password"
      class="w-full px-4 py-2 border-2 border-red-500 rounded-lg"
      aria-invalid="true"
      aria-describedby="password-error"
    />
    <p class="text-sm text-red-700" id="password-error">
      Password must be at least 8 characters
    </p>
  </div>

  <button type="submit" class="px-4 py-2 bg-brand-primary text-white rounded-lg">
    Submit
  </button>
</form>

<!-- Field with warning (not error) -->
<div class="space-y-1">
  <label for="username" class="block text-sm font-medium text-neutral-700">
    Username
  </label>
  <input
    type="text"
    id="username"
    class="w-full px-4 py-2 border-2 border-amber-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-amber-100"
    value="john"
  />
  <div class="flex items-start gap-2 text-sm text-amber-700">
    <svg class="w-5 h-5 flex-shrink-0">⚠️</svg>
    <span>This username is very short. Consider adding more characters for better security.</span>
  </div>
</div>
```

#### Toast/Banner Errors (Non-Blocking)

```html
<!-- Toast notification (top-right corner) -->
<div class="fixed top-4 right-4 z-50 max-w-md">
  <div class="bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 flex items-start gap-3" role="alert">
    <div class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
      <svg class="w-5 h-5 text-red-600">✕</svg>
    </div>

    <div class="flex-1">
      <h4 class="font-semibold text-neutral-900">Failed to save changes</h4>
      <p class="text-sm text-neutral-600 mt-1">
        Your changes couldn't be saved. Please try again.
      </p>
    </div>

    <button class="text-neutral-400 hover:text-neutral-600" aria-label="Dismiss">
      <svg class="w-5 h-5">✕</svg>
    </button>
  </div>
</div>

<!-- Banner error (top of page, dismissible) -->
<div class="bg-red-50 border-b border-red-200 px-4 py-3" role="alert">
  <div class="container mx-auto flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <svg class="w-5 h-5 text-red-600 flex-shrink-0">⚠️</svg>
      <div>
        <span class="font-medium text-red-800">Connection lost.</span>
        <span class="text-red-700">Attempting to reconnect...</span>
      </div>
    </div>
    <button class="text-red-600 hover:text-red-800" aria-label="Dismiss">
      <svg class="w-5 h-5">✕</svg>
    </button>
  </div>
</div>

<!-- Persistent banner (non-dismissible) -->
<div class="bg-red-600 text-white px-4 py-3" role="alert">
  <div class="container mx-auto flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <svg class="w-5 h-5 flex-shrink-0">⚠️</svg>
      <span class="font-medium">Your subscription has expired. Upgrade to continue using all features.</span>
    </div>
    <button class="px-4 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors">
      Upgrade now
    </button>
  </div>
</div>

<!-- Toast stack (multiple notifications) -->
<div class="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
  <!-- Error toast -->
  <div class="bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in-right">
    <svg class="w-5 h-5 text-red-600 flex-shrink-0">✕</svg>
    <div class="flex-1">
      <p class="font-medium text-neutral-900">Upload failed</p>
      <p class="text-sm text-neutral-600">document.pdf (2.3 MB)</p>
    </div>
    <button class="text-neutral-400 hover:text-neutral-600">✕</button>
  </div>

  <!-- Warning toast -->
  <div class="bg-white border-l-4 border-amber-500 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in-right">
    <svg class="w-5 h-5 text-amber-600 flex-shrink-0">⚠️</svg>
    <div class="flex-1">
      <p class="font-medium text-neutral-900">Storage almost full</p>
      <p class="text-sm text-neutral-600">You're using 95% of your storage</p>
    </div>
    <button class="text-neutral-400 hover:text-neutral-600">✕</button>
  </div>
</div>
```

#### Full-Page Errors

```html
<!-- 404 Page Not Found -->
<div class="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50">
  <div class="text-center max-w-md">
    <!-- Large error code -->
    <h1 class="text-8xl font-bold text-neutral-300 mb-4">404</h1>

    <!-- Message -->
    <h2 class="text-2xl font-bold text-neutral-900 mb-2">
      Page not found
    </h2>
    <p class="text-neutral-600 mb-8">
      The page you're looking for doesn't exist or has been moved.
    </p>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <a href="/" class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
        Go to homepage
      </a>
      <button class="px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-white transition-colors">
        Go back
      </button>
    </div>

    <!-- Help links -->
    <div class="mt-8 pt-8 border-t border-neutral-200">
      <p class="text-sm text-neutral-600 mb-3">Looking for something else?</p>
      <div class="flex flex-wrap gap-4 justify-center text-sm">
        <a href="/docs" class="text-brand-primary hover:underline">Documentation</a>
        <a href="/support" class="text-brand-primary hover:underline">Support</a>
        <a href="/contact" class="text-brand-primary hover:underline">Contact us</a>
      </div>
    </div>
  </div>
</div>

<!-- 500 Server Error -->
<div class="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50">
  <div class="text-center max-w-md">
    <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10 text-red-600">⚠️</svg>
    </div>

    <h1 class="text-2xl font-bold text-neutral-900 mb-2">
      Something went wrong
    </h1>
    <p class="text-neutral-600 mb-8">
      We're sorry, but something went wrong on our end. Our team has been notified and we're working on it.
    </p>

    <div class="flex flex-col gap-3">
      <button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
        Try again
      </button>
      <a href="/" class="px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-white transition-colors">
        Go to homepage
      </a>
    </div>

    <p class="mt-6 text-sm text-neutral-500">
      Error ID: <code class="px-2 py-1 bg-neutral-200 rounded">550e8400-e29b-41d4</code>
    </p>
  </div>
</div>

<!-- Network Error / Offline -->
<div class="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50">
  <div class="text-center max-w-md">
    <div class="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10 text-neutral-500">📡</svg>
    </div>

    <h1 class="text-2xl font-bold text-neutral-900 mb-2">
      No internet connection
    </h1>
    <p class="text-neutral-600 mb-8">
      Please check your network connection and try again.
    </p>

    <button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
      Try again
    </button>

    <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
      <h3 class="font-semibold text-blue-900 mb-2">Troubleshooting tips:</h3>
      <ul class="text-sm text-blue-800 space-y-1">
        <li>• Check your Wi-Fi or mobile data connection</li>
        <li>• Try refreshing the page</li>
        <li>• Restart your router if the problem persists</li>
      </ul>
    </div>
  </div>
</div>
```

**Accessibility Notes:**
- Use `role="alert"` for error messages that need immediate attention
- Use `aria-invalid="true"` on form fields with errors
- Link error messages to fields with `aria-describedby`
- Provide error summaries at the top of forms for screen reader users
- Ensure sufficient color contrast for error text (4.5:1 minimum)
- Don't rely on color alone - use icons and text

---

### Success States

**Problem:** Users need confirmation that their actions completed successfully.

**Solution:** Provide clear, celebratory feedback for successful actions.

#### Success Confirmations

```html
<!-- Inline success message -->
<div class="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 flex items-start gap-3">
  <div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
    <svg class="w-5 h-5 text-green-600">✓</svg>
  </div>

  <div class="flex-1">
    <h4 class="font-semibold text-green-900">Changes saved successfully</h4>
    <p class="text-sm text-green-700 mt-1">
      Your profile has been updated.
    </p>
  </div>
</div>

<!-- Success toast notification -->
<div class="fixed top-4 right-4 z-50 max-w-md">
  <div class="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in-right">
    <div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
      <svg class="w-5 h-5 text-green-600">✓</svg>
    </div>

    <div class="flex-1">
      <h4 class="font-semibold text-neutral-900">File uploaded</h4>
      <p class="text-sm text-neutral-600 mt-1">
        document.pdf was uploaded successfully
      </p>
    </div>

    <button class="text-neutral-400 hover:text-neutral-600" aria-label="Dismiss">
      <svg class="w-5 h-5">✕</svg>
    </button>
  </div>
</div>

<!-- Success banner -->
<div class="bg-green-600 text-white px-4 py-3" role="alert">
  <div class="container mx-auto flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <svg class="w-5 h-5 flex-shrink-0">✓</svg>
      <span class="font-medium">Your payment was successful! Check your email for the receipt.</span>
    </div>
    <button class="text-white/80 hover:text-white" aria-label="Dismiss">
      <svg class="w-5 h-5">✕</svg>
    </button>
  </div>
</div>

<!-- Success dialog (modal) -->
<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg max-w-md w-full p-6 text-center">
    <!-- Animated checkmark -->
    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8 text-green-600 animate-scale-in">✓</svg>
    </div>

    <h3 class="text-xl font-bold text-neutral-900 mb-2">
      Account created!
    </h3>
    <p class="text-neutral-600 mb-6">
      Welcome aboard! Your account has been successfully created and you're ready to get started.
    </p>

    <button class="w-full px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
      Continue to dashboard
    </button>
  </div>
</div>
```

#### Celebration Moments (First-Time Achievements)

```html
<!-- First achievement unlocked -->
<div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
  <div class="bg-white rounded-lg max-w-md w-full p-8 text-center relative overflow-hidden">
    <!-- Confetti animation background (decorative) -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/4 w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
      <div class="absolute top-0 right-1/4 w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
      <!-- More confetti dots -->
    </div>

    <!-- Trophy icon -->
    <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
      <svg class="w-10 h-10 text-amber-600">🏆</svg>
    </div>

    <h3 class="text-2xl font-bold text-neutral-900 mb-2">
      First project created!
    </h3>
    <p class="text-neutral-600 mb-6">
      Congratulations on creating your first project. You're on your way to great things!
    </p>

    <button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
      Awesome!
    </button>
  </div>
</div>

<!-- Milestone reached -->
<div class="fixed bottom-4 right-4 z-50 max-w-sm">
  <div class="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg shadow-xl p-6 text-white">
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
        <svg class="w-6 h-6">🎉</svg>
      </div>

      <div class="flex-1">
        <h4 class="font-bold text-lg mb-1">Level 10 reached!</h4>
        <p class="text-white/90 text-sm mb-3">
          You've completed 50 tasks. Keep up the great work!
        </p>
        <button class="text-sm underline hover:no-underline">
          View achievements
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Subtle first-time success hint -->
<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
  <svg class="w-5 h-5 text-blue-600 flex-shrink-0">💡</svg>
  <div>
    <h4 class="font-semibold text-blue-900 mb-1">Pro tip</h4>
    <p class="text-sm text-blue-800">
      Now that you've created your first task, try adding tags to organize your work better.
    </p>
  </div>
</div>
```

#### Completion Feedback

```html
<!-- Form submission success -->
<div class="max-w-md mx-auto">
  <div class="bg-white rounded-lg shadow-md p-8 text-center">
    <!-- Animated success icon -->
    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
      <svg class="w-8 h-8 text-green-600">
        <path stroke="currentColor" stroke-width="2" fill="none" d="M5 13 l6 6 L20 5" class="animate-draw-check"/>
      </svg>
    </div>

    <h3 class="text-xl font-bold text-neutral-900 mb-2">
      Thank you for your submission!
    </h3>
    <p class="text-neutral-600 mb-6">
      We've received your application and will review it within 2-3 business days.
    </p>

    <!-- Next steps -->
    <div class="bg-neutral-50 rounded-lg p-4 text-left mb-6">
      <h4 class="font-semibold text-neutral-900 mb-2">What happens next?</h4>
      <ol class="text-sm text-neutral-600 space-y-2">
        <li class="flex gap-2">
          <span class="text-brand-primary font-semibold">1.</span>
          We'll review your application
        </li>
        <li class="flex gap-2">
          <span class="text-brand-primary font-semibold">2.</span>
          You'll receive an email with next steps
        </li>
        <li class="flex gap-2">
          <span class="text-brand-primary font-semibold">3.</span>
          Track your status in the dashboard
        </li>
      </ol>
    </div>

    <div class="flex gap-3">
      <a href="/dashboard" class="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-center hover:bg-blue-600 transition-colors">
        Go to dashboard
      </a>
      <a href="/" class="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-center hover:bg-neutral-50 transition-colors">
        Back to home
      </a>
    </div>
  </div>
</div>

<!-- Multi-step form completion -->
<div class="max-w-2xl mx-auto">
  <div class="bg-white rounded-lg shadow-md p-8">
    <!-- Progress indicator showing completion -->
    <div class="mb-8">
      <div class="flex items-center justify-center gap-2 mb-4">
        <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
          ✓
        </div>
        <div class="w-16 h-1 bg-green-500"></div>
        <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
          ✓
        </div>
        <div class="w-16 h-1 bg-green-500"></div>
        <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
          ✓
        </div>
      </div>
      <p class="text-center text-sm text-neutral-600">All steps completed</p>
    </div>

    <!-- Success message -->
    <div class="text-center">
      <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-green-600">✓</svg>
      </div>

      <h2 class="text-2xl font-bold text-neutral-900 mb-2">
        Setup complete!
      </h2>
      <p class="text-neutral-600 mb-8">
        Your account is fully configured and ready to use.
      </p>

      <button class="px-8 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
        Start using the app
      </button>
    </div>
  </div>
</div>
```

**Accessibility Notes:**
- Use `role="alert"` or `role="status"` for success messages
- Provide text alternatives for visual success indicators
- Ensure auto-dismissing toasts stay visible long enough (minimum 5 seconds)
- Don't auto-dismiss critical success information
- Use semantic colors but don't rely on color alone (include icons/text)

---

