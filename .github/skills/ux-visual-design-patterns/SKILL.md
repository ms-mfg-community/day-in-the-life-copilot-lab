---
name: ux-visual-design-patterns
description: Visual design patterns including hierarchy, cards, lists, grids, tables, and navigation systems. Use when designing layouts, content structures, dashboard interfaces, or navigation systems.
---

## Visual Design Patterns

### Visual Hierarchy

**Problem:** Elements compete for attention, unclear importance, users miss critical information.

**Solution:** Use size, color, spacing, and position to create clear visual hierarchy.

#### Size Hierarchy

```html
<!-- Primary content (most important) -->
<h1 class="text-4xl font-bold mb-4">
  Primary Heading
</h1>

<!-- Secondary content (supporting) -->
<h2 class="text-2xl font-semibold mb-3 text-neutral-700">
  Secondary Heading
</h2>

<!-- Tertiary content (details) -->
<p class="text-base text-neutral-600 mb-2">
  Body text with normal emphasis
</p>

<!-- Metadata (least important) -->
<span class="text-sm text-neutral-500">
  Posted 2 hours ago
</span>
```

#### Color Hierarchy

```html
<!-- High emphasis: Strong contrast, bold colors -->
<div class="bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold">
  Primary Call to Action
</div>

<!-- Medium emphasis: Neutral tones, subtle contrast -->
<div class="bg-neutral-100 text-neutral-900 px-6 py-3 rounded-lg">
  Secondary Action
</div>

<!-- Low emphasis: Muted colors, ghost buttons -->
<button class="text-neutral-600 hover:text-neutral-900 px-4 py-2">
  Tertiary Action
</button>

<!-- Status hierarchy using semantic colors -->
<div class="space-y-2">
  <div class="text-red-700 font-semibold">Critical: Requires immediate attention</div>
  <div class="text-amber-700">Warning: Review before proceeding</div>
  <div class="text-neutral-700">Info: Additional context</div>
</div>
```

#### Spacing Hierarchy (Proximity)

```html
<!-- Related items grouped tightly -->
<div class="space-y-1">
  <h3 class="text-lg font-semibold">John Smith</h3>
  <p class="text-sm text-neutral-600">Senior Developer</p>
  <p class="text-sm text-neutral-500">john@example.com</p>
</div>

<!-- Sections separated with larger gaps -->
<div class="space-y-8">
  <section class="space-y-2">
    <h2 class="text-2xl font-bold">Personal Info</h2>
    <div class="space-y-1">
      <!-- Related fields close together -->
      <p>Name: John Smith</p>
      <p>Email: john@example.com</p>
    </div>
  </section>

  <section class="space-y-2">
    <h2 class="text-2xl font-bold">Work Info</h2>
    <div class="space-y-1">
      <p>Title: Senior Developer</p>
      <p>Department: Engineering</p>
    </div>
  </section>
</div>
```

#### Position & Z-Index Hierarchy

```html
<!-- Layering: overlays above content -->
<div class="relative">
  <!-- Base content -->
  <div class="bg-white p-6">
    Main content
  </div>

  <!-- Floating badge (higher z-index) -->
  <div class="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
    New
  </div>

  <!-- Dropdown overlay (even higher) -->
  <div class="absolute top-full mt-2 z-20 bg-white shadow-lg rounded-lg border">
    Dropdown menu
  </div>
</div>

<!-- Modal overlay (highest priority) -->
<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
  <div class="bg-white rounded-lg p-6 max-w-md">
    Modal content
  </div>
</div>
```

**Accessibility Notes:**
- Visual hierarchy must be reflected in semantic HTML (use proper heading levels h1-h6)
- Don't rely solely on color to convey importance (use size, weight, spacing too)
- Ensure focus order matches visual hierarchy
- Screen readers should encounter content in logical order regardless of visual position

---

### Card Patterns

**Problem:** Need to present discrete chunks of information in scannable, actionable formats.

**Solution:** Cards provide visual containers that group related content with clear boundaries.

#### Content Cards

