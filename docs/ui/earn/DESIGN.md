---
name: Luminous Professional
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6f7881'
  outline-variant: '#bec7d2'
  surface-tint: '#006495'
  primary: '#006191'
  on-primary: '#ffffff'
  primary-container: '#007bb6'
  on-primary-container: '#fcfcff'
  inverse-primary: '#90cdff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#595c5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#727577'
  on-tertiary-container: '#fbfdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbe6ff'
  primary-fixed-dim: '#90cdff'
  on-primary-fixed: '#001e30'
  on-primary-fixed-variant: '#004b71'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1280px
---

## Brand & Style

The design system is anchored in a **Corporate / Modern** aesthetic that prioritizes clarity, reliability, and precision. It is designed for high-utility environments where information density must coexist with visual breathing room. 

The personality is professional and straightforward, utilizing a light-mode-first approach to evoke a sense of openness and transparency. The visual language avoids decorative excess, instead relying on mathematical spacing, refined typography, and a single high-energy accent color to guide user intent. The emotional response should be one of confidence and efficiency.

## Colors

The palette is built on a foundation of "Pure Light" to maximize legibility. 

- **Primary (#0690D4):** A vibrant, professional blue used exclusively for primary actions, active states, and critical brand accents. 
- **Neutral / Surface:** The background uses a pure white (#FFFFFF), while secondary surfaces and cards use an extremely subtle off-white (#F8FAFC) to create soft containment without heavy shadows.
- **Content:** Typography and iconography utilize a deep Slate (#0F172A) for maximum contrast, ensuring accessibility compliance (WCAG AA/AAA).
- **Borders:** Subtle, low-contrast borders (#E2E8F0) replace heavy shadows to define structure.

## Typography

This design system employs a dual-sans strategy. **Manrope** is used for headlines to provide a modern, slightly geometric character that feels approachable yet authoritative. **Inter** is the workhorse for all body copy and UI elements, chosen for its exceptional legibility and systematic feel.

For technical data, status labels, and small metadata, **JetBrains Mono** is used sparingly. This adds a "pro-tool" flavor to the interface, signaling precision. Text colors should always be dark slate against the light backgrounds, with secondary text using a 60% opacity of the neutral color.

## Layout & Spacing

The design system utilizes a **Fixed Grid** philosophy for desktop layouts to maintain a controlled reading experience, transitioning to a fluid model for mobile.

- **Desktop:** 12-column grid with a 1280px max-width. Gutters are fixed at 24px.
- **Mobile:** Single column with 16px side margins.
- **Rhythm:** An 8px linear scale (4, 8, 16, 24, 32, 48, 64) governs all padding and margin decisions. Component internals (like button padding) may use 4px increments for tighter grouping.

## Elevation & Depth

In this design system, depth is communicated through **Low-contrast outlines** and **Tonal layers** rather than traditional shadows.

- **Level 0 (Background):** Pure White (#FFFFFF).
- **Level 1 (Cards/Surfaces):** Off-white (#F8FAFC) with a 1px border (#E2E8F0).
- **Interactive States:** On hover, a surface may gain a very soft, diffused ambient shadow (0px 4px 20px rgba(0, 0, 0, 0.04)) to indicate lift.
- **Separators:** Use thin 1px lines (#F1F5F9) to divide content within a single elevation level.

## Shapes

The shape language is **Soft** and restrained. A 0.25rem (4px) base radius is applied to standard components like inputs and buttons to maintain a professional "square" look while removing the harshness of 90-degree corners. 

Large containers and cards use `rounded-lg` (8px) to provide clear visual distinction from smaller UI elements. This subtle rounding reinforces the modern, systematic nature of the product.

## Components

- **Buttons:** Primary buttons use a solid #0690D4 fill with white text. Secondary buttons use a white fill with a #E2E8F0 border and primary blue text.
- **Input Fields:** Backgrounds must be pure white (#FFFFFF) with a 1px #E2E8F0 border. On focus, the border transitions to #0690D4 with a subtle 2px outer glow in the same color at 10% opacity.
- **Cards:** Use the Off-white (#F8FAFC) surface with a 1px border. No shadows in default state.
- **Chips:** Small, pill-shaped elements with a light grey background (#F1F5F9) and dark slate text. Active chips toggle to the Primary blue fill.
- **Lists:** Clean rows separated by 1px horizontal lines (#F1F5F9). Interaction states should trigger a subtle background change to #F8FAFC.
- **Footer:** A clean, high-contrast footer with a white background and a top border (#E2E8F0). Navigation links in the footer should use secondary text colors, shifting to primary blue on hover.