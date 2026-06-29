---
name: Premium Calm Enterprise
colors:
  surface: '#FFFFFF'
  surface-dim: '#cbded9'
  surface-bright: '#eafef8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e4f8f3'
  surface-container: '#def2ed'
  surface-container-high: '#d9ece7'
  surface-container-highest: '#d3e7e2'
  on-surface: '#0d1f1c'
  on-surface-variant: '#404846'
  inverse-surface: '#233430'
  inverse-on-surface: '#e1f5f0'
  outline: '#707976'
  outline-variant: '#c0c8c5'
  surface-tint: '#39665e'
  primary: '#01362f'
  on-primary: '#ffffff'
  primary-container: '#1f4d45'
  on-primary-container: '#8ebdb2'
  inverse-primary: '#a1d0c5'
  secondary: '#785a00'
  on-secondary: '#ffffff'
  secondary-container: '#fdcb57'
  on-secondary-container: '#735500'
  tertiary: '#5b1708'
  on-tertiary: '#ffffff'
  tertiary-container: '#792d1c'
  on-tertiary-container: '#ff987f'
  error: '#D14B3D'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bcece1'
  primary-fixed-dim: '#a1d0c5'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#204e46'
  secondary-fixed: '#ffdf9d'
  secondary-fixed-dim: '#f0c04d'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5b4300'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a3'
  on-tertiary-fixed: '#3d0600'
  on-tertiary-fixed-variant: '#7a2e1d'
  background: '#eafef8'
  on-background: '#0d1f1c'
  surface-variant: '#d3e7e2'
  background-canvas: '#A9CDC9'
  background-mint: '#E8F0EC'
  surface-muted: '#F4F8F6'
  text-secondary: '#5F6F6B'
  border-hairline: '#DCE6E2'
  risk-low: '#3E9D7C'
  risk-medium: '#F2C14E'
  risk-high: '#E8836B'
  risk-extreme: '#D14B3D'
  success: '#3E9D7C'
typography:
  display-h1:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-h2:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.25'
  title-h3:
    fontFamily: Poppins
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  kpi-metric:
    fontFamily: Poppins
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.2'
  table-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 24px
  panel-margin: 32px
---

## Brand & Style

The design system embodies a **Premium Calm** persona tailored for Enterprise Risk Management. It balances the high-stakes nature of governance and audit with a soothing, structured environment that reduces cognitive load. The aesthetic is a refined blend of **Modern Corporate** and **Minimalism**, characterized by generous whitespace and soft, rounded geometry.

The visual narrative is built on the concept of "The Focused Canvas." A soft teal outer environment serves as the stage for large, floating white panels with deep corner radii. This creates a clear mental model: the background is the system context, while the floating panels are the workspace where active decisions happen. This "pillowy" approach makes complex data feel less intimidating and more approachable.

Key stylistic pillars:
- **Trustworthy & Stable:** Deep teal tones and sturdy typography.
- **Structured Fluidity:** Large 24px radii and rounded components (pills) throughout.
- **Accessibility-First:** Risk indicators never rely solely on color; they are always reinforced by numeric scores and text labels.

## Colors

The palette is anchored by **Deep Teal** for brand authority and **Canvas Teal** for the environment. 

