import type { CSSProperties } from "react";
import type { DesignConfig, SiteConfig } from "../../types";
import { getThemeRecipeContract, type ThemeRecipeContract } from "./registry";

export type SemanticThemeStyle = CSSProperties & Record<`--${string}`, string>;

const radiusMap: Record<DesignConfig["radius"], string> = {
  sm: "12px",
  md: "22px",
  lg: "30px",
};

const defaultDesign: DesignConfig = {
  themeId: "clean-saas",
  primaryColor: "#2563eb",
  accentColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  headingFont: "Inter",
  bodyFont: "Inter",
  radius: "md",
};

const parseHex = (color: string) => {
  const value = color.trim().replace(/^#/, "");
  const normalized = value.length === 3
    ? value.split("").map((character) => character + character).join("")
    : value;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
};

const relativeLuminance = (color: string) => {
  const rgb = parseHex(color);
  if (!rgb) return null;
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (left: string, right: string) => {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  if (leftLuminance === null || rightLuminance === null) return 0;
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const contrastText = (color: string, light = "#ffffff", dark = "#111827") => {
  const candidates = [light, dark, "#ffffff", "#000000"];
  return candidates.reduce((best, candidate) => (
    contrastRatio(color, candidate) > contrastRatio(color, best) ? candidate : best
  ));
};

const toHex = (channels: number[]) => `#${channels
  .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
  .join("")}`;

const mixColors = (from: string, to: string, amount: number) => {
  const start = parseHex(from);
  const end = parseHex(to);
  if (!start || !end) return from;
  return toHex(start.map((channel, index) => channel + (end[index] - channel) * amount));
};

const accessibleTextColor = (
  foreground: string,
  backgrounds: string[],
  toward: string,
  target = 4.5,
) => {
  const minimumContrast = (color: string) => Math.min(
    ...backgrounds.map((background) => contrastRatio(color, background)),
  );

  if (minimumContrast(foreground) >= target) return foreground;

  const fallback = [toward, "#000000", "#ffffff"].reduce((best, candidate) => (
    minimumContrast(candidate) > minimumContrast(best) ? candidate : best
  ));

  for (let step = 1; step <= 100; step += 1) {
    const candidate = mixColors(foreground, fallback, step / 100);
    if (minimumContrast(candidate) >= target) return candidate;
  }

  return fallback;
};

const recipeTokens = (recipe: ThemeRecipeContract) => {
  const sectionSpace = {
    compact: "clamp(3.5rem, 6vw, 5.5rem)",
    balanced: "clamp(4rem, 8vw, 7rem)",
    spacious: "clamp(4.5rem, 9vw, 8rem)",
  }[recipe.density];
  const sectionSpaceCompact = {
    compact: "clamp(2rem, 4vw, 3rem)",
    balanced: "clamp(2.5rem, 5vw, 4rem)",
    spacious: "clamp(3rem, 6vw, 4.75rem)",
  }[recipe.density];
  const containerWidth = {
    editorial: "80rem",
    product: "76rem",
    studio: "84rem",
    expressive: "86rem",
    local: "78rem",
  }[recipe.family];
  const displaySize = {
    editorial: "clamp(3.25rem, 7vw, 6.75rem)",
    product: "clamp(3rem, 7vw, 6rem)",
    studio: "clamp(3.25rem, 7vw, 6.5rem)",
    expressive: "clamp(3.5rem, 8vw, 7rem)",
    local: "clamp(2.75rem, 6vw, 5.25rem)",
  }[recipe.family];
  const headingSize = {
    editorial: "clamp(2.4rem, 5vw, 4.5rem)",
    product: "clamp(2.25rem, 5vw, 4.25rem)",
    studio: "clamp(2.5rem, 5.5vw, 4.75rem)",
    expressive: "clamp(2.6rem, 6vw, 5rem)",
    local: "clamp(2.1rem, 4.5vw, 3.85rem)",
  }[recipe.family];
  const headingWeight = recipe.family === "editorial" ? "700" : "800";
  const headingTracking = recipe.family === "editorial" ? "-0.04em" : "-0.05em";
  const headingLeading = recipe.family === "local" ? "1.02" : "0.98";
  const shapeTokens = {
    square: {
      cardRadius: "max(0px, calc(var(--site-radius-sm) * .35))",
      mediaRadius: "0px",
      buttonRadius: "max(4px, calc(var(--site-radius-sm) * .5))",
    },
    soft: {
      cardRadius: "var(--site-radius)",
      mediaRadius: "var(--site-radius)",
      buttonRadius: "var(--site-radius-sm)",
    },
    rounded: {
      cardRadius: "var(--site-radius-lg)",
      mediaRadius: "var(--site-radius-lg)",
      buttonRadius: "999px",
    },
  }[recipe.shape];
  const cardShadow = {
    quiet: "0 1.25rem 3.5rem color-mix(in srgb, var(--site-text) 7%, transparent)",
    balanced: "0 1.5rem 4rem color-mix(in srgb, var(--site-text) 10%, transparent)",
    bold: "0.85rem 0.85rem 0 var(--site-accent)",
  }[recipe.contrast];
  const mediaShadow = {
    flush: "none",
    framed: "0 1.5rem 4rem color-mix(in srgb, var(--site-text) 10%, transparent)",
    floating: "1rem 1rem 0 var(--site-accent)",
  }[recipe.mediaTreatment];

  return {
    "--site-container-width": containerWidth,
    "--site-gutter": "clamp(1.25rem, 4vw, 3rem)",
    "--site-section-space": sectionSpace,
    "--site-section-space-compact": sectionSpaceCompact,
    "--site-display-size": displaySize,
    "--site-heading-size": headingSize,
    "--site-heading-weight": headingWeight,
    "--site-heading-tracking": headingTracking,
    "--site-heading-leading": headingLeading,
    "--site-card-radius": shapeTokens.cardRadius,
    "--site-media-radius": shapeTokens.mediaRadius,
    "--site-button-radius": shapeTokens.buttonRadius,
    "--site-card-shadow": cardShadow,
    "--site-media-shadow": mediaShadow,
  } as const;
};

export const createSemanticThemeStyle = (
  siteOrDesign?: SiteConfig | DesignConfig | null,
): SemanticThemeStyle => {
  const suppliedDesign = siteOrDesign && "siteName" in siteOrDesign
    ? siteOrDesign.design
    : siteOrDesign;
  const design = { ...defaultDesign, ...(suppliedDesign ?? {}) };
  const radius = radiusMap[design.radius] || radiusMap.md;
  const recipe = getThemeRecipeContract(design.themeId, design);
  const headingFont = `${design.headingFont}, ui-sans-serif, system-ui, sans-serif`;
  const bodyFont = `${design.bodyFont}, ui-sans-serif, system-ui, sans-serif`;
  const textSurfaces = [
    design.backgroundColor,
    mixColors(design.backgroundColor, design.textColor, 0.04),
    mixColors(design.backgroundColor, design.textColor, 0.1),
  ];
  const primaryText = accessibleTextColor(
    design.primaryColor,
    textSurfaces,
    design.textColor,
  );
  const accentText = accessibleTextColor(
    design.accentColor,
    textSurfaces,
    design.textColor,
  );
  const mutedText = accessibleTextColor(
    mixColors(design.textColor, design.backgroundColor, 0.32),
    textSurfaces,
    design.textColor,
  );

  return {
    "--site-background": design.backgroundColor,
    "--site-surface": `color-mix(in srgb, ${design.backgroundColor} 96%, ${design.textColor} 4%)`,
    "--site-surface-soft": `color-mix(in srgb, ${design.backgroundColor} 90%, ${design.textColor} 10%)`,
    "--site-surface-strong": `color-mix(in srgb, ${design.backgroundColor} 78%, ${design.textColor} 22%)`,
    "--site-text": design.textColor,
    "--site-heading": design.textColor,
    "--site-muted": mutedText,
    "--site-border": `color-mix(in srgb, ${design.textColor} 18%, ${design.backgroundColor} 82%)`,
    "--site-primary": design.primaryColor,
    "--site-primary-text": primaryText,
    "--site-primary-strong": `color-mix(in srgb, ${design.primaryColor} 82%, ${design.textColor} 18%)`,
    "--site-on-primary": contrastText(design.primaryColor),
    "--site-accent": design.accentColor,
    "--site-accent-text": accentText,
    "--site-on-accent": contrastText(design.accentColor),
    "--site-inverse": design.textColor,
    "--site-on-inverse": contrastText(design.textColor, design.backgroundColor),
    "--site-radius": radius,
    "--site-radius-sm": `max(6px, calc(${radius} * .55))`,
    "--site-radius-lg": `calc(${radius} * 1.35)`,
    ...recipeTokens(recipe),
    "--font-heading": headingFont,
    "--font-body": bodyFont,

    // Compatibility aliases for existing core sections and public chrome.
    "--ink": design.textColor,
    "--muted": mutedText,
    "--line": `color-mix(in srgb, ${design.textColor} 18%, ${design.backgroundColor} 82%)`,
    "--paper": design.backgroundColor,
    "--soft": `color-mix(in srgb, ${design.backgroundColor} 90%, ${design.textColor} 10%)`,
    "--accent": design.primaryColor,
    "--accent-strong": design.accentColor,
    "--radius": radius,
    color: "var(--site-text)",
    background: "var(--site-background)",
    fontFamily: "var(--font-body)",
  };
};

export const semanticThemeStyleToString = (style: SemanticThemeStyle) =>
  Object.entries(style)
    .filter(([, value]) => typeof value === "string")
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
