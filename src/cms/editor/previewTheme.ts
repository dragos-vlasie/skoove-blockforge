import type { CSSProperties } from "react";
import type { SiteConfig } from "../../../types";
import { createSemanticThemeStyle } from "../../themes/semanticTokens";

export type PreviewThemeStyle = CSSProperties & Record<`--${string}`, string>;

export const createPreviewThemeStyle = (site: SiteConfig): PreviewThemeStyle =>
  createSemanticThemeStyle(site);
