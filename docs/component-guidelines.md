# 🧩 VEX Deals - Component Architecture & Guidelines

This document provides developer guidelines for building and maintaining reusable components in the VEX Deals codebase.

---

## 📂 Core Component Directory

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| **Header** | `src/components/Header.tsx` | Top app bar, brand mark, language dropdown, notifications bell, settings trigger, desktop nav & mobile icon rail. |
| **BottomNav** | `src/components/BottomNav.tsx` | Fixed bottom mobile tab bar with active state indicators and notification badges. |
| **CompaniesTab** | `src/components/CompaniesTab.tsx` | Partner companies directory, promo codes, brand cards, search & category filters. |
| **WalletTab** | `src/components/WalletTab.tsx` | Balance summary card, frozen/available balance counters, unfreeze triggers, QR code modal. |
| **AiSportsHubTab** | `src/components/AiSportsHubTab.tsx` | Sports match fixtures, odds shift alerts, news feeds, and Gemini AI analysis triggers. |
| **SkeletonLoader** | `src/components/SkeletonLoader.tsx` | Shimmer loading placeholders (`CompaniesTabSkeleton`, `WalletTabSkeleton`, `ActivityTabSkeleton`). |
| **PullToRefresh** | `src/components/PullToRefresh.tsx` | Touch pull-down refresh wrapper with haptic feedback. |
| **Toast** | `src/components/Toast.tsx` | Floating status toast notifications. |

---

## 📐 Component Conventions

1. **Strict TypeScript Types**: Every component receives typed interfaces imported from `src/types.ts`.
2. **Prop Defaults**: Mandatory default props provided for optional arrays or state parameters.
3. **Language Context**: Components consume `lang: Language` prop and localized string helpers (`TRANSLATIONS[lang]`).