```html
<!-- Basic content card -->
<article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
  <!-- Image -->
  <img
    src="/image.jpg"
    alt="Card image description"
    class="w-full h-48 object-cover"
  />

  <!-- Content -->
  <div class="p-6 space-y-3">
    <!-- Category/tag -->
    <span class="text-sm font-medium text-brand-primary">Technology</span>

    <!-- Title -->
    <h3 class="text-xl font-semibold text-neutral-900">
      Card Title Goes Here
    </h3>

    <!-- Description -->
    <p class="text-neutral-600 leading-relaxed">
      Brief description of the card content. Keep it concise and scannable.
    </p>

    <!-- Metadata -->
    <div class="flex items-center gap-4 text-sm text-neutral-500">
      <span>5 min read</span>
      <span>•</span>
      <time datetime="2024-01-15">Jan 15, 2024</time>
    </div>
  </div>
</article>
```

#### Action Cards (Clickable)

```html
<!-- Entire card is clickable -->
<a
  href="/details"
  class="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all focus:outline-none focus:ring-4 focus:ring-brand-primary/20"
>
  <div class="p-6 space-y-3">
    <!-- Icon -->
    <div class="w-12 h-12 bg-brand-primary/10 rounded-lg flex items-center justify-center">
      <svg class="w-6 h-6 text-brand-primary">...</svg>
    </div>

    <h3 class="text-lg font-semibold text-neutral-900">
      Action Card Title
    </h3>

    <p class="text-neutral-600">
      Click anywhere on this card to navigate
    </p>

    <!-- Arrow indicator -->
    <div class="flex items-center text-brand-primary font-medium">
      Learn more
      <svg class="w-4 h-4 ml-1">→</svg>
    </div>
  </div>
</a>
```

#### Stat Cards (Metrics Display)

```html
<!-- Dashboard stat card -->
<div class="bg-white rounded-lg shadow-md p-6 space-y-2">
  <!-- Label -->
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-neutral-600">Total Revenue</span>
    <!-- Optional icon/menu -->
    <button class="text-neutral-400 hover:text-neutral-600">
      <svg class="w-5 h-5">⋮</svg>
    </button>
  </div>

  <!-- Value -->
  <div class="text-3xl font-bold text-neutral-900">
    $45,231
  </div>

  <!-- Change indicator -->
  <div class="flex items-center gap-1 text-sm">
    <svg class="w-4 h-4 text-green-600">↑</svg>
    <span class="text-green-600 font-medium">+12.5%</span>
    <span class="text-neutral-500">from last month</span>
  </div>
</div>

<!-- Grid of stat cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="text-sm text-neutral-600 mb-2">Active Users</div>
    <div class="text-2xl font-bold">2,543</div>
  </div>

  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="text-sm text-neutral-600 mb-2">Conversion Rate</div>
    <div class="text-2xl font-bold">3.24%</div>
  </div>

  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="text-sm text-neutral-600 mb-2">Avg. Session</div>
    <div class="text-2xl font-bold">4m 32s</div>
  </div>

  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="text-sm text-neutral-600 mb-2">Bounce Rate</div>
    <div class="text-2xl font-bold">42.1%</div>
  </div>
</div>
```

#### Card Grid Layouts

```html
<!-- Responsive card grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div class="bg-white rounded-lg shadow-md p-6">Card 1</div>
  <div class="bg-white rounded-lg shadow-md p-6">Card 2</div>
  <div class="bg-white rounded-lg shadow-md p-6">Card 3</div>
  <div class="bg-white rounded-lg shadow-md p-6">Card 4</div>
  <div class="bg-white rounded-lg shadow-md p-6">Card 5</div>
  <div class="bg-white rounded-lg shadow-md p-6">Card 6</div>
</div>

<!-- Masonry-style card layout (CSS Grid) -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 [grid-auto-rows:minmax(0,auto)]">
  <div class="bg-white rounded-lg shadow-md p-6">
    Short content card
  </div>
  <div class="bg-white rounded-lg shadow-md p-6 row-span-2">
    Tall card with more content that spans two rows visually
  </div>
  <div class="bg-white rounded-lg shadow-md p-6">
    Another short card
  </div>
</div>
```

**Accessibility Notes:**
- Cards should have clear boundaries (shadows, borders)
- Clickable cards must have `:focus` states with visible outline
- Use semantic elements: `<article>` for content cards, `<a>` for navigation
- Ensure card headings are properly nested in document outline
- Don't nest interactive elements (no buttons inside clickable cards)

