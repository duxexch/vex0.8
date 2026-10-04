# 📐 VEX Deals - UI & Interaction Guidelines

This guide establishes the interaction guidelines, button hierarchies, form behavior, empty states, and feedback loops across VEX Deals.

---

## 🔘 Button & Control Hierarchy

| Variant | Styling | Usage |
| :--- | :--- | :--- |
| **Primary Action** | `bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs active:scale-95` | Main task CTA per screen (e.g. "طلب تعويض الخسارة", "تحويل الرصيد") |
| **Secondary Action** | `bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200` | Secondary contextual actions (e.g. "استعراض باقي الشركاء", "نسخ الكود") |
| **Destructive** | `bg-rose-600 text-white hover:bg-rose-700` | Destructive operations requiring confirmation modal |
| **Gold Special** | `bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black` | High-value lottery mega draw triggers |

---

## ⚡ Interaction & Feedback Rules

1. **Tactile Haptics**: Key interactive buttons trigger `triggerHaptic('light' | 'medium' | 'success')` on mobile devices.
2. **Press Scale**: Active state incorporates subtle scale contraction (`active:scale-95` or `active:scale-90`) settling in $< 150\text{ms}$.
3. **Focus States**: Visible focus ring (`focus-visible:ring-2 focus-visible:ring-emerald-500`) on all interactive controls.
4. **Loading States**: Async actions display inline spinners or skeleton loaders with disabled click handlers.