### Usage Guidelines:
- **Primary Teal (#1F4D45):** Reserved strictly for primary CTAs, active navigation states, and key headers. Never used for decorative accents.
- **Risk Levels:** These colors are functionally reserved for risk severity. 
    - **Low (#3E9D7C):** Stability and safety.
    - **Medium (#F2C14E):** Cautionary attention.
    - **High (#E8836B):** Urgent priority.
    - **Extreme (#D14B3D):** Immediate critical action.
- **The Floating Layering:** The hierarchy of depth is defined by color stepping: `Canvas Teal` (Background) &rarr; `Mint Pucat` (Panel Background) &rarr; `White` (Interactive Cards).
- **Text:** Primary text is a near-black teal to maintain the monochromatic harmony while ensuring maximum legibility (14:1 contrast ratio). Secondary text must not go lighter than #5F6F6B to maintain WCAG AA compliance.

## Typography

The system utilizes **Poppins** for high-level structure and **Inter** for data density.

- **Headings & Metrics:** Poppins provides a geometric, modern character that feels premium. All KPI numbers and financial figures must use `tabular-nums` to ensure columns align perfectly in dashboards.
- **Body & Data:** Inter is used for its exceptional legibility in data-heavy contexts like Risk Registers and Mitigation tables. 
- **Scale:**
    - On mobile, `display-h1` should scale down to 24px (`headline-h2` equivalent).
    - All labels and utility text use Inter with increased letter spacing for clarity at small sizes.
    - Financial figures (Rupiah) should always be rendered as integers without floating decimals to maintain a clean interface.

## Layout & Spacing

This design system uses an **8px grid system** and a **Fixed-Fluid Hybrid** layout model.

- **The Main Canvas:** The outer environment (`background-canvas`) is visible at the edges of the screen, creating a 24px-32px margin around the main content area.
- **The Floating Panel:** The main application interface sits within a container that uses a 24px radius. On desktop, this container has a maximum width of 1440px and is centered.
- **Internal Rhythm:** 
    - **Desktop:** 12-column grid with 24px gutters. Use `xl` (32px) padding for primary panel containers to create a "generous" enterprise feel.
    - **Tablet:** 8-column grid with 16px gutters.
    - **Mobile:** 4-column grid. The floating panel effect is reduced; the radius may drop to 16px to maximize screen real estate, but the `background-canvas` should still be visible as a thin border or header area.
- **Touch Targets:** All interactive elements (buttons, inputs) must maintain a minimum target of 44x44px regardless of visual size.

## Elevation & Depth

Hierarchy is established primarily through **Tonal Layers** rather than heavy shadows, ensuring a crisp, "flat-modern" look.

- **Layer 0 (Canvas):** `#A9CDC9` (Teal Muda) - The base of the application.
- **Layer 1 (Main Panel):** `#E8F0EC` (Mint Pucat) - The primary workspace level. 
- **Layer 2 (Cards/Inputs):** `#FFFFFF` (White) - These elements sit on the workspace. They use a **Hairline Border** (`#DCE6E2`) to define their boundaries.
- **Shadows:** Only used sparingly for "True Floating" elements such as:
    - **Dropdowns & Modals:** Soft, diffused shadows (Blur: 12px, Y: 4px, 5% opacity of `#1A2B28`).
    - **Hover States:** Cards can elevate slightly on hover with a subtle increase in shadow depth to indicate interactivity.

## Shapes

The shape language is **"Pillowy" and Consistent**. 

- **Primary Container:** 24px (`rounded-xl`).
- **Standard Cards:** 16px (`rounded-lg`).
- **Interactive Elements:** Buttons, Input Fields, Pills, and Risk Badges use a **Full Pill** radius (9999px). This creates a distinct visual contrast between the "structural" containers (rectangular-rounded) and "interactive" elements (pill-shaped).
- **Selection/Focus:** Always use a 2px solid primary teal focus ring with a 2px offset for accessibility.

## Components

- **Risk Badges:** Must be pill-shaped. They require three identifiers: the background color of the risk level, the text label (e.g., "HIGH"), and the numeric score (e.g., "12").
- **Buttons:** Primary buttons are pill-shaped, solid Teal (`#1F4D45`) with white text. Icon buttons are perfect circles. 
- **Input Fields:** White background with a 1px hairline border. They must be pill-shaped with 18px horizontal padding to complement the rounded theme.
- **Data Tables:** Use `surface-muted` (#F4F8F6) for row hovers. Use horizontal hairline dividers only. Numbers are right-aligned using tabular figures.
- **Heatmap 5x5:** Each cell is a square with 4px radius. The color represents the risk level, and the number inside indicates the count of risks in that quadrant.
- **Tabs:** Active states are indicated by a 2px bottom underline in Primary Teal and bolded text.
- **Floating Panels:** The main content area should have a consistent 32px padding (`spacing.xl`) internally to maintain the "premium" airy feel.