---
name: ux-interactive-behaviors
description: Interactive behavior patterns including microinteractions, animations, hover effects, focus states, and form UX. Use when adding interactivity, transitions, form validation patterns, or enhancing user feedback through motion.
---

### Microinteractions

**Problem:** Users need visual feedback for interactive elements to understand affordances and state changes.

**Solution:** Subtle animations and state changes that provide feedback and delight.

#### Hover States

```html
<!-- Button hover states -->
<button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
  Primary Button
</button>

<button class="px-6 py-3 border-2 border-brand-primary text-brand-primary rounded-lg font-semibold hover:bg-brand-primary hover:text-white transition-all duration-200">
  Secondary Button
</button>

<button class="px-6 py-3 text-neutral-700 hover:text-brand-primary hover:bg-neutral-100 rounded-lg transition-colors duration-200">
  Ghost Button
</button>

<!-- Card hover state (lift effect) -->
<div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer">
  <img src="/image.jpg" alt="" class="w-full h-48 object-cover" />
  <div class="p-6">
    <h3 class="text-xl font-semibold text-neutral-900">Card Title</h3>
    <p class="text-neutral-600">Card description</p>
  </div>
</div>

<!-- Link hover with underline animation -->
<a href="#" class="relative text-brand-primary after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-brand-primary after:transition-all after:duration-300 hover:after:w-full">
  Animated link
</a>

<!-- Icon button hover -->
<button class="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors group">
  <svg class="w-5 h-5 text-neutral-600 group-hover:text-brand-primary group-hover:scale-110 transition-all">
    ⋮
  </svg>
</button>

<!-- Image hover overlay -->
<div class="relative overflow-hidden rounded-lg group cursor-pointer">
  <img src="/image.jpg" alt="" class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110" />

  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
    <span class="text-white font-semibold opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
      View Details
    </span>
  </div>
</div>
```

#### Focus States (Keyboard Navigation)

```html
<!-- Button focus state -->
<button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold focus:outline-none focus:ring-4 focus:ring-brand-primary/30 focus:ring-offset-2 transition-all">
  Accessible Button
</button>

<!-- Input focus state -->
<input
  type="text"
  class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
  placeholder="Enter text..."
/>

<!-- Card focus state (for keyboard navigation) -->
<a
  href="/details"
  class="block bg-white rounded-lg shadow-md overflow-hidden focus:outline-none focus:ring-4 focus:ring-brand-primary/30 focus:ring-offset-2 transition-all"
>
  <div class="p-6">
    <h3 class="text-xl font-semibold">Focusable Card</h3>
  </div>
</a>

<!-- Custom checkbox focus -->
<label class="flex items-center gap-3 cursor-pointer group">
  <input
    type="checkbox"
    class="w-5 h-5 text-brand-primary rounded border-neutral-300 focus:ring-4 focus:ring-brand-primary/20 transition-all"
  />
  <span class="text-neutral-700 group-focus-within:text-brand-primary">
    Checkbox label
  </span>
</label>

<!-- Navigation link focus -->
<a
  href="/page"
  class="block px-4 py-2 text-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary focus:bg-brand-primary/10 transition-all"
>
  Navigation Link
</a>
```

#### Active States (Button Press)

```html
<!-- Button active state (pressed) -->
<button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 active:bg-blue-700 active:scale-95 transition-all duration-100">
  Click Me
</button>

<!-- Toggle button active state -->
<button class="px-4 py-2 border-2 border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/10 active:bg-brand-primary active:text-white transition-all data-[active=true]:bg-brand-primary data-[active=true]:text-white">
  Filter Option
</button>

<!-- Icon button active state -->
<button class="w-10 h-10 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 active:scale-90 transition-all flex items-center justify-center">
  <svg class="w-5 h-5">⭐</svg>
</button>

<!-- Ripple effect (CSS-only) -->
<style>
.ripple {
  position: relative;
  overflow: hidden;
}

.ripple::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
  opacity: 0;
  transform: scale(0);
  transition: transform 0.5s, opacity 0.5s;
}

.ripple:active::after {
  transform: scale(2);
  opacity: 1;
  transition: 0s;
}
</style>

<button class="ripple px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold">
  Ripple Button
</button>
```

