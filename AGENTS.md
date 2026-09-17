# Repository instructions

## Component styling

- All new UI components must use Tailwind CSS utility classes for layout, spacing, typography, colour, responsive behaviour, and interaction states.
- Do not add new component-specific CSS, Sass, CSS Modules, styled-components, or Emotion styles.
- Keep `src/styles/public.css` limited to Tailwind imports, global design tokens, resets, accessibility rules, and behaviour that cannot reasonably live on one component.
- Existing rules in `src/styles/editor.css` are legacy CMS styling. They may remain, but new CMS components must use Tailwind. When changing an existing component, write new styling in Tailwind and migrate the touched legacy rules when practical.
- Inline styles are allowed only for genuinely dynamic runtime values or CSS custom properties that cannot be represented by static Tailwind utilities.
