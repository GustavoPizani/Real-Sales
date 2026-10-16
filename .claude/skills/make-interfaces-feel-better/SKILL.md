---
name: make-interfaces-feel-better
description: Apply when building or reviewing UI — for micro-interaction polish, animations, typography, and visual details that make interfaces feel professional and modern.
---

# Details that make interfaces feel better

Great interfaces rarely come from a collection of small details that compound into a great experience. Apply these principles when building or reviewing UI code.

## Quick Reference

| Category | When to Use |
| --- | --- |
| Typography | Text wrapping, font smoothing, tabular numbers |
| Surfaces | Border radius, optical alignment, shadows, image outlines, hit areas |
| Animations | Interruptible animations, enter/exit transitions, icon animations, scale on press |
| Performance | Transition specificity, `will-change` usage |

## Core Principles

### 1. Concentric Border Radius
"Outer radius = inner radius + padding." Mismatched radii on nested elements commonly makes interfaces feel off.

### 2. Optical Over Geometric Alignment
When geometric centering looks wrong, align optically. Buttons with icons, play triangles, and asymmetric icons all need manual adjustment.

### 3. Shadows Over Borders
Layer multiple transparent `box-shadow` values for natural depth. Shadows adapt to any background; solid borders don't.

### 4. Interruptible Animations
Use CSS transitions for interactive state changes — they can be interrupted mid-animation. Reserve keyframes for staged sequences.

### 5. Split and Stagger Enter Animations
"Don't animate a single container. Break content into semantic chunks and stagger each with ~100ms delay."

### 6. Subtle Exit Animations
Use a small fixed `translateY` instead of full height. Exits should be softer than enters.

### 7. Contextual Icon Animations
Animate icons with `opacity`, `scale`, and `blur`. Use scale from `0.25` to `1`, opacity from `0` to `1`, blur from `4px` to `0px`.

### 8. Font Smoothing
"Apply `-webkit-font-smoothing: antialiased` to the root layout on macOS for crisper text."

### 9. Tabular Numbers
"Use `font-variant-numeric: tabular-nums` for any dynamically updating numbers to prevent layout shift."

### 10. Text Wrapping
Use `text-wrap: balance` on headings and `text-wrap: pretty` for body text to avoid orphans.

### 11. Image Outlines
Add a subtle `1px` outline with low opacity to images for consistent depth.

### 12. Scale on Press
"A subtle `scale(0.96)` on click gives buttons tactile feedback. Always use `0.96`." Never use values smaller than `0.95`.

### 13. Skip Animation on Page Load
Use `initial={false}` on `AnimatePresence` to prevent enter animations on first render.

### 14. Never Use `transition: all`
"Always specify exact properties: `transition-property: scale, opacity`."

### 15. Use `will-change` Sparingly
Only for `transform`, `opacity`, `filter`. Never use `will-change: all`. Only add when noticing first-frame stutter.

### 16. Minimum Hit Area
"Interactive elements need at least 40×40px hit area." Extend with pseudo-elements if the visible element is smaller.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Same border radius on parent and child | Calculate concentric radii |
| Icons look off-center | Adjust optically with padding |
| Hard borders between sections | Use layered box-shadow |
| Jarring animations | Split, stagger, keep exits subtle |
| Numbers shift layout | Apply tabular-nums |
| Heavy text on macOS | Apply antialiased to root |
| Animation on page load | Add initial={false} |
| transition: all usage | Specify exact properties |
| Animation stutter | Add will-change: transform |
| Tiny hit areas | Extend to 40×40px |

## Review Checklist

- Nested rounded elements use concentric border radius
- Icons are optically centered
- Shadows used instead of borders
- Enter animations are split and staggered
- Exit animations are subtle
- Dynamic numbers use tabular-nums
- Font smoothing applied
- Headings use text-wrap: balance
- Images have subtle outlines
- Buttons use scale on press
- AnimatePresence uses initial={false}
- No transition: all — only specific properties
- will-change only on transform/opacity/filter
- Interactive elements have 40×40px minimum hit area