---

### List Patterns

**Problem:** Need to display collections of items in structured, scannable formats.

**Solution:** Lists organize data with consistent formatting and clear item separation.

#### Data Lists (Read-Only Information)

```html
<!-- Simple data list -->
<dl class="divide-y divide-neutral-200">
  <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt class="text-sm font-medium text-neutral-600">Full Name</dt>
    <dd class="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2">John Smith</dd>
  </div>

  <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt class="text-sm font-medium text-neutral-600">Email</dt>
    <dd class="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2">john@example.com</dd>
  </div>

  <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt class="text-sm font-medium text-neutral-600">Role</dt>
    <dd class="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2">
      <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
        Admin
      </span>
    </dd>
  </div>
</dl>

<!-- Key-value list (horizontal) -->
<div class="bg-neutral-50 rounded-lg p-4 space-y-2">
  <div class="flex justify-between">
    <span class="text-sm text-neutral-600">Status</span>
    <span class="text-sm font-medium text-neutral-900">Active</span>
  </div>
  <div class="flex justify-between">
    <span class="text-sm text-neutral-600">Last Login</span>
    <span class="text-sm font-medium text-neutral-900">2 hours ago</span>
  </div>
  <div class="flex justify-between">
    <span class="text-sm text-neutral-600">Location</span>
    <span class="text-sm font-medium text-neutral-900">San Francisco, CA</span>
  </div>
</div>
```

#### Action Lists (Clickable Items)

```html
<!-- List with clickable items -->
<ul class="divide-y divide-neutral-200 border border-neutral-200 rounded-lg overflow-hidden">
  <li>
    <a
      href="/item/1"
      class="block px-4 py-3 hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Icon -->
          <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600">📄</svg>
          </div>

          <!-- Content -->
          <div>
            <div class="text-sm font-medium text-neutral-900">Document Title</div>
            <div class="text-xs text-neutral-500">Updated 2 hours ago</div>
          </div>
        </div>

        <!-- Arrow indicator -->
        <svg class="w-5 h-5 text-neutral-400">→</svg>
      </div>
    </a>
  </li>

  <li>
    <a href="/item/2" class="block px-4 py-3 hover:bg-neutral-50 transition-colors">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600">✓</svg>
          </div>
          <div>
            <div class="text-sm font-medium text-neutral-900">Completed Task</div>
            <div class="text-xs text-neutral-500">Finished yesterday</div>
          </div>
        </div>
        <svg class="w-5 h-5 text-neutral-400">→</svg>
      </div>
    </a>
  </li>

  <li>
    <a href="/item/3" class="block px-4 py-3 hover:bg-neutral-50 transition-colors">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-600">⚠</svg>
          </div>
          <div>
            <div class="text-sm font-medium text-neutral-900">Pending Review</div>
            <div class="text-xs text-neutral-500">Awaiting approval</div>
          </div>
        </div>
        <svg class="w-5 h-5 text-neutral-400">→</svg>
      </div>
    </a>
  </li>
</ul>
```

#### Navigation Lists (Menus, Sidebars)

```html
<!-- Sidebar navigation list -->
<nav class="space-y-1">
  <!-- Active item -->
  <a
    href="/dashboard"
    class="flex items-center gap-3 px-4 py-2 bg-brand-primary text-white rounded-lg font-medium"
    aria-current="page"
  >
    <svg class="w-5 h-5">📊</svg>
    Dashboard
  </a>

  <!-- Regular items -->
  <a
    href="/projects"
    class="flex items-center gap-3 px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
  >
    <svg class="w-5 h-5">📁</svg>
    Projects
  </a>

  <a
    href="/team"
    class="flex items-center gap-3 px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
  >
    <svg class="w-5 h-5">👥</svg>
    Team
  </a>

  <!-- Divider -->
  <hr class="my-4 border-neutral-200" />

  <!-- Section with nested items -->
  <div class="space-y-1">
    <button
      class="flex items-center justify-between w-full px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
      aria-expanded="false"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5">⚙️</svg>
        Settings
      </div>
      <svg class="w-4 h-4">▼</svg>
    </button>

    <!-- Nested items (hidden by default) -->
    <div class="pl-8 space-y-1">
      <a href="/settings/profile" class="block px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg">
        Profile
      </a>
      <a href="/settings/security" class="block px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg">
        Security
      </a>
    </div>
  </div>
</nav>
```

