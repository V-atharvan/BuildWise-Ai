---
name: Kinetic Construction Engine
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#d3bbff'
  on-secondary: '#3f008d'
  secondary-container: '#5d03ca'
  on-secondary-container: '#c7aaff'
  tertiary: '#cebdff'
  on-tertiary: '#381385'
  tertiary-container: '#6f54bf'
  on-tertiary-container: '#ebe1ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#250059'
  on-secondary-fixed-variant: '#5b00c5'
  tertiary-fixed: '#e8ddff'
  tertiary-fixed-dim: '#cebdff'
  on-tertiary-fixed: '#21005e'
  on-tertiary-fixed-variant: '#4f319c'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.08em
  technical-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  gutter: 12px
---

## Brand & Style
The design system is engineered for a premium, developer-centric construction AI environment. It prioritizes a high-performance, dark-first aesthetic that bridges the gap between sophisticated software engineering and heavy industrial logistics. 

The visual language is rooted in **Modern Minimalism** with **Glassmorphic** accents. It evokes an emotional response of precision, technical authority, and "smart" durability. By utilizing deep blacks and vibrant violet luminescence, the UI feels like a high-end command center—engineered for clarity and rapid data digestion.

## Colors
The palette is dominated by a deep, monochromatic foundation to maximize the impact of functional color. 

- **Primary Violet:** Used for main actions, active states, and critical branding paths.
- **Deep Indigo & Neon Purple:** Employed as accent variations to define depth or highlight specific AI-driven data insights.
- **Surfaces:** We avoid flat grays. Instead, we use "Z-axis" depth with #111115 and #18181C to create a sense of hierarchy.
- **Borders:** Extremely thin, low-opacity borders are preferred over heavy strokes to maintain a lightweight, sophisticated feel.

## Typography
The typography system leverages **Inter** to maintain a clean, technical appearance. 

- **Headlines:** Use Black (900) or ExtraBold (800) weights with tight letter-spacing to create a "locked-in," impactful look.
- **Labels:** Technical parameters and metadata use small, medium-weight labels. For secondary categorization, use uppercase labels with increased letter spacing to ensure legibility despite the small scale.
- **Hierarchy:** Contrast is achieved through weight and color (Text Primary vs Text Secondary) rather than drastic shifts in size.

## Layout & Spacing
This is a mobile-first design system utilizing a **Fluid Grid** with fixed horizontal safe zones.

- **Grid:** 4-column layout for mobile, with 20px outer margins.
- **Rhythm:** A strict 4px base unit controls all padding and margins. 
- **Density:** High information density is acceptable for developer-centric views, but must be balanced with generous vertical "breathing room" between major logical sections (24px - 32px).
- **Reflow:** On larger mobile screens (e.g., Pro Max models), cards may expand to show supplementary technical data in a 2-column internal grid.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Glassmorphism**, not traditional drop shadows.

- **Background:** The base layer is #09090B.
- **Surface Level 1:** Cards and containers use #111115 with a 1px border at 7% white.
- **Surface Level 2:** Overlays, floating panels, and sheet dialogs use a glassmorphic blur (rgba(25, 25, 30, 0.85) with a 20px backdrop filter).
- **Glows:** Interactive elements (active buttons, focused inputs) emit a subtle violet glow using a 15px-25px blur radius at low opacity (rgba(124, 58, 237, 0.25)) to simulate light emission from the screen.

## Shapes
The shape language combines geometric precision with organic softness.

- **Cards & Sheets:** Use a consistent 20px radius (`rounded-xl`) to create a premium, modern hardware-inspired feel.
- **Interactive Elements:** Buttons are either fully rounded capsules (pill-shaped) for high-emphasis actions or 8px-12px (`rounded-lg`) for secondary functions.
- **Form Inputs:** Match the card roundedness for consistency, typically 12px or 16px.

## Components

### Buttons
- **Primary:** Capsule-shaped (radius 9999px), #7C3AED background, white text. Features a 25% opacity violet glow on hover/active.
- **Ghost:** Border-only (1px white 10%), transparent background. Transition to secondary violet on tap.

### Cards & Sheets
- **Container:** 20px corner radius, #111115 fill, 1px border (rgba(255,255,255,0.07)).
- **Glass Sheet:** Used for bottom sheets. 20px top-only radius, backdrop-filter: blur(20px).

### Input Fields
- **Technical Inputs:** Subtle dark background (#18181C), 12px radius. Active state changes border color to #A78BFA with a subtle inner glow.

### Lists & Items
- **Data Rows:** Divided by 1px borders (rgba(255,255,255,0.05)). Use `label-caps` for row headers to denote technical data fields.

### Status Indicators
- Use small, circular pips for status. AI "thinking" or "processing" states should use a breathing animation on a #A78BFA glow effect.

### Chips
- **Status Chips:** Semi-transparent violet background with #FAFAFA text, 100px radius, 12px height for metadata tagging.