#### Transition Patterns

```html
<!-- Fade in/out -->
<div class="opacity-0 animate-fade-in">
  Content that fades in
</div>

<style>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}
</style>

<!-- Slide in from right -->
<div class="translate-x-full animate-slide-in-right">
  Notification
</div>

<style>
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out forwards;
}
</style>

<!-- Scale in -->
<div class="scale-0 animate-scale-in">
  Modal content
</div>

<style>
@keyframes scale-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out forwards;
}
</style>

<!-- Accordion expand/collapse -->
<div class="overflow-hidden transition-all duration-300" style="max-height: 0" data-expanded="false">
  <!-- When data-expanded="true", set style="max-height: 500px" or use JS to calculate -->
  <div class="p-4">
    Hidden content that expands
  </div>
</div>

<!-- Smooth height transition -->
<div class="grid transition-all duration-300 data-[collapsed=false]:grid-rows-[1fr] data-[collapsed=true]:grid-rows-[0fr]">
  <div class="overflow-hidden">
    <div class="p-4">
      Content with smooth height transition
    </div>
  </div>
</div>

<!-- Loading state transition -->
<button class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold relative overflow-hidden group">
  <span class="group-data-[loading=true]:opacity-0 transition-opacity">
    Submit
  </span>

  <!-- Loading spinner (hidden by default) -->
  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-data-[loading=true]:opacity-100 transition-opacity">
    <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  </div>
</button>
```

**Accessibility Notes:**
- Provide focus indicators with 3:1 contrast minimum
- Use `:focus-visible` to show focus only for keyboard users
- Don't remove focus outlines without providing alternatives
- Respect `prefers-reduced-motion` for users who need less animation
- Ensure interactive elements have minimum 44x44px touch targets
- Use `transition-all` sparingly (prefer specific properties for performance)

```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### Form UX Patterns

**Problem:** Forms are often frustrating due to unclear requirements, late error feedback, and poor recovery.

**Solution:** Progressive validation, helpful hints, and clear error recovery paths.

#### Inline Validation (Real-Time Feedback)

```html
<!-- Email validation (validate on blur) -->
<div class="space-y-1">
  <label for="email" class="block text-sm font-medium text-neutral-700">
    Email address
  </label>

  <div class="relative">
    <input
      type="email"
      id="email"
      class="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20 data-[valid=true]:border-green-500 data-[valid=false]:border-red-500 transition-all"
      placeholder="you@example.com"
    />

    <!-- Success icon (shown when valid) -->
    <div class="absolute right-3 top-1/2 -translate-y-1/2 hidden data-[valid=true]:block text-green-500">
      <svg class="w-5 h-5">✓</svg>
    </div>

    <!-- Error icon (shown when invalid) -->
    <div class="absolute right-3 top-1/2 -translate-y-1/2 hidden data-[valid=false]:block text-red-500">
      <svg class="w-5 h-5">✕</svg>
    </div>
  </div>

  <!-- Error message (shown when invalid) -->
  <p class="text-sm text-red-700 hidden data-[valid=false]:block">
    Please enter a valid email address
  </p>

  <!-- Success message (shown when valid) -->
  <p class="text-sm text-green-700 hidden data-[valid=true]:block">
    Email is available
  </p>
</div>