**Accessibility Notes:**
- Use semantic list elements (`<ul>`, `<ol>`, `<dl>`)
- Ensure keyboard navigation works (Tab through items, Enter to activate)
- Use `aria-current="page"` for active navigation items
- Provide `:focus-visible` styles for keyboard users
- Ensure sufficient color contrast for all text (4.5:1 minimum)

---

### Grid & Layout Patterns

**Problem:** Content needs organized, responsive layouts that adapt to different screen sizes.

**Solution:** Grid and flexbox patterns provide flexible, maintainable layouts.

#### Dashboard Layout (Sidebar + Main)

```html
<!-- Two-column dashboard -->
<div class="min-h-screen bg-neutral-50">
  <!-- Sidebar (fixed on desktop, toggle on mobile) -->
  <aside class="
    fixed lg:sticky top-0 left-0 z-40
    w-64 h-screen
    bg-white border-r border-neutral-200
    overflow-y-auto
    -translate-x-full lg:translate-x-0
    transition-transform
  ">
    <div class="p-4 space-y-6">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <img src="/logo.svg" alt="App Logo" class="w-8 h-8" />
        <span class="font-semibold text-lg">App Name</span>
      </div>

      <!-- Navigation -->
      <nav class="space-y-1">
        <a href="/" class="block px-4 py-2 bg-brand-primary text-white rounded-lg">
          Dashboard
        </a>
        <a href="/projects" class="block px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg">
          Projects
        </a>
        <!-- More nav items -->
      </nav>
    </div>
  </aside>

  <!-- Main content area -->
  <main class="lg:ml-64 p-6 space-y-6">
    <!-- Page header -->
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900">Dashboard</h1>
        <p class="text-neutral-600">Welcome back!</p>
      </div>

      <!-- Actions -->
      <button class="px-4 py-2 bg-brand-primary text-white rounded-lg">
        New Project
      </button>
    </header>

    <!-- Dashboard content (stat cards, charts, etc.) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Stat cards here -->
    </div>
  </main>
</div>
```

#### Content Grid (Blog Posts, Products)

```html
<!-- Responsive content grid -->
<div class="container mx-auto px-4 py-8">
  <!-- Grid with auto-fit (automatically adjusts columns) -->
  <div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
    <!-- Items -->
    <article class="bg-white rounded-lg shadow-md overflow-hidden">
      <img src="/post1.jpg" alt="" class="w-full h-48 object-cover" />
      <div class="p-6">
        <h3 class="text-xl font-semibold mb-2">Post Title</h3>
        <p class="text-neutral-600">Post excerpt...</p>
      </div>
    </article>

    <article class="bg-white rounded-lg shadow-md overflow-hidden">
      <img src="/post2.jpg" alt="" class="w-full h-48 object-cover" />
      <div class="p-6">
        <h3 class="text-xl font-semibold mb-2">Another Post</h3>
        <p class="text-neutral-600">Post excerpt...</p>
      </div>
    </article>

    <!-- More articles -->
  </div>
</div>

<!-- Explicit breakpoint grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <!-- Products, images, etc. -->
</div>
```

#### Masonry Layout (Pinterest-Style)

```html
<!-- CSS-based masonry using columns -->
<div class="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
  <div class="break-inside-avoid">
    <div class="bg-white rounded-lg shadow-md p-6">
      <img src="/img1.jpg" alt="" class="w-full rounded mb-4" />
      <h3 class="font-semibold mb-2">Short Card</h3>
      <p class="text-neutral-600">Content here</p>
    </div>
  </div>

  <div class="break-inside-avoid">
    <div class="bg-white rounded-lg shadow-md p-6">
      <img src="/img2.jpg" alt="" class="w-full rounded mb-4" />
      <h3 class="font-semibold mb-2">Tall Card</h3>
      <p class="text-neutral-600">
        This card has more content and will be taller, creating a
        masonry effect where cards fit into available vertical space.
      </p>
    </div>
  </div>

  <!-- More items -->
</div>
```

#### Holy Grail Layout (Header + Sidebar + Main + Footer)

