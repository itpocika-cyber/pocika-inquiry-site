# POCIKA Design System

This document outlines the visual language and component architecture for the POCIKA Inquiry Management System.

## 1. Design Philosophy
The POCIKA design is **professional, corporate, clean, and trustworthy**. It prioritizes data density on desktop (for admins) while remaining highly accessible and easy to tap on mobile (for salespersons on the field). The aesthetic leans towards a premium, Apple-like minimalism with subtle glassmorphism and clear visual hierarchy.

## 2. Color System
All colors are defined as CSS custom properties in `:root`.

**Primary Brand:**
- Primary Navy: `#0B1F33` (`--color-primary-navy`)
- Primary Blue: `#2563EB` (`--color-primary`)
- Primary Hover: `#1D4ED8` (`--color-primary-hover`)

**Backgrounds:**
- App Background: `#F5F7FA` (`--color-background`)
- Card/Surface: `#FFFFFF` (`--color-surface`)

**Text:**
- Primary Text: `#111827` (`--color-text`)
- Muted Text: `#6B7280` (`--color-text-muted`)

**Status & Semantic (Opportunities):**
- HOT (Danger): `#DC2626` bg, `#FEF2F2` tint
- WARM (Warning): `#D97706` bg, `#FFFBEB` tint
- COLD (Info): `#3B82F6` bg, `#EFF6FF` tint
- FUTURE POTENTIAL (Purple): `#7C3AED` bg, `#F5F3FF` tint
- DEALER DEVELOPMENT (Teal): `#0D9488` bg, `#F0FDFA` tint
- NO REQUIREMENT (Gray): `#6B7280` bg, `#F3F4F6` tint
- SUCCESS: `#16A34A` (`--color-success`)

**Borders:**
- Standard Border: `#E5E7EB` (`--color-border`)

## 3. Typography
- **Font Family:** System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`).
- **Headings:** Bold (`600-700` weight), tight tracking (`-0.01em` to `-0.02em`).
- **Body:** Base `1rem` (16px), regular weight (`400`).
- **Helper text:** `0.875rem` (14px), color `--color-text-muted`.

## 4. Spacing & Grid
- **Spacing:** Based on Bootstrap's utility classes (rem-based).
- **Grid:** Standard 12-column Bootstrap grid.
- **Max Width:** App containers typically capped at `1440px` for readability, or `100%` on mobile.

## 5. Breakpoints
- **Mobile:** `< 768px` (Stacks grids, collapses sidebar to offcanvas, converts tables to cards).
- **Tablet:** `768px - 991px`
- **Desktop:** `>= 992px` (Expands sidebar, uses dense tables).

## 6. Components

### Buttons (`.btn-pocika`)
- **Primary:** Solid blue background, white text, subtle hover lift.
- **Secondary:** White background, gray border, gray text.
- **Ghost:** Transparent background, blue text, subtle blue background on hover.
- **Height:** Standardized to `44px` minimum for mobile tap accessibility.

### Inputs & Selects (`.form-control-pocika`)
- White background, 1px solid border (`#E5E7EB`), soft radius (`8px`).
- Focus state: Blue ring box-shadow (`rgba(37, 99, 235, 0.25)`).

### Chips (`.chip-option`)
- Used for radio buttons and checkboxes that require easy mobile selection.
- Unselected: Light gray border, white background.
- Selected: Blue border, light blue tinted background, checkmark icon (for multiple) or bold text (for single).

### Cards (`.card-pocika`)
- White background, soft subtle shadow (`0 4px 6px -1px rgba(0,0,0,0.05)`).
- Border radius: `12px` or `16px`.

### Badges (`.badge-pocika`)
- Pill-shaped (`border-radius: 9999px`), bold text, transparent tinted background with solid colored text.

### Photo Uploader (`.photo-upload`)
- Dashed border dropzone, centered icon.
- Thumbnails: Square aspect ratio with absolute positioned remove button.

### Tables (`.admin-table`)
- Used on desktop for data density.
- Flush borders, muted headers (`text-transform: uppercase`, `font-size: 0.75rem`).
- Hover states on rows.

### Empty States
- Centered content, muted icon, clear call to action button.

## 7. Accessibility Rules
- Form labels must always be visibly associated with inputs.
- Required fields are denoted by a visible red asterisk (`*`).
- Semantic HTML (e.g., `<nav>`, `<main>`, `<header>`).
- Buttons must have `type="button"` unless they submit a form.
- Color contrast ratios must exceed WCAG AA standards (e.g., dark text on light backgrounds for badges).

## 8. Responsive Rules
- **Tables -> Cards:** Any data table must switch to a stacked card layout (`.admin-mobile-cards`) on viewports `< 992px`.
- **Navigation:** Top header on mobile with hamburger icon. Desktop utilizes fixed sidebars (`.admin-sidebar`).
- **Tap Targets:** All interactive elements must have a minimum size of `44x44px` on mobile.