<!-- Password strength indicator -->
<div class="space-y-1">
  <label for="password" class="block text-sm font-medium text-neutral-700">
    Password
  </label>

  <input
    type="password"
    id="password"
    class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20"
  />

  <!-- Strength meter -->
  <div class="space-y-1">
    <div class="flex gap-1">
      <div class="h-1 flex-1 bg-neutral-200 rounded-full data-[strength=weak]:bg-red-500 data-[strength=medium]:bg-amber-500 data-[strength=strong]:bg-green-500"></div>
      <div class="h-1 flex-1 bg-neutral-200 rounded-full data-[strength=medium]:bg-amber-500 data-[strength=strong]:bg-green-500"></div>
      <div class="h-1 flex-1 bg-neutral-200 rounded-full data-[strength=strong]:bg-green-500"></div>
    </div>

    <p class="text-sm text-neutral-600">
      Password strength: <span class="font-medium data-[strength=weak]:text-red-700 data-[strength=medium]:text-amber-700 data-[strength=strong]:text-green-700">Weak</span>
    </p>
  </div>

  <!-- Requirements checklist -->
  <ul class="text-sm space-y-1">
    <li class="flex items-center gap-2 text-neutral-500 data-[met=true]:text-green-700">
      <svg class="w-4 h-4">○</svg>
      <svg class="w-4 h-4 hidden data-[met=true]:block">✓</svg>
      At least 8 characters
    </li>
    <li class="flex items-center gap-2 text-neutral-500 data-[met=true]:text-green-700">
      <svg class="w-4 h-4">○</svg>
      <svg class="w-4 h-4 hidden data-[met=true]:block">✓</svg>
      Contains a number
    </li>
    <li class="flex items-center gap-2 text-neutral-500 data-[met=true]:text-green-700">
      <svg class="w-4 h-4">○</svg>
      <svg class="w-4 h-4 hidden data-[met=true]:block">✓</svg>
      Contains a special character
    </li>
  </ul>
</div>

<!-- Character counter -->
<div class="space-y-1">
  <label for="bio" class="block text-sm font-medium text-neutral-700">
    Bio
  </label>

  <textarea
    id="bio"
    rows="4"
    maxlength="200"
    class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20 resize-none"
    placeholder="Tell us about yourself..."
  ></textarea>

  <div class="flex items-center justify-between text-sm">
    <p class="text-neutral-500">Maximum 200 characters</p>
    <p class="text-neutral-600">
      <span class="font-medium" data-count="0">0</span> / 200
    </p>
  </div>
</div>
```

#### Field Hints and Help Text

```html
<!-- Field with helper text -->
<div class="space-y-1">
  <label for="username" class="block text-sm font-medium text-neutral-700">
    Username
  </label>

  <input
    type="text"
    id="username"
    class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20"
    aria-describedby="username-help"
  />

  <p id="username-help" class="text-sm text-neutral-500">
    Choose a unique username. Letters, numbers, and underscores only.
  </p>
</div>

<!-- Field with tooltip help -->
<div class="space-y-1">
  <div class="flex items-center gap-2">
    <label for="api-key" class="text-sm font-medium text-neutral-700">
      API Key
    </label>

    <!-- Info icon with tooltip -->
    <button
      type="button"
      class="group relative"
      aria-label="API key information"
    >
      <svg class="w-4 h-4 text-neutral-400 hover:text-neutral-600">ⓘ</svg>

      <!-- Tooltip -->
      <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus:opacity-100 group-focus:visible transition-all">
        Your API key is used to authenticate requests. Keep it secret and never share it publicly.
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-neutral-900"></div>
      </div>
    </button>
  </div>

  <input
    type="password"
    id="api-key"
    class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20"
  />
</div>

<!-- Field with inline context -->
<div class="space-y-1">
  <label for="website" class="block text-sm font-medium text-neutral-700">
    Website
  </label>

  <div class="flex items-center border border-neutral-300 rounded-lg focus-within:ring-4 focus-within:ring-brand-primary/20">
    <span class="px-3 text-sm text-neutral-500">https://</span>
    <input
      type="text"
      id="website"
      class="flex-1 px-2 py-2 focus:outline-none"
      placeholder="example.com"
    />
  </div>

  <p class="text-sm text-neutral-500">
    Enter your website URL without https://
  </p>
</div>

<!-- Optional field indicator -->
<div class="space-y-1">
  <div class="flex items-center justify-between">
    <label for="phone" class="text-sm font-medium text-neutral-700">
      Phone number
    </label>
    <span class="text-sm text-neutral-500">Optional</span>
  </div>

  <input
    type="tel"
    id="phone"
    class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20"
  />