```html
<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-neutral-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div class="font-semibold text-lg">App Name</div>
      <nav class="flex gap-6">
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </div>
  </header>

  <!-- Main content area with sidebar -->
  <div class="flex-1 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-neutral-50 border-r border-neutral-200 p-6">
      <nav class="space-y-2">
        <a href="#" class="block px-4 py-2 rounded">Link 1</a>
        <a href="#" class="block px-4 py-2 rounded">Link 2</a>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-6">
      <h1 class="text-3xl font-bold mb-4">Page Title</h1>
      <div class="prose max-w-none">
        <!-- Content here -->
      </div>
    </main>
  </div>

  <!-- Footer -->
  <footer class="bg-neutral-100 border-t border-neutral-200 px-6 py-4">
    <div class="text-center text-sm text-neutral-600">
      © 2024 Company Name. All rights reserved.
    </div>
  </footer>
</div>
```

**Accessibility Notes:**
- Use semantic elements (`<main>`, `<aside>`, `<header>`, `<footer>`)
- Ensure layouts work with zoom up to 200%
- Maintain readable line lengths (use `max-w-prose` for text content)
- Test keyboard navigation through layouts
- Ensure focus order matches visual layout

---

### Navigation Patterns

**Problem:** Users need clear, consistent ways to move through the application.

**Solution:** Well-designed navigation patterns provide orientation and easy access to key areas.

#### Sidebar Navigation

```html
<!-- Collapsible sidebar -->
<div class="flex">
  <!-- Sidebar -->
  <aside class="
    w-64
    bg-white border-r border-neutral-200
    transition-all
    data-[collapsed=true]:w-16
  ">
    <div class="p-4 space-y-2">
      <!-- Collapse toggle -->
      <button class="w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-100 rounded-lg">
        <span class="data-[collapsed=true]:hidden">Menu</span>
        <svg class="w-5 h-5">☰</svg>
      </button>

      <!-- Navigation items -->
      <nav class="space-y-1">
        <a href="/" class="flex items-center gap-3 px-4 py-2 bg-brand-primary text-white rounded-lg">
          <svg class="w-5 h-5 flex-shrink-0">🏠</svg>
          <span class="data-[collapsed=true]:hidden">Home</span>
        </a>

        <a href="/projects" class="flex items-center gap-3 px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg">
          <svg class="w-5 h-5 flex-shrink-0">📁</svg>
          <span class="data-[collapsed=true]:hidden">Projects</span>
        </a>

        <a href="/settings" class="flex items-center gap-3 px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg">
          <svg class="w-5 h-5 flex-shrink-0">⚙️</svg>
          <span class="data-[collapsed=true]:hidden">Settings</span>
        </a>
      </nav>
    </div>
  </aside>

  <!-- Main content -->
  <main class="flex-1 p-6">
    Content area
  </main>
</div>
```

#### Header Navigation

```html
<!-- Horizontal header nav -->
<header class="bg-white border-b border-neutral-200">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" class="w-8 h-8" />
        <span class="font-semibold text-lg">Brand</span>
      </a>

      <!-- Desktop navigation -->
      <nav class="hidden md:flex gap-6">
        <a href="/" class="text-brand-primary font-medium border-b-2 border-brand-primary pb-1">
          Home
        </a>
        <a href="/features" class="text-neutral-700 hover:text-neutral-900 pb-1">
          Features
        </a>
        <a href="/pricing" class="text-neutral-700 hover:text-neutral-900 pb-1">
          Pricing
        </a>
        <a href="/about" class="text-neutral-700 hover:text-neutral-900 pb-1">
          About
        </a>
      </nav>

      <!-- Actions -->
      <div class="hidden md:flex items-center gap-3">
        <button class="px-4 py-2 text-neutral-700 hover:text-neutral-900">
          Sign In
        </button>
        <button class="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600">
          Sign Up
        </button>
      </div>

      <!-- Mobile menu toggle -->
      <button class="md:hidden p-2">
        <svg class="w-6 h-6">☰</svg>
      </button>
    </div>

    <!-- Mobile menu (hidden by default) -->
    <nav class="md:hidden py-4 space-y-2 hidden">
      <a href="/" class="block px-4 py-2 bg-brand-primary/10 text-brand-primary rounded">
        Home
      </a>
      <a href="/features" class="block px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
        Features
      </a>
      <a href="/pricing" class="block px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
        Pricing
      </a>
      <a href="/about" class="block px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
        About
      </a>
    </nav>
  </div>
</header>
```

