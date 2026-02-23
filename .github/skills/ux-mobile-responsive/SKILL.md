---
name: ux-mobile-responsive
description: Mobile and responsive UX patterns including touch targets, mobile navigation, gestures, breakpoints, and adaptive layouts. Use when optimizing for mobile devices, implementing responsive design, or handling touch interactions.
---

## Mobile & Responsive UX

### Touch Target Sizing

**Problem:** Small touch targets lead to misclicks, frustration, and poor mobile experience. Desktop-optimized interfaces fail on touch devices.

**Solution:** Follow mobile-first design principles with adequate touch target sizes (minimum 44x44px per Apple HIG and 48x48dp per Material Design), proper spacing between targets, and thumb-zone optimization.

#### Minimum Touch Target (44x44px)

```html
<!-- Mobile-optimized button with adequate touch area -->
<button class="min-w-[44px] min-h-[44px] px-6 py-3 bg-brand-primary text-white rounded-lg font-medium touch-manipulation active:scale-95 transition-transform">
  Save Changes
</button>

<!-- Icon button with proper touch target -->
<button class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-neutral-100 active:bg-neutral-200 touch-manipulation" aria-label="Close">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>

<!-- Toggle switch with large touch area -->
<label class="inline-flex items-center cursor-pointer">
  <input type="checkbox" class="sr-only peer" />
  <div class="relative w-14 h-8 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-primary"></div>
  <span class="ml-3 text-sm font-medium text-neutral-900">Enable notifications</span>
</label>
```

#### Touch Target Spacing

```html
<!-- Adequate spacing between touch targets (minimum 8px gap) -->
<div class="flex gap-3">
  <button class="min-w-[44px] min-h-[44px] px-4 py-2 border border-neutral-300 rounded-lg touch-manipulation">
    Cancel
  </button>
  <button class="min-w-[44px] min-h-[44px] px-4 py-2 bg-brand-primary text-white rounded-lg touch-manipulation">
    Confirm
  </button>
</div>

<!-- Action list with proper spacing -->
<nav class="space-y-2">
  <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 rounded-lg active:bg-neutral-100 touch-manipulation">
    <svg class="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
    <span class="text-base">Home</span>
  </a>
  <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 rounded-lg active:bg-neutral-100 touch-manipulation">
    <svg class="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <span class="text-base">Search</span>
  </a>
  <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 rounded-lg active:bg-neutral-100 touch-manipulation">
    <svg class="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
    <span class="text-base">Profile</span>
  </a>
</nav>
```

#### Thumb Zone Optimization

```html
<!-- Bottom-aligned actions for easy thumb reach -->
<div class="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 safe-area-inset-bottom">
  <div class="max-w-md mx-auto space-y-3">
    <!-- Primary action in easy-to-reach zone -->
    <button class="w-full min-h-[44px] py-3 bg-brand-primary text-white rounded-lg font-medium touch-manipulation">
      Continue
    </button>
    <!-- Secondary action below primary -->
    <button class="w-full min-h-[44px] py-3 border border-neutral-300 rounded-lg font-medium touch-manipulation">
      Go Back
    </button>
  </div>
</div>

<!-- Tab bar in thumb-friendly zone (bottom) -->
<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 safe-area-inset-bottom">
  <div class="flex justify-around">
    <button class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] touch-manipulation active:bg-neutral-50">
      <svg class="w-6 h-6 text-brand-primary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <span class="text-xs font-medium text-brand-primary">Home</span>
    </button>
    <button class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] touch-manipulation active:bg-neutral-50">
      <svg class="w-6 h-6 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span class="text-xs text-neutral-600">Search</span>
    </button>
    <button class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] touch-manipulation active:bg-neutral-50">
      <svg class="w-6 h-6 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <span class="text-xs text-neutral-600">Alerts</span>
    </button>
    <button class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] touch-manipulation active:bg-neutral-50">
      <svg class="w-6 h-6 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span class="text-xs text-neutral-600">Profile</span>
    </button>
  </div>
</nav>
```

