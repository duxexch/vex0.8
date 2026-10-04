# 🔘 World-Class Reusable Button System Specifications

This document outlines the core architecture, states, variants, and pointer interactions of the VEX Deals unified Button System (`/src/components/Button.tsx`).

---

## 📐 Button API & Configurations

The `Button` component accepts the following properties:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'primary' \| 'gold' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive'` | `'primary'` | The physical depth and color style variant. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Centralized padding, height, and typography scale. |
| `isLoading` | `boolean` | `false` | Sets busy state, locks interactions, and injects clean loading spinner. |
| `icon` | `ReactNode` | `undefined` | Interactive React Node icon aligned with label. |
| `iconPosition`| `'start' \| 'end'` | `'start'` | Positions icon left or right relative to children. |
| `spotlight` | `boolean` | `true` | Enables pointer-driven radial spotlight lighting sweep. |
| `tilt` | `boolean` | `false` | Enables subtle 3D rotational tilt on pointer move. |
| `magnetic` | `boolean` | `false` | Enables subtle spring pull towards desktop cursor. |

---

## ⚡ Physical States & Interaction Physics

1. **Hover Lift**: Standard interactive states lift the card or element, transitioning elevation shadows dynamically.
2. **Tactile Press**: Pressing down triggers translateY translation (`translate-y-0.5`) and slight scale reduction (`scale-98`) for instantaneous visual confirmation.
3. **Spotlight Tracking**: Radial gradient highlight sweeps across button borders and background relative to exact client coordinates on composite layer (`will-change: transform`).
4. **Reduced Motion Compatibility**: Respects screen-reader/accessibility guidelines, bypassing pointer math on touch screens or `prefers-reduced-motion: reduce`.