#### Breadcrumbs

```html
<!-- Breadcrumb navigation -->
<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm">
  <ol class="flex items-center gap-2">
    <li>
      <a href="/" class="text-brand-primary hover:underline">
        Home
      </a>
    </li>

    <li class="text-neutral-400">/</li>

    <li>
      <a href="/products" class="text-brand-primary hover:underline">
        Products
      </a>
    </li>

    <li class="text-neutral-400">/</li>

    <li>
      <a href="/products/electronics" class="text-brand-primary hover:underline">
        Electronics
      </a>
    </li>

    <li class="text-neutral-400">/</li>

    <li class="text-neutral-700" aria-current="page">
      Laptop
    </li>
  </ol>
</nav>

<!-- Breadcrumbs with icons -->
<nav aria-label="Breadcrumb">
  <ol class="flex items-center gap-2 text-sm">
    <li>
      <a href="/" class="flex items-center gap-1 text-brand-primary hover:underline">
        <svg class="w-4 h-4">🏠</svg>
        Home
      </a>
    </li>
    <li><svg class="w-4 h-4 text-neutral-400">›</svg></li>
    <li>
      <a href="/docs" class="text-brand-primary hover:underline">
        Documentation
      </a>
    </li>
    <li><svg class="w-4 h-4 text-neutral-400">›</svg></li>
    <li class="text-neutral-700" aria-current="page">
      Getting Started
    </li>
  </ol>
</nav>
```

#### Tab Navigation

```html
<!-- Tabs for switching content -->
<div class="space-y-4">
  <!-- Tab buttons -->
  <div role="tablist" class="flex gap-1 border-b border-neutral-200">
    <button
      role="tab"
      aria-selected="true"
      aria-controls="panel-overview"
      class="px-4 py-2 border-b-2 border-brand-primary text-brand-primary font-medium"
    >
      Overview
    </button>

    <button
      role="tab"
      aria-selected="false"
      aria-controls="panel-specs"
      class="px-4 py-2 border-b-2 border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300"
    >
      Specifications
    </button>

    <button
      role="tab"
      aria-selected="false"
      aria-controls="panel-reviews"
      class="px-4 py-2 border-b-2 border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300"
    >
      Reviews
    </button>
  </div>

  <!-- Tab panels -->
  <div id="panel-overview" role="tabpanel" class="p-4">
    <h3 class="text-xl font-semibold mb-2">Overview Content</h3>
    <p>Product overview information here</p>
  </div>

  <div id="panel-specs" role="tabpanel" class="hidden p-4">
    <h3 class="text-xl font-semibold mb-2">Specifications</h3>
    <p>Technical specifications here</p>
  </div>

  <div id="panel-reviews" role="tabpanel" class="hidden p-4">
    <h3 class="text-xl font-semibold mb-2">Customer Reviews</h3>
    <p>Reviews content here</p>
  </div>
</div>

<!-- Pill-style tabs -->
<div class="flex gap-2 p-1 bg-neutral-100 rounded-lg inline-flex">
  <button class="px-4 py-2 bg-white text-neutral-900 rounded-md shadow-sm font-medium">
    All
  </button>
  <button class="px-4 py-2 text-neutral-600 hover:text-neutral-900">
    Active
  </button>
  <button class="px-4 py-2 text-neutral-600 hover:text-neutral-900">
    Completed
  </button>
  <button class="px-4 py-2 text-neutral-600 hover:text-neutral-900">
    Archived
  </button>
</div>
```

**Accessibility Notes:**
- Use `aria-current="page"` for current navigation items
- Ensure keyboard navigation works (Tab, Enter, Arrow keys for tabs)
- Provide clear focus indicators for all navigation items
- Use semantic elements: `<nav>`, `<ol>` for breadcrumbs
- For tabs: use ARIA roles (`role="tablist"`, `role="tab"`, `role="tabpanel"`)
- Ensure navigation works with screen readers (test with NVDA/JAWS)

---

