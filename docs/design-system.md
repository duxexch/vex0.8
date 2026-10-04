# 🎨 VEX Deals - Design System Architecture & Tokens

This document details the core design system tokens, typography scales, color palettes, elevation rules, and component primitives across the VEX Deals web application.

---

## 📐 Token System

### 1. Color Palette & Semantic Assignment
Defined as CSS custom variables in `src/index.css`:
- **Canvas / Background**: `--color-bg-light` (`#f8fafc` - Slate 50)
- **Primary Accent**: `--color-primary` (`#059669` - Emerald 600)
- **Primary Hover**: `--color-primary-hover` (`#047857` - Emerald 700)
- **Secondary Accent**: `--color-accent` (`#f59e0b` - Amber 500)
- **Text Main**: `--color-text-main` (`#0f172a` - Slate 900)
- **Text Muted**: `--color-text-muted` (`#64748b` - Slate 500)
- **Hairline Borders**: `--color-border-light` (`rgba(226, 232, 240, 0.9)`)

### 2. Typographic Scale
- **Display Headings**: `Tajawal` (Arabic) / `Plus Jakarta Sans` (Latin), weight 800/900.
- **Body Prose**: `Tajawal` (400/500/700) with line-height 1.5–1.7.
- **Data & Telemetry**: Monospace tabular figures (`tabular-nums font-mono`) for wallet balances, transaction amounts, odds, and IDs.

### 3. Surface Radii & Depth
- **Compact Badges / Tags**: `rounded-md` (`8px`) / `rounded-lg` (`12px`)
- **Interactive Buttons / Inputs**: `rounded-xl` (`12px`) to `rounded-2xl` (`16px`)
- **Containers & Modals**: `rounded-2xl` (`16px`) to `rounded-3xl` (`24px`)
- **Elevation**: Flat single-elevation cards with soft hairline borders (`border border-slate-200/90 shadow-xs`) rather than stacked drop shadows.

---

## 🧱 Component Primitives

1. **`SkeletonShimmer`**: Shimmer wave animation (`.animate-shimmer`) for async data fetching.
2. **`Toast`**: Toast notifications with check icons and status announcements (`role="status"`).
3. **`PullToRefresh`**: Touch pull-to-refresh container with tactile haptic feedback (`triggerHaptic`).
4. **`Header`**: Sticky top app bar following the 3-zone contract with mobile category icon rail.
5. **`BottomNav`**: Fixed bottom navigation bar for mobile thumb reach with 44px+ touch targets.
