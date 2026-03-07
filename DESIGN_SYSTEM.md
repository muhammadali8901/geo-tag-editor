# Geo Tag Editor - Design System Reference

## Quick Reference Guide for Developers

---

## COLOR SYSTEM

### Primary Colors
```css
--primary: #0284c7        /* Main brand color */
--primary-dark: #0369a1   /* Hover states, emphasis */
--primary-light: #e0f2fe  /* Backgrounds, highlights */
--primary-lighter: #f0f9ff /* Subtle backgrounds */
```

### Accent Colors
```css
--accent: #6366f1         /* Secondary brand color */
--accent-dark: #4f46e5    /* Accent hover states */
--accent-light: #eef2ff   /* Accent backgrounds */
```

### Semantic Colors
```css
--success: #10b981        /* Success messages, positive actions */
--success-bg: #ecfdf5     /* Success backgrounds */
--danger: #ef4444         /* Errors, destructive actions */
--danger-bg: #fef2f2      /* Error backgrounds */
--warning: #f59e0b        /* Warnings, caution */
--warning-bg: #fffbeb     /* Warning backgrounds */
--info: #0ea5e9           /* Information, neutral highlights */
--info-bg: #f0f9ff        /* Info backgrounds */
```

### Neutral Colors
```css
--bg: #fafbfc             /* Page background */
--card: #ffffff           /* Card/panel backgrounds */
--text: #0f172a           /* Primary text */
--text-secondary: #475569 /* Secondary text */
--text-muted: #64748b     /* Muted/disabled text */
--border: #e2e8f0         /* Default borders */
--border-light: #f1f5f9   /* Light borders */
```

---

## SPACING SYSTEM

Use consistent spacing throughout:

```css
--spacing-xs: 4px         /* Minimal spacing */
--spacing-sm: 8px         /* Small spacing */
--spacing-md: 16px        /* Medium spacing (default) */
--spacing-lg: 24px        /* Large spacing */
--spacing-xl: 32px        /* Extra large spacing */
--spacing-2xl: 48px       /* 2X large spacing */
--spacing-3xl: 64px       /* 3X large spacing */
```

### Usage Examples
```css
padding: var(--spacing-md);
margin-bottom: var(--spacing-lg);
gap: var(--spacing-sm);
```

---

## BORDER RADIUS

```css
--radius: 10px            /* Default radius */
--radius-sm: 6px          /* Small radius (buttons, inputs) */
--radius-lg: 14px         /* Large radius (cards, modals) */
```

---

## SHADOWS

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,.05)      /* Subtle shadow */
--shadow: 0 4px 16px rgba(0,0,0,.06)        /* Default shadow */
--shadow-lg: 0 10px 32px rgba(0,0,0,.1)     /* Large shadow */
--shadow-xl: 0 20px 48px rgba(0,0,0,.12)    /* Extra large shadow */
```

---

## TYPOGRAPHY

### Font Family
```css
--font: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes
- Body: 1rem (16px)
- Small: 0.88rem - 0.92rem
- Large: 1.05rem - 1.2rem
- Headings: Use clamp() for responsive sizing

### Font Weights
- Regular: 400 (default)
- Medium: 500
- Semibold: 600
- Bold: 700
- Extra Bold: 800

### Line Heights
- Body text: 1.6 - 1.8
- Headings: 1.15 - 1.3
- Compact: 1.5

---

## BUTTON STYLES

### Primary Button
```html
<button class="btn btn-primary">Primary Action</button>
```
- Background: Gradient
- Color: White
- Shadow: Yes
- Hover: Lift + shadow increase

### Outline Button
```html
<button class="btn btn-outline">Secondary Action</button>
```
- Background: Transparent
- Border: 2px solid primary
- Hover: Light background

### Success Button
```html
<button class="btn btn-success">Success Action</button>
```
- Background: Success green
- Color: White
- Use for: Downloads, confirmations

### Danger Button
```html
<button class="btn btn-danger">Danger Action</button>
```
- Background: Transparent
- Border: 2px solid danger
- Use for: Delete, remove actions

### Small Button
```html
<button class="btn btn-sm">Small Button</button>
```
- Reduced padding
- Smaller font size

---

## CARD COMPONENT

```html
<div class="card">
  <div class="card-icon blue">
    <svg class="icon"><use href="/images/icons.svg#icon-name"></use></svg>
  </div>
  <h3>Card Title</h3>
  <p>Card description text</p>
</div>
```

