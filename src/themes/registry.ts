import type { DesignConfig } from "../../types";

export type RadiusOption = DesignConfig["radius"];

export type ThemeRecipeFamily =
  | "editorial"
  | "product"
  | "studio"
  | "expressive"
  | "local";

export type ThemeRecipeContract = {
  version: 1;
  family: ThemeRecipeFamily;
  density: "compact" | "balanced" | "spacious";
  shape: "square" | "soft" | "rounded";
  contrast: "quiet" | "balanced" | "bold";
  mediaTreatment: "flush" | "framed" | "floating";
};

export type FontOption = {
  value: string;
  label: string;
  category: "sans" | "serif" | "display";
};

export type ThemePreset = {
  id: string;
  label: string;
  description: string;
  bestFor: string;
  recipe: ThemeRecipeContract;
  design: DesignConfig;
};

export const fontOptions: FontOption[] = [
  { value: "Inter", label: "Inter", category: "sans" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans", category: "sans" },
  { value: "Manrope", label: "Manrope", category: "sans" },
  { value: "Space Grotesk", label: "Space Grotesk", category: "display" },
  { value: "Sora", label: "Sora", category: "display" },
  { value: "Merriweather", label: "Merriweather", category: "serif" },
  { value: "Lora", label: "Lora", category: "serif" },
  { value: "Source Serif 4", label: "Source Serif 4", category: "serif" },
  { value: "Newsreader", label: "Newsreader", category: "serif" },
  { value: "Nunito Sans", label: "Nunito Sans", category: "sans" },
];

export const themePresets: ThemePreset[] = [
  {
    id: "field-journal",
    label: "Field Journal",
    description: "Crisp white, clear blue, and dark editorial ink for image-led independent publications.",
    bestFor: "Travel journals, field reporting, independent magazines, and personality-led publications.",
    recipe: {
      version: 1,
      family: "editorial",
      density: "spacious",
      shape: "square",
      contrast: "balanced",
      mediaTreatment: "flush",
    },
    design: {
      themeId: "field-journal",
      primaryColor: "#2867d8",
      accentColor: "#164ca4",
      backgroundColor: "#ffffff",
      textColor: "#17191d",
      headingFont: "Newsreader",
      bodyFont: "Nunito Sans",
      radius: "sm",
    },
  },
  {
    id: "editorial-travel",
    label: "Editorial Travel",
    description: "Warm editorial surfaces with grounded green and coral accents.",
    bestFor: "Travel agencies, destination guides, cultural tours, and premium itineraries.",
    recipe: {
      version: 1,
      family: "editorial",
      density: "spacious",
      shape: "square",
      contrast: "balanced",
      mediaTreatment: "flush",
    },
    design: {
      themeId: "editorial-travel",
      primaryColor: "#b91c1c",
      accentColor: "#173f35",
      backgroundColor: "#f7f1e7",
      textColor: "#17221e",
      headingFont: "Lora",
      bodyFont: "Inter",
      radius: "sm",
    },
  },
  {
    id: "clean-saas",
    label: "Clean SaaS",
    description: "Neutral software palette with confident blue and violet accents.",
    bestFor: "SaaS, dashboards, product sites, and generic modern websites.",
    recipe: {
      version: 1,
      family: "product",
      density: "balanced",
      shape: "soft",
      contrast: "quiet",
      mediaTreatment: "framed",
    },
    design: {
      themeId: "clean-saas",
      primaryColor: "#2563eb",
      accentColor: "#7c3aed",
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      headingFont: "Inter",
      bodyFont: "Inter",
      radius: "md",
    },
  },
  {
    id: "launch-saas",
    label: "Launch SaaS",
    description: "Bright product palette with softer page background and crisp sans type.",
    bestFor: "Launch pages, startup sites, and conversion-focused product pages.",
    recipe: {
      version: 1,
      family: "product",
      density: "balanced",
      shape: "soft",
      contrast: "balanced",
      mediaTreatment: "floating",
    },
    design: {
      themeId: "launch-saas",
      primaryColor: "#6d5dfc",
      accentColor: "#2563eb",
      backgroundColor: "#fbfaff",
      textColor: "#111827",
      headingFont: "Plus Jakarta Sans",
      bodyFont: "Inter",
      radius: "md",
    },
  },
  {
    id: "studio-agency",
    label: "Studio Agency",
    description: "Editorial dark ink with teal accent for polished service brands.",
    bestFor: "Agencies, studios, consultants, and premium service businesses.",
    recipe: {
      version: 1,
      family: "studio",
      density: "spacious",
      shape: "soft",
      contrast: "bold",
      mediaTreatment: "flush",
    },
    design: {
      themeId: "studio-agency",
      primaryColor: "#0f172a",
      accentColor: "#14b8a6",
      backgroundColor: "#f8fafc",
      textColor: "#111827",
      headingFont: "Manrope",
      bodyFont: "Inter",
      radius: "md",
    },
  },
  {
    id: "journal-classic",
    label: "Journal Classic",
    description: "Calm editorial colors with serif headings and readable body text.",
    bestFor: "Blogs, journals, essays, guides, and content-led websites.",
    recipe: {
      version: 1,
      family: "editorial",
      density: "spacious",
      shape: "square",
      contrast: "quiet",
      mediaTreatment: "flush",
    },
    design: {
      themeId: "journal-classic",
      primaryColor: "#0f766e",
      accentColor: "#7c3aed",
      backgroundColor: "#fffaf0",
      textColor: "#172033",
      headingFont: "Merriweather",
      bodyFont: "Inter",
      radius: "sm",
    },
  },
  {
    id: "portfolio-vivid",
    label: "Portfolio Vivid",
    description: "Expressive creative palette with bolder display typography.",
    bestFor: "Portfolios, creators, personal brands, and visual case studies.",
    recipe: {
      version: 1,
      family: "expressive",
      density: "spacious",
      shape: "rounded",
      contrast: "bold",
      mediaTreatment: "floating",
    },
    design: {
      themeId: "portfolio-vivid",
      primaryColor: "#4f46e5",
      accentColor: "#f43f5e",
      backgroundColor: "#ffffff",
      textColor: "#111827",
      headingFont: "Space Grotesk",
      bodyFont: "Inter",
      radius: "lg",
    },
  },
  {
    id: "local-trust",
    label: "Local Trust",
    description: "Grounded green and amber palette for clear local business sites.",
    bestFor: "Local businesses, services, trades, clinics, venues, and tourism sites.",
    recipe: {
      version: 1,
      family: "local",
      density: "compact",
      shape: "soft",
      contrast: "balanced",
      mediaTreatment: "framed",
    },
    design: {
      themeId: "local-trust",
      primaryColor: "#0f766e",
      accentColor: "#f59e0b",
      backgroundColor: "#ffffff",
      textColor: "#172033",
      headingFont: "Inter",
      bodyFont: "Inter",
      radius: "md",
    },
  },
];

export const defaultThemePreset = themePresets.find((theme) => theme.id === "clean-saas") ?? themePresets[0];

export const themePresetOptions = themePresets.map((theme) => ({
  value: theme.id,
  label: theme.label,
}));

export const fontSelectOptions = fontOptions.map((font) => ({
  value: font.value,
  label: font.label,
}));

const designMatchKeys: Array<keyof Omit<DesignConfig, "themeId">> = [
  "primaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "headingFont",
  "bodyFont",
  "radius",
];

const scoreThemeMatch = (
  preset: ThemePreset,
  design?: Partial<DesignConfig> | null,
) => designMatchKeys.reduce((score, key) => {
  const value = design?.[key];
  if (!value || value !== preset.design[key]) return score;
  return score + (key.endsWith("Color") ? 3 : key.endsWith("Font") ? 2 : 1);
}, 0);

export const getThemePreset = (
  themeId?: string | null,
  design?: Partial<DesignConfig> | null,
) => {
  const exactPreset = themePresets.find((theme) => theme.id === themeId);
  if (exactPreset) return exactPreset;

  const inferredPreset = design
    ? [...themePresets]
        .map((preset) => ({ preset, score: scoreThemeMatch(preset, design) }))
        .sort((a, b) => b.score - a.score)[0]
    : null;

  return inferredPreset && inferredPreset.score >= 5
    ? inferredPreset.preset
    : defaultThemePreset;
};

export const resolveThemePresetId = (design?: Partial<DesignConfig> | null) =>
  getThemePreset(design?.themeId, design).id;

export const getThemeRecipeContract = (
  themeId?: string | null,
  design?: Partial<DesignConfig> | null,
) => getThemePreset(themeId, design).recipe;

export const createDesignFromThemePreset = (
  themeId?: string | null,
  overrides: Partial<DesignConfig> = {},
): DesignConfig => {
  const preset = getThemePreset(themeId);
  const definedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  ) as Partial<DesignConfig>;
  return {
    ...preset.design,
    ...definedOverrides,
    themeId: definedOverrides.themeId ?? preset.id,
  };
};

const googleFontFamilies = new Set(fontOptions.map((font) => font.value));

const formatGoogleFontFamily = (family: string) => family.trim().replace(/\s+/g, "+");

export const getGoogleFontHref = (families: Array<string | undefined | null>) => {
  const uniqueFamilies = Array.from(
    new Set(
      families
        .map((family) => family?.trim())
        .filter((family): family is string => Boolean(family && googleFontFamilies.has(family))),
    ),
  );

  if (uniqueFamilies.length === 0) return "";

  const familyParams = uniqueFamilies
    .map((family) => `family=${formatGoogleFontFamily(family)}:wght@400;500;600;700;800;900`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
};