**Accessibility Notes:**
- Use `touch-manipulation` CSS to disable double-tap zoom on interactive elements
- Minimum 44x44px touch targets per Apple HIG, 48x48dp per Material Design
- Maintain 8px minimum spacing between adjacent touch targets
- Optimize for one-handed use with bottom-aligned primary actions
- Provide visual feedback for touch interactions (`:active` states)
- Support both left-handed and right-handed users
- Consider thumb reach zones (easy, stretch, hard-to-reach areas)
- Use `safe-area-inset-bottom` for devices with notches/home indicators
- Test on real devices with different hand sizes
- Avoid placing critical actions in hard-to-reach corners

---

### Gesture Patterns

**Problem:** Mobile users expect gesture-based interactions (swipe, pinch, pull-to-refresh). Mouse-only interfaces feel unnatural on touch devices.

**Solution:** Implement common mobile gestures with clear visual affordances, appropriate feedback, and fallback mechanisms for users who don't discover gestures.

#### Swipe Patterns

```html
<!-- Swipeable list item (e.g., email inbox, messages) -->
<div class="relative overflow-hidden bg-white border-b border-neutral-200">
  <!-- Background actions (revealed on swipe) -->
  <div class="absolute inset-y-0 right-0 flex">
    <button class="flex items-center justify-center w-20 bg-amber-500 text-white touch-manipulation" aria-label="Archive">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    </button>
    <button class="flex items-center justify-center w-20 bg-red-500 text-white touch-manipulation" aria-label="Delete">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>

  <!-- Swipeable content -->
  <div class="relative bg-white px-4 py-3 touch-pan-y" data-swipeable>
    <div class="flex items-start gap-3">
      <img src="avatar.jpg" alt="User avatar" class="w-10 h-10 rounded-full" />
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-neutral-900 truncate">John Smith</h3>
        <p class="text-sm text-neutral-600 line-clamp-2">Hey, did you get a chance to review the latest design mockups?</p>
        <p class="text-xs text-neutral-500 mt-1">2 hours ago</p>
      </div>
    </div>
    <!-- Visual hint for swipe (optional) -->
    <div class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </div>
  </div>
</div>

<!-- Swipeable card carousel -->
<div class="relative overflow-hidden">
  <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x" data-carousel>
    <div class="flex-none w-80 snap-center">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-semibold mb-2">Card 1</h3>
        <p class="text-neutral-600">Swipe horizontally to see more cards.</p>
      </div>
    </div>
    <div class="flex-none w-80 snap-center">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-semibold mb-2">Card 2</h3>
        <p class="text-neutral-600">Smooth scrolling with snap points.</p>
      </div>
    </div>
    <div class="flex-none w-80 snap-center">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-semibold mb-2">Card 3</h3>
        <p class="text-neutral-600">Works great on touch devices.</p>
      </div>
    </div>
  </div>
  <!-- Pagination dots -->
  <div class="flex justify-center gap-2 mt-4">
    <div class="w-2 h-2 rounded-full bg-brand-primary"></div>
    <div class="w-2 h-2 rounded-full bg-neutral-300"></div>
    <div class="w-2 h-2 rounded-full bg-neutral-300"></div>
  </div>
</div>
```

#### Pull-to-Refresh

```html
<!-- Pull-to-refresh container -->
<div class="relative min-h-screen overflow-hidden">
  <!-- Pull-to-refresh indicator -->
  <div class="absolute top-0 left-0 right-0 flex justify-center py-4 pointer-events-none" data-refresh-indicator>
    <div class="flex items-center gap-2 text-neutral-600">
      <!-- Loading spinner (shown during refresh) -->
      <svg class="w-5 h-5 animate-spin hidden" data-spinner fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <!-- Pull arrow (shown before release) -->
      <svg class="w-5 h-5 transition-transform" data-arrow fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      <span class="text-sm font-medium" data-refresh-text>Pull to refresh</span>
    </div>
  </div>

  <!-- Scrollable content -->
  <div class="overflow-y-auto touch-pan-y" data-refresh-content>
    <div class="p-4 space-y-4">
      <!-- Content items -->
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-medium mb-2">Content Item 1</h3>
        <p class="text-sm text-neutral-600">Pull down from the top to refresh the content.</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-medium mb-2">Content Item 2</h3>
        <p class="text-sm text-neutral-600">Release when you see "Release to refresh".</p>
      </div>
    </div>
  </div>
</div>
```