### Card Icon Colors
- `.blue` - Primary blue gradient
- `.purple` - Accent purple gradient
- `.green` - Success green gradient
- `.orange` - Warning orange gradient

---

## ICON USAGE

### Basic Icon
```html
<svg class="icon"><use href="/images/icons.svg#icon-name"></use></svg>
```

### Icon Sizes
```html
<svg class="icon icon-sm">...</svg>   <!-- Small -->
<svg class="icon icon-md">...</svg>   <!-- Medium -->
<svg class="icon icon-lg">...</svg>   <!-- Large -->
<svg class="icon icon-xl">...</svg>   <!-- Extra Large -->
```

### Available Icons
- icon-upload
- icon-location
- icon-map
- icon-metadata
- icon-edit
- icon-download
- icon-image
- icon-shield
- icon-trending
- icon-home
- icon-user
- icon-envelope
- icon-clock
- icon-books
- icon-document
- icon-close
- icon-check
- icon-zap
- icon-gift
- icon-lightbulb

---

## FORM ELEMENTS

### Input Field
```html
<div class="field">
  <label for="input-id">Label</label>
  <input type="text" id="input-id" placeholder="Placeholder">
  <p class="hint">Helper text</p>
</div>
```

### Focus States
- Border: 2px solid primary
- Shadow: 0 0 0 4px rgba(2,132,199,.1)
- Background: White

---

## GRID LAYOUTS

```html
<div class="grid-2">...</div>  <!-- 2 columns -->
<div class="grid-3">...</div>  <!-- 3 columns -->
<div class="grid-4">...</div>  <!-- 4 columns -->
```

Responsive:
- Desktop: Full columns
- Tablet: 2 columns
- Mobile: 1 column

---

## SECTION STRUCTURE

```html
<section class="section">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Label</span>
      <h2>Section Title</h2>
      <p>Section description</p>
    </div>
    <!-- Section content -->
  </div>
</section>
```

---

## GRADIENTS

### Primary Gradient
```css
background: var(--gradient);
/* linear-gradient(135deg, #0284c7 0%, #6366f1 100%) */
```

### Soft Gradient (backgrounds)
```css
background: var(--gradient-soft);
/* linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%) */
```

---

## TRANSITIONS

### Standard Transition
```css
transition: all .25s cubic-bezier(.4,0,.2,1);
```

### Hover Effects
- Transform: translateY(-2px to -4px)
- Shadow: Increase shadow level
- Color: Slight color shift

---

## RESPONSIVE BREAKPOINTS

```css
@media(max-width: 900px)  /* Tablet landscape */
@media(max-width: 768px)  /* Tablet portrait */
@media(max-width: 480px)  /* Mobile */
@media(max-width: 360px)  /* Small mobile */
```

---

## ACCESSIBILITY

### Required Attributes
- `aria-label` for icon-only buttons
- `aria-hidden="true"` for decorative icons
- `alt` text for images
- Proper heading hierarchy (h1 → h2 → h3)
- Focus visible states

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

---

## BEST PRACTICES

### DO ✓
- Use CSS variables for colors
- Use spacing variables for consistency
- Include hover states on interactive elements
- Add transitions for smooth interactions
- Use semantic HTML
- Include proper ARIA labels
- Test on mobile devices

### DON'T ✗
- Use hardcoded color values
- Use inconsistent spacing
- Forget hover/focus states
- Use emojis (use SVG icons instead)
- Skip accessibility attributes
- Ignore responsive design

---

## PERFORMANCE TIPS

1. **CSS**: Already optimized and minified
2. **Images**: Use appropriate formats (SVG for icons)
3. **JavaScript**: Defer non-critical scripts
4. **Fonts**: Use system fonts (already implemented)
5. **External Libraries**: Load on-demand (Leaflet, Piexif)

---

## MAINTENANCE

### Adding New Colors
1. Add to `:root` in style.css
2. Use descriptive variable names
3. Document in this guide

### Adding New Icons
1. Add symbol to icons.svg
2. Use consistent stroke-width: 2
3. Follow naming convention: icon-name
4. Update available icons list

### Adding New Components
1. Follow existing patterns
2. Use CSS variables
3. Include hover/focus states
4. Test responsiveness
5. Add to this guide

---

**Last Updated**: 2024
**Version**: 2.0 (Refactored)
