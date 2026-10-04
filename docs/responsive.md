# 📱 VEX Deals - Responsive & Mobile UX Guidelines

This guide details the mobile-first viewport design, thumb-zone ergonomics, safe areas, and desktop grid scaling across screen sizes from 320px to ultrawide displays.

---

## 📱 Viewport Breakpoints & Layout Adapters

| Viewport Width | Device Target | Layout Strategy |
| :--- | :--- | :--- |
| **320px – 390px** | Small Smartphones | Compact single-column card feeds, bottom nav bar, mobile icon rail header. |
| **390px – 640px** | Standard Mobile | Full-width mobile layout, bottom navigation, pull-to-refresh container. |
| **640px – 1024px** | Tablets / Foldables | 2-column card grids, horizontal tabs, adaptive modals. |
| **1024px – 1440px+** | Laptops & Desktops | Max-width 7xl container (`1280px`), top header navigation bar, multi-column dashboard. |

---

## 🖐️ Thumb-Zone Ergonomics & Safe Areas

1. **Natural Thumb Reach (Bottom 40%)**: Key navigation destinations are anchored in the fixed bottom navigation bar (`BottomNav.tsx`).
2. **Safe Area Insets**: Elements respect mobile notch and gesture bar safe areas via `.safe-area-top` and `.safe-area-bottom` (`padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px)`).
3. **15% Mobile Sticky Cap**: Combined height of fixed top bar and bottom nav does not exceed 15% of vertical viewport height, leaving 85%+ open for scrolling.