#### Long Press

```html
<!-- Long-press context menu -->
<div class="grid grid-cols-2 gap-4 p-4">
  <button class="relative group bg-white rounded-xl shadow-md p-6 touch-manipulation" data-long-press>
    <img src="thumbnail.jpg" alt="Item thumbnail" class="w-full aspect-square object-cover rounded-lg mb-3" />
    <h3 class="font-medium text-sm truncate">Item Name</h3>
    <p class="text-xs text-neutral-500">Long press for options</p>

    <!-- Context menu (shown on long press) -->
    <div class="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 invisible group-[.active]:opacity-100 group-[.active]:visible transition-all" data-context-menu>
      <div class="flex flex-col gap-2 w-full px-4">
        <button class="w-full py-3 bg-brand-primary text-white rounded-lg font-medium">
          Open
        </button>
        <button class="w-full py-3 bg-neutral-100 rounded-lg font-medium">
          Share
        </button>
        <button class="w-full py-3 bg-neutral-100 rounded-lg font-medium">
          Edit
        </button>
        <button class="w-full py-3 bg-red-500 text-white rounded-lg font-medium">
          Delete
        </button>
        <button class="w-full py-3 border border-neutral-300 rounded-lg font-medium">
          Cancel
        </button>
      </div>
    </div>
  </button>
</div>
```

**Accessibility Notes:**
- Provide visible alternatives to gesture-only interactions (buttons, links)
- Show subtle visual hints for swipeable content (chevrons, fade effects)
- Use haptic feedback (vibration) to confirm gesture recognition
- Implement gesture thresholds (e.g., swipe >50% to trigger action)
- Support both left and right swipe directions where appropriate
- Avoid interfering with browser/OS gestures (back navigation, pull-to-refresh)
- Use CSS `touch-action` to control gesture behavior (`touch-pan-x`, `touch-pan-y`)
- Provide undo for destructive swipe actions
- Show loading state during pull-to-refresh
- Consider users with motor impairments who may trigger gestures unintentionally
- Test gesture sensitivity on various devices and screen sizes

---

### Mobile Navigation Patterns

**Problem:** Desktop navigation (top bars, sidebars) wastes vertical space on mobile and is hard to reach with thumbs.

**Solution:** Use mobile-optimized navigation patterns (bottom tabs, hamburger menus, drawers) that work within thumb reach and maximize content area.

#### Bottom Tab Bar

```html
<!-- Bottom tab navigation (iOS/Android standard) -->
<div class="relative min-h-screen pb-16">
  <!-- Main content area -->
  <main class="p-4">
    <h1 class="text-2xl font-bold mb-4">Home</h1>
    <p class="text-neutral-600">Main content goes here. Bottom navigation stays fixed.</p>
  </main>

  <!-- Fixed bottom tab bar -->
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 safe-area-inset-bottom" role="navigation" aria-label="Main navigation">
    <div class="flex justify-around">
      <!-- Active tab -->
      <a href="#home" class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] text-brand-primary touch-manipulation" aria-current="page">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span class="text-xs font-medium">Home</span>
      </a>

      <!-- Inactive tabs -->
      <a href="#search" class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] text-neutral-600 hover:text-neutral-900 touch-manipulation">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span class="text-xs">Search</span>
      </a>

      <a href="#notifications" class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] text-neutral-600 hover:text-neutral-900 touch-manipulation relative">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="text-xs">Alerts</span>
        <!-- Badge for notifications -->
        <span class="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
      </a>

      <a href="#profile" class="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] text-neutral-600 hover:text-neutral-900 touch-manipulation">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span class="text-xs">Profile</span>
      </a>
    </div>
  </nav>
</div>
```

#### Hamburger Menu & Drawer

