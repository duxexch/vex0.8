# ♿ VEX Deals - Accessibility & Usability Standards

This document specifies the accessibility compliance rules, ARIA roles, touch targets, and keyboard navigation support implemented in VEX Deals.

---

## ♿ Accessibility Compliance

1. **Contrast Standards (WCAG AA)**: Text elements meet or exceed 4.5:1 contrast against background fields.
2. **Minimum Touch Hitbox**: Every touch button and tab trigger has an interactive area of at least **$44 \times 44\text{px}$** on mobile viewports.
3. **Visible Focus Indicators**: Global `:focus-visible` styling (`outline: 2px solid #059669; outline-offset: 2px;`) ensures full keyboard navigation visibility.
4. **Screen Reader Semantics**:
   - `role="navigation"` and `role="tablist"` on top and bottom navigation bars.
   - `aria-label` / `aria-selected` attributes on interactive tabs and icon-only buttons.
   - `aria-busy="true"` on skeleton loading containers during network requests.
5. **Reduced Motion**: Animations utilize compositor-only CSS transforms (`opacity`, `transform`) and respect user `prefers-reduced-motion` settings.
