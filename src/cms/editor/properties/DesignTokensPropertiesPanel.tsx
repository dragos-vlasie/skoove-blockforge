import type { ChangeEvent } from "react";
import type { ContentGraph, DesignConfig } from "../../../../types";
import {
  createDesignFromThemePreset,
  defaultThemePreset,
  fontSelectOptions,
  getThemePreset,
  themePresetOptions,
} from "../../../themes/registry";
import { Field, TextInput, selectChromeClass } from "../../ui";
import { packManifests, resolveEnabledPackIds } from "../../../packs/registry";

const fallbackDesign: DesignConfig = {
  themeId: defaultThemePreset.id,
  primaryColor: defaultThemePreset.design.primaryColor,
  accentColor: defaultThemePreset.design.accentColor,
  backgroundColor: defaultThemePreset.design.backgroundColor,
  textColor: defaultThemePreset.design.textColor,
  headingFont: defaultThemePreset.design.headingFont,
  bodyFont: defaultThemePreset.design.bodyFont,
  radius: defaultThemePreset.design.radius,
};

const radiusOptions: Array<{ value: DesignConfig["radius"]; label: string }> = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

const validColor = (value: string, fallback: string) =>
  /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          aria-label={label}
          type="color"
          value={validColor(value, fallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        />
        <TextInput value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  );
}

export function DesignTokensPropertiesPanel({
  graph,
  onPatchGraph,
}: {
  graph: ContentGraph;
  onPatchGraph: (updater: (graph: ContentGraph) => void) => void;
}) {
  const design: DesignConfig = { ...fallbackDesign, ...graph.site.design };
  const selectedTheme = getThemePreset(design.themeId, design);
  const enabledPackIds = resolveEnabledPackIds(graph.site.enabledPacks);
  const enabledManifests = packManifests.filter((manifest) => enabledPackIds.has(manifest.id));
  const recommendationSources = enabledManifests.some((manifest) => manifest.kind === "industry")
    ? enabledManifests.filter((manifest) => manifest.kind === "industry")
    : enabledManifests;
  const recommendedThemeIds = new Set(
    recommendationSources
      .map((manifest) => manifest.recommendedThemeId)
      .filter((themeId): themeId is string => Boolean(themeId)),
  );

  const updateDesign = (updates: Partial<DesignConfig>) => {
    onPatchGraph((draft) => {
      draft.site.design = {
        ...fallbackDesign,
        ...draft.site.design,
        ...updates,
      };
    });
  };

  const applyThemePreset = (event: ChangeEvent<HTMLSelectElement>) => {
    updateDesign(createDesignFromThemePreset(event.target.value));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Website theme</p>
            <h3 className="mt-1 text-sm font-bold text-slate-950">Layout, components, colors, and type</h3>
            <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">{selectedTheme.bestFor}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-600">
              {selectedTheme.recipe.family} composition · Recipe v{selectedTheme.recipe.version}
            </p>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
            {[design.primaryColor, design.accentColor, design.textColor].map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-8 w-8 first:rounded-l-lg last:rounded-r-lg"
                style={{ backgroundColor: validColor(color, "#0f172a") }}
              />
            ))}
          </div>
        </div>
      </div>

      <Field label="Theme preset">
        <div className="grid gap-1.5">
          <select value={selectedTheme.id} onChange={applyThemePreset} className={selectChromeClass}>
            {themePresetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}{recommendedThemeIds.has(option.value) ? " · Recommended" : ""}
              </option>
            ))}
          </select>
          <p className="text-[10px] leading-4 text-slate-500">
            The active theme controls the default composition of every compatible component.
          </p>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="Primary"
          value={design.primaryColor}
          fallback={fallbackDesign.primaryColor}
          onChange={(primaryColor) => updateDesign({ primaryColor })}
        />
        <ColorField
          label="Accent"
          value={design.accentColor}
          fallback={fallbackDesign.accentColor}
          onChange={(accentColor) => updateDesign({ accentColor })}
        />
        <ColorField
          label="Background"
          value={design.backgroundColor}
          fallback={fallbackDesign.backgroundColor}
          onChange={(backgroundColor) => updateDesign({ backgroundColor })}
        />
        <ColorField
          label="Text"
          value={design.textColor}
          fallback={fallbackDesign.textColor}
          onChange={(textColor) => updateDesign({ textColor })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Heading font">
          <select
            value={design.headingFont}
            onChange={(event) => updateDesign({ headingFont: event.target.value })}
            className={selectChromeClass}
          >
            {fontSelectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Body font">
          <select
            value={design.bodyFont}
            onChange={(event) => updateDesign({ bodyFont: event.target.value })}
            className={selectChromeClass}
          >
            {fontSelectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Corner radius">
        <select
          value={design.radius}
          onChange={(event) => updateDesign({ radius: event.target.value as DesignConfig["radius"] })}
          className={selectChromeClass}
        >
          {radiusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