```html
<!-- Hamburger menu with slide-in drawer -->
<div class="relative min-h-screen">
  <!-- Header with hamburger -->
  <header class="sticky top-0 z-40 bg-white border-b border-neutral-200">
    <div class="flex items-center justify-between px-4 py-3">
      <button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 touch-manipulation" aria-label="Open menu" data-menu-toggle>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 class="text-lg font-semibold">App Title</h1>
      <div class="w-10"></div> <!-- Spacer for centering -->
    </div>
  </header>

  <!-- Overlay (backdrop) -->
  <div class="fixed inset-0 bg-black/50 z-50 opacity-0 invisible transition-all duration-300" data-menu-overlay></div>

  <!-- Slide-in drawer -->
  <nav class="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 transform -translate-x-full transition-transform duration-300 shadow-xl" data-menu-drawer role="navigation" aria-label="Main menu">
    <!-- Drawer header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
      <h2 class="text-lg font-semibold">Menu</h2>
      <button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 touch-manipulation" aria-label="Close menu" data-menu-close>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Drawer content -->
    <div class="overflow-y-auto h-[calc(100vh-64px)]">
      <div class="p-4 space-y-1">
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-primary/10 text-brand-primary font-medium touch-manipulation" aria-current="page">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Home</span>
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-100 text-neutral-700 touch-manipulation">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search</span>
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-100 text-neutral-700 touch-manipulation">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Analytics</span>
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-100 text-neutral-700 touch-manipulation">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Settings</span>
        </a>
      </div>

      <!-- Drawer footer -->
      <div class="p-4 border-t border-neutral-200 mt-4">
        <button class="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-medium touch-manipulation">
          Sign Out
        </button>
      </div>
    </div>
  </nav>

  <!-- Main content -->
  <main class="p-4">
    <h1 class="text-2xl font-bold mb-4">Home</h1>
    <p class="text-neutral-600">Tap the hamburger icon to open the navigation drawer.</p>
  </main>
</div>
```

#### Floating Action Button (FAB)

```html
<!-- Primary floating action button -->
<div class="relative min-h-screen">
  <!-- Main content -->
  <main class="p-4 pb-24">
    <h1 class="text-2xl font-bold mb-4">Your Items</h1>
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-medium">Item 1</h3>
        <p class="text-sm text-neutral-600">Description goes here</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-medium">Item 2</h3>
        <p class="text-sm text-neutral-600">Description goes here</p>
      </div>
    </div>
  </main>

  <!-- Floating action button (bottom-right) -->
  <button class="fixed bottom-6 right-6 w-14 h-14 bg-brand-primary text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center touch-manipulation z-50" aria-label="Add new item">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  </button>
</div>

<!-- Extended FAB with label -->
<button class="fixed bottom-6 right-6 h-14 px-6 bg-brand-primary text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 touch-manipulation z-50">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
  </svg>
  <span class="font-medium">New Item</span>
</button>

<!-- FAB with expandable speed dial -->
<div class="fixed bottom-6 right-6 flex flex-col-reverse items-end gap-3 z-50" data-fab-group>
  <!-- Secondary actions (hidden until FAB clicked) -->
  <button class="w-12 h-12 bg-white text-neutral-700 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center touch-manipulation opacity-0 invisible scale-75" data-fab-action>
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </button>
  <button class="w-12 h-12 bg-white text-neutral-700 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center touch-manipulation opacity-0 invisible scale-75" data-fab-action>
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  </button>
  <button class="w-12 h-12 bg-white text-neutral-700 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center touch-manipulation opacity-0 invisible scale-75" data-fab-action>
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  </button>

  <!-- Primary FAB -->
  <button class="w-14 h-14 bg-brand-primary text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center touch-manipulation" data-fab-primary aria-label="Create new" aria-expanded="false">
    <svg class="w-6 h-6 transition-transform" data-fab-icon fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  </button>
</div>
```

**Accessibility Notes:**
- Place bottom tab bar within thumb reach (fixed at bottom)
- Use clear icons and labels (both visual and text)
- Highlight active tab with color and `aria-current="page"`
- Ensure minimum 44x44px touch targets for all navigation items
- Support keyboard navigation (Tab, Arrow keys, Enter)
- Trap focus within drawer when open, restore when closed
- Provide `aria-label` for icon-only buttons
- Use semantic HTML (`<nav>`, `role="navigation"`)
- Close drawer with Escape key and backdrop click
- Prevent body scroll when drawer is open
- Announce drawer state changes to screen readers
- Show badge count for notifications (with `aria-label`)
- Ensure FAB doesn't obscure important content
- Use `z-index` carefully to avoid conflicts
- Test navigation on devices with safe areas (notches, rounded corners)

---