</div>
```

#### Error Recovery

```html
<!-- Form with error recovery suggestions -->
<form class="space-y-6">
  <!-- Email field with typo detection -->
  <div class="space-y-1">
    <label for="email" class="block text-sm font-medium text-neutral-700">
      Email address
    </label>

    <input
      type="email"
      id="email"
      class="w-full px-4 py-2 border-2 border-red-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-100"
      value="user@gmial.com"
      aria-invalid="true"
      aria-describedby="email-error"
    />

    <!-- Error with suggestion -->
    <div class="flex items-start gap-2 text-sm text-red-700" id="email-error">
      <svg class="w-5 h-5 flex-shrink-0">⚠️</svg>
      <div>
        <p>Did you mean <button type="button" class="font-semibold underline hover:no-underline">user@gmail.com</button>?</p>
      </div>
    </div>
  </div>

  <!-- Password field with show/hide toggle -->
  <div class="space-y-1">
    <label for="password" class="block text-sm font-medium text-neutral-700">
      Password
    </label>

    <div class="relative">
      <input
        type="password"
        id="password"
        class="w-full px-4 py-2 pr-10 border border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20"
      />

      <!-- Show/hide toggle -->
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        aria-label="Toggle password visibility"
      >
        <svg class="w-5 h-5">👁</svg>
      </button>
    </div>

    <div class="flex items-center justify-between text-sm">
      <button type="button" class="text-brand-primary hover:underline">
        Forgot password?
      </button>
    </div>
  </div>

  <button type="submit" class="w-full px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
    Sign in
  </button>
</form>
```

#### Progress Indicators (Multi-Step Forms)

```html
<!-- Step indicator -->
<div class="max-w-3xl mx-auto">
  <!-- Progress bar -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium text-neutral-700">Step 2 of 4</span>
      <span class="text-sm text-neutral-600">50% complete</span>
    </div>

    <div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
      <div class="h-full bg-brand-primary rounded-full transition-all duration-300" style="width: 50%"></div>
    </div>
  </div>

  <!-- Step labels -->
  <div class="flex items-center justify-between mb-8">
    <!-- Completed step -->
    <div class="flex flex-col items-center gap-2">
      <div class="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-semibold">
        ✓
      </div>
      <span class="text-xs text-neutral-600">Account</span>
    </div>

    <!-- Current step -->
    <div class="flex-1 h-0.5 bg-brand-primary mx-2"></div>
    <div class="flex flex-col items-center gap-2">
      <div class="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-semibold ring-4 ring-brand-primary/20">
        2
      </div>
      <span class="text-xs text-neutral-900 font-medium">Profile</span>
    </div>

    <!-- Future steps -->
    <div class="flex-1 h-0.5 bg-neutral-200 mx-2"></div>
    <div class="flex flex-col items-center gap-2">
      <div class="w-10 h-10 bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center font-semibold">
        3
      </div>
      <span class="text-xs text-neutral-500">Settings</span>
    </div>

    <div class="flex-1 h-0.5 bg-neutral-200 mx-2"></div>
    <div class="flex flex-col items-center gap-2">
      <div class="w-10 h-10 bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center font-semibold">
        4
      </div>
      <span class="text-xs text-neutral-500">Review</span>
    </div>
  </div>

  <!-- Form content -->
  <div class="bg-white rounded-lg shadow-md p-8">
    <h2 class="text-2xl font-bold text-neutral-900 mb-2">Complete your profile</h2>
    <p class="text-neutral-600 mb-6">Tell us a bit about yourself</p>

    <!-- Form fields -->
    <div class="space-y-4">
      <!-- Fields here -->
    </div>

    <!-- Navigation buttons -->
    <div class="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200">
      <button type="button" class="px-4 py-2 text-neutral-700 hover:text-neutral-900">
        ← Back
      </button>

      <button type="submit" class="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
        Continue
      </button>
    </div>
  </div>
</div>
```

**Accessibility Notes:**
- Use `aria-invalid="true"` on fields with errors
- Link error messages to fields with `aria-describedby`
- Use `aria-live="polite"` for dynamic error messages
- Provide clear labels for all form fields (`<label>` elements)
- Group related fields with `<fieldset>` and `<legend>`
- Ensure form can be completed using only keyboard
- Don't disable submit button - show validation errors instead
- Use appropriate input types (`email`, `tel`, `url`, etc.) for better mobile experience

---

