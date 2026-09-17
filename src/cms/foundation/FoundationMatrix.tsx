import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BlockRenderer } from "../../../components/BlockLibrary";
import { blockRegistry, createBlockContentFromPreset } from "../../blocks/registry";
import { foundationComponentContracts, foundationThemeIds } from "../../foundation/catalog";
import { createDesignFromThemePreset, getThemePreset } from "../../themes/registry";
import { createSemanticThemeStyle } from "../../themes/semanticTokens";
import { PreviewFrame } from "../editor/PreviewFrame";

const devices = {
  desktop: { label: "Desktop", width: 1280 },
  tablet: { label: "Tablet", width: 768 },
  mobile: { label: "Mobile", width: 390 },
} as const;

type DeviceId = keyof typeof devices;

const themeDefinitions = foundationThemeIds.map((themeId) => {
  const preset = getThemePreset(themeId);
  const design = createDesignFromThemePreset(themeId);
  return { ...preset, design, style: createSemanticThemeStyle(design) };
});

function MatrixPreview({
  children,
  deviceWidth,
  label,
  theme,
}: {
  children: ReactNode;
  deviceWidth: number;
  label: string;
  theme: (typeof themeDefinitions)[number];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setAvailableWidth(container.clientWidth);
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    updateWidth();
    return () => observer.disconnect();
  }, []);

  const scale = availableWidth > 0
    ? Math.min(1, availableWidth / deviceWidth)
    : 0.2;

  return (
    <div ref={containerRef} className="min-h-[160px] w-full overflow-hidden bg-[#e9edf3]">
      <PreviewFrame
        expandToContent
        label={label}
        scale={scale}
        width={deviceWidth}
        themeDesign={theme.design}
        themeId={theme.id}
        themeStyle={theme.style}
      >
        {children}
      </PreviewFrame>
    </div>
  );
}

export function FoundationMatrix() {
  const [selectedType, setSelectedType] = useState(foundationComponentContracts[0].type);
  const [presetId, setPresetId] = useState("theme-default");
  const [deviceId, setDeviceId] = useState<DeviceId>("desktop");
  const contract = foundationComponentContracts.find(({ type }) => type === selectedType) ?? foundationComponentContracts[0];
  const definition = blockRegistry[selectedType];
  const presets = definition.presets ?? [];
  const activePresetId = presets.some((preset) => preset.id === presetId) ? presetId : presets[0]?.id;
  const content = useMemo(
    () => createBlockContentFromPreset(selectedType, activePresetId),
    [activePresetId, selectedType],
  );
  const device = devices[deviceId];

  const selectComponent = (type: typeof selectedType) => {
    setSelectedType(type);
    const nextDefinition = blockRegistry[type];
    setPresetId(nextDefinition.presets?.find((preset) => preset.recommended)?.id ?? nextDefinition.presets?.[0]?.id ?? "");
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#101828]">
      <header className="sticky top-0 z-20 border-b border-[#e4e7ec] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <a href="/cms?tab=settings" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#d0d5dd] text-xl text-[#475467] hover:bg-[#f9fafb]" aria-label="Back to CMS">←</a>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6d5dfc]">Builder quality control</p>
              <h1 className="truncate text-xl font-semibold tracking-[-0.03em]">Component and theme matrix</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-1">
            {(Object.entries(devices) as Array<[DeviceId, (typeof devices)[DeviceId]]>).map(([id, item]) => (
              <button key={id} type="button" aria-pressed={deviceId === id} onClick={() => setDeviceId(id)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${deviceId === id ? "bg-white text-[#5b45e5] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] gap-6 px-5 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="self-start rounded-2xl border border-[#e4e7ec] bg-white p-3 lg:sticky lg:top-[92px]">
          <div className="px-3 pb-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98a2b3]">Core foundation</p>
            <p className="mt-1 text-sm leading-5 text-[#667085]">15 dependable components. Packs add domain behaviour without replacing these basics.</p>
          </div>
          <label className="block px-3 pb-3 text-xs font-semibold text-[#475467] lg:hidden">
            Component
            <select
              value={selectedType}
              onChange={(event) => selectComponent(event.target.value as typeof selectedType)}
              className="mt-1 block h-11 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-medium text-[#101828] outline-none focus:border-[#8b7bff] focus:ring-2 focus:ring-[#ded7ff]"
            >
              {foundationComponentContracts.map((item) => (
                <option key={item.type} value={item.type}>{blockRegistry[item.type].label}</option>
              ))}
            </select>
          </label>
          <nav aria-label="Foundation components" className="hidden max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto lg:block">
            {foundationComponentContracts.map((item, index) => {
              const block = blockRegistry[item.type];
              const active = item.type === selectedType;
              return (
                <button key={item.type} type="button" onClick={() => selectComponent(item.type)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-[#eeeaff] text-[#5138df]" : "text-[#475467] hover:bg-[#f9fafb] hover:text-[#101828]"}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${active ? "bg-[#6d5dfc] text-white" : "bg-[#f2f4f7] text-[#667085]"}`}>{index + 1}</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-semibold">{block.label}</strong>
                    <span className="block truncate text-xs text-[#98a2b3]">{block.presets?.length ?? 1} variants</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-[#e4e7ec] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6d5dfc]">{definition.label}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{contract.purpose}</h2>
                <p className="mt-2 text-sm leading-6 text-[#667085]">Required: {contract.requiredCapabilities.join(" · ")}</p>
              </div>
              {presets.length > 0 && (
                <label className="min-w-[220px] text-xs font-semibold text-[#475467]">
                  Variant
                  <select value={activePresetId} onChange={(event) => setPresetId(event.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-medium text-[#101828] outline-none focus:border-[#8b7bff] focus:ring-2 focus:ring-[#ded7ff]">
                    {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-3">
            {themeDefinitions.map((theme) => (
              <article key={theme.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#dfe3ea] bg-white shadow-sm">
                <header className="border-b border-[#e4e7ec] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#101828]">{theme.label}</h3>
                      <p className="mt-0.5 text-xs text-[#667085]">{theme.recipe.family} · {theme.recipe.density} · {theme.recipe.shape}</p>
                    </div>
                    <div className="flex gap-1.5" aria-label={`${theme.label} colours`}>
                      {[theme.design.primaryColor, theme.design.accentColor, theme.design.backgroundColor].map((color) => <span key={color} className="h-5 w-5 rounded-full border border-black/10" style={{ background: color }} title={color} />)}
                    </div>
                  </div>
                </header>
                <MatrixPreview deviceWidth={device.width} label={`${definition.label} in ${theme.label}`} theme={theme}>
                    <BlockRenderer block={{ id: `foundation-${selectedType}`, type: selectedType, content }} />
                </MatrixPreview>
                <footer className="border-t border-[#e4e7ec] px-4 py-3 text-xs leading-5 text-[#667085]">{theme.description}</footer>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
