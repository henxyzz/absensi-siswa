# Design Guidelines - Sistem Absensi Sekolah Digital

## Design Approach
**Futuristic Enterprise Dashboard** - Inspired by modern SaaS platforms like Linear, Vercel Dashboard, and Apple's design language, enhanced with glassmorphism and neon accents for a cutting-edge educational technology aesthetic.

## Core Design Principles
1. **Clarity First**: Despite futuristic aesthetics, information hierarchy and usability remain paramount
2. **Professional Enterprise**: Trustworthy, secure appearance befitting school administration
3. **Real-time Visual Feedback**: Immediate UI responses for live tracking and monitoring
4. **Role-Appropriate Complexity**: Interface adapts to user sophistication level

## Typography System

**Font Stack**:
- Primary: Inter (via Google Fonts CDN) - for UI, forms, data
- Accent: Space Grotesk (via Google Fonts CDN) - for headings, hero text

**Hierarchy**:
- Hero/Page Titles: text-4xl to text-5xl, font-bold, tracking-tight
- Section Headers: text-2xl to text-3xl, font-semibold
- Card Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Labels/Metadata: text-sm, font-medium
- Captions: text-xs, text-gray-400

## Layout System

**Spacing Primitives**: Tailwind units of 4, 6, 8, 12, 16
- Component padding: p-6, p-8
- Section gaps: gap-4, gap-6, gap-8
- Card margins: space-y-6, space-y-8
- Grid spacing: gap-6

**Grid Structure**:
- Dashboard: 12-column grid with sidebar (64px to 256px collapsible)
- Content area: max-w-7xl with px-6 to px-8
- Cards: 2-4 column grids (responsive: grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Forms: Single column max-w-2xl for optimal readability

## Glassmorphism Implementation

**Glass Cards** (primary UI container):
```
Background: bg-white/5 (dark mode) or bg-black/5 (light mode)
Backdrop: backdrop-blur-xl
Border: border border-white/10
Shadow: shadow-2xl with colored glow
Padding: p-6 to p-8
Radius: rounded-xl to rounded-2xl
```

**Elevated Glass** (modals, dropdowns):
```
Background: bg-white/10
Backdrop: backdrop-blur-2xl
Border: border-white/20
Additional outer glow for depth
```

## Neon Accent System

**Glow Colors** (use sparingly for emphasis):
- Primary Action: cyan-500 with cyan-500/50 glow
- Success States: emerald-500 with emerald-500/50 glow
- Warning: amber-500 with amber-500/50 glow
- Critical/Live: rose-500 with rose-500/50 glow

**Glow Implementation**:
- Buttons: shadow-lg shadow-cyan-500/50
- Status indicators: ring-4 ring-emerald-500/30
- Live badges: animate-pulse with colored shadow
- Icons: drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]

## Component Library

### Navigation
**Sidebar** (primary navigation):
- Collapsible glass sidebar (w-64 collapsed to w-16)
- Icon-first design with text labels
- Active state: glass background + neon accent border-l-2
- Grouped by role permissions

**Top Bar**:
- Fixed glass header with backdrop-blur
- User avatar + role badge + notifications
- Quick actions (real-time status, GPS toggle)
- Search with glassmorphic dropdown

### Dashboard Components
**Stat Cards**:
- Glass container with large numbers (text-3xl font-bold)
- Icon with neon glow in corner
- Micro sparkline charts
- Trend indicators with colored arrows

**Real-time Status Cards**:
- Animated pulse border for active tracking
- Live timestamp updates
- GPS coordinates display
- Status badges with colored glows

**Data Tables**:
- Glass table with striped rows (bg-white/5)
- Sticky headers with backdrop-blur
- Row hover: subtle glow effect
- Action buttons with icon-only design

**Maps (GPS Tracking)**:
- Full-width map container
- Glass overlay controls
- Pulsing markers with student photos
- Radius visualization with neon ring

### Forms & Inputs
**Input Fields**:
- Glass background with subtle border
- Focus state: neon border glow + ring
- Labels: floating or top-aligned
- Error state: red glow + shake animation
- Success: green checkmark with glow

**Buttons**:
- Primary: gradient with neon glow shadow
- Secondary: glass with border
- Ghost: transparent with hover glow
- Icon buttons: circular glass containers
- Sizes: px-4 py-2 (sm), px-6 py-3 (default), px-8 py-4 (lg)

**Photo Upload**:
- Dashed border glass container
- Preview with glassmorphic overlay
- Drag-and-drop with animated feedback
- Circular crop preview for profile photos

### Modals & Overlays
**Modal Structure**:
- Backdrop: bg-black/60 with backdrop-blur-sm
- Container: glass card centered, max-w-2xl
- Header with close button (neon on hover)
- Footer with action buttons

**Smart Guide System**:
- Floating hologram button (bottom-right, glass with cyan glow)
- Tooltip overlays: glass with arrow pointer
- Highlight targets: animated neon ring
- Step counter: glass badge with progress

**Notifications**:
- Toast: glass slide-in from top-right
- Icon with colored glow by type
- Auto-dismiss with progress bar
- WhatsApp notification badge with green pulse

### Special Features
**Onboarding Guide**:
- Full-screen overlay with spotlight effect
- Glass instruction cards with arrows
- Skip/Next buttons with neon accent
- Progress dots at bottom

**Speech Assistant Toggle**:
- Floating button with waveform animation when speaking
- Language selector: glass dropdown
- Mute state: red glow indicator

**Database Management Panel**:
- Code-style input for URI (monospace font)
- Connection status: live indicator with glow
- Backup/Restore: progress bars with neon accent
- Test button: animated success/failure states

## Accessibility
- Maintain WCAG AA contrast despite dark theme
- Focus indicators: 2px neon ring
- Screen reader labels for all interactive elements
- Keyboard navigation: visible focus states
- Form validation: both visual and text feedback

## Animations (Minimal & Purposeful)
- Page transitions: fade + subtle slide (duration-200)
- Card hover: scale-[1.02] + enhanced glow
- Real-time updates: gentle pulse animation
- Loading states: skeleton screens with glass shimmer
- GPS tracking: smooth marker movement (ease-in-out)

## Images
**Profile Photos**:
- Circular avatars with glass ring borders
- Sizes: 32px (xs), 40px (sm), 64px (md), 128px (lg)
- Hover: subtle scale + glow effect
- Fallback: gradient background with initials

**Dashboard Illustrations**:
- Use subtle, futuristic line-art illustrations for empty states
- Monochromatic with neon accent highlights
- Small decorative icons throughout (Heroicons via CDN)

**No large hero images** - this is a dashboard application focused on data and functionality.