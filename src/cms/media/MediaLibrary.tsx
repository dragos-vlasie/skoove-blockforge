import { useEffect, useMemo, useState } from "react";
import type { AssetMeta, ContentGraph } from "../../../types";
import { SvgIcon } from "../icons";
import { Field, TextInput, selectChromeClass } from "../ui";

type UploadAsset = (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
type ReplaceAsset = (assetId: string, file: File) => Promise<AssetMeta | null>;
type PatchAsset = (assetId: string, updates: Partial<AssetMeta>) => void;

type MediaCheckResult = {
  url: string;
  label: string;
  ok: boolean;
  status: number | null;
  message: string;
};

const imageAccept = "image/png,image/jpeg,image/webp,image/gif";

export const parseTagInput = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

export const formatAssetSize = (size?: number) => {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const getAssetSourceLabel = (asset: AssetMeta) => {
  if (asset.storageProvider === "supabase") return "Supabase";
  if (asset.storageProvider === "github") return "GitHub";
  if (asset.url.startsWith("/uploads/")) return "Local";
  if (asset.storageProvider === "local") return "Local";
  return "External";
};

export const isUploadedAsset = (asset: AssetMeta) =>
  asset.url.startsWith("/uploads/") ||
  asset.storageProvider === "local" ||
  asset.storageProvider === "github" ||
  asset.storageProvider === "supabase";

const assetSearchText = (asset: AssetMeta) =>
  [
    asset.filename,
    asset.originalName,
    asset.alt,
    asset.folder,
    asset.url,
    getAssetSourceLabel(asset),
    ...(asset.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

function MediaThumbnail({
  asset,
  url,
  alt = "",
  className = "aspect-[4/3]",
  fit = "cover",
}: {
  asset?: AssetMeta;
  url?: string;
  alt?: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const src = asset?.url || url;

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}>
      {src ? (
        <img src={src} alt={asset?.alt || alt} className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`} />
      ) : (
        <div className="grid h-full w-full place-items-center text-slate-400">
          <SvgIcon name="image" className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

function MediaUploadForm({
  onUpload,
  onUploaded,
  compact = false,
}: {
  onUpload?: UploadAsset;
  onUploaded?: (asset: AssetMeta) => void;
  compact?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async () => {
    if (!file || !onUpload) return;
    setUploading(true);
    setError("");

    try {
      const asset = await onUpload({ file, alt, folder, tags });
      if (asset) {
        onUploaded?.(asset);
        setFile(null);
        setAlt("");
        setFolder("");
        setTags("");
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`grid gap-2 rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm ${compact ? "p-2" : "p-3"}`}>
      <label className={`grid cursor-pointer place-items-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-center text-[11px] font-bold text-slate-700 transition hover:border-[#6d5dfc]/40 hover:bg-[#f7f5ff] ${compact ? "min-h-12 py-2" : "min-h-20 py-4"}`}>
        <span className="flex items-center gap-2">
          <SvgIcon name="image" className="h-4 w-4 text-[#6d5dfc]" />
          {file ? file.name : "Choose image"}
        </span>
        <input
          type="file"
          accept={imageAccept}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError("");
          }}
          className="hidden"
        />
      </label>
      <TextInput value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Alt text" />
      <div className="grid grid-cols-2 gap-2">
        <TextInput value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Folder" />
        <TextInput value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags" />
      </div>
      <button
        type="button"
        disabled={!file || uploading || !onUpload}
        onClick={upload}
        className="rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#6d5dfc] disabled:opacity-40"
      >
        {uploading ? "Uploading" : "Upload image"}
      </button>
      {error && <p className="text-[10px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}

export function MediaPickerField({
  value,
  onChange,
  assets,
  onUploadAsset,
}: {
  value: string;
  onChange: (value: string) => void;
  assets: AssetMeta[];
  onUploadAsset?: UploadAsset;
}) {
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(() => !value);
  const selectedAsset = assets.find((asset) => asset.url === value);
  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return assets
      .filter((asset) => !normalizedQuery || assetSearchText(asset).includes(normalizedQuery))
      .slice(0, 8);
  }, [assets, query]);

  return (
    <div className="grid min-w-0 gap-2">
      {value ? (
        <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <MediaThumbnail asset={selectedAsset} url={value} className="h-14 w-16" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-slate-950" title={selectedAsset?.filename || value}>{selectedAsset?.filename || value}</p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
              {selectedAsset ? [selectedAsset.folder, getAssetSourceLabel(selectedAsset)].filter(Boolean).join(" · ") : "External image"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => setPickerOpen((open) => !open)} className="text-[10px] font-semibold text-violet-700 hover:text-violet-900">
                {pickerOpen ? "Close library" : "Change"}
              </button>
              <span className="text-slate-200" aria-hidden="true">·</span>
              <button type="button" onClick={() => { onChange(""); setPickerOpen(true); }} className="text-[10px] font-semibold text-rose-600 hover:text-rose-700">
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPickerOpen(true)} className="flex min-h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-600 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700">
          <SvgIcon name="image" className="h-4 w-4" />
          Choose image
        </button>
      )}

      {pickerOpen && (
        <div className="grid gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-slate-900">Media library</p>
            {value && <button type="button" onClick={() => setPickerOpen(false)} className="text-[10px] font-semibold text-slate-500 hover:text-slate-900">Done</button>}
          </div>
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search images…" />
          <div className="grid max-h-48 gap-1 overflow-auto pr-1">
            {filteredAssets.map((asset) => (
              <button
                type="button"
                key={asset.id}
                onClick={() => { onChange(asset.url); setPickerOpen(false); }}
                className={`grid grid-cols-[42px_minmax(0,1fr)] items-center gap-2 rounded-lg p-1.5 text-left transition ${
                  value === asset.url ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50"
                }`}
              >
                <MediaThumbnail asset={asset} className="h-9 w-10 rounded-lg" />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold" title={asset.filename || asset.url}>{asset.filename || asset.url}</span>
                  <span className="block truncate text-[9px] font-medium text-slate-400">
                    {[asset.folder, formatAssetSize(asset.size)].filter(Boolean).join(" · ") || getAssetSourceLabel(asset)}
                  </span>
                </span>
              </button>
            ))}
            {filteredAssets.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400">No matching media.</p>
            )}
          </div>

          {onUploadAsset && (
            <details className="rounded-lg border border-slate-200 bg-slate-50/60">
              <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold text-slate-600">Upload a new image</summary>
              <div className="px-2 pb-2">
                <MediaUploadForm onUpload={onUploadAsset} onUploaded={(asset) => { onChange(asset.url); setPickerOpen(false); }} compact />
              </div>
            </details>
          )}

          <details className="rounded-lg border border-slate-200 bg-slate-50/60">
            <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold text-slate-600">Use an external URL</summary>
            <div className="px-2 pb-2">
              <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://… or /uploads/image.jpg" />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function MediaAssetTile({
  asset,
  selected,
  onSelect,
}: {
  asset: AssetMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = [
    asset.width && asset.height ? `${asset.width}x${asset.height}` : "",
    formatAssetSize(asset.size),
    asset.mimeType?.replace("image/", "").toUpperCase(),
  ].filter((item): item is string => Boolean(item));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#6d5dfc]/40 hover:shadow-lg hover:shadow-slate-200/70 ${
        selected ? "border-[#6d5dfc] ring-4 ring-[#6d5dfc]/10" : "border-slate-200"
      }`}
    >
      <div className="relative">
        <MediaThumbnail asset={asset} className="aspect-[5/4] rounded-none border-0 bg-white" fit="contain" />
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-600 shadow-sm">
          {getAssetSourceLabel(asset)}
        </span>
      </div>
      <div className="grid gap-2 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-black leading-4 text-slate-950">{asset.filename || asset.originalName || "Untitled asset"}</p>
          <p className="mt-0.5 truncate text-[9px] font-semibold leading-3 text-slate-400">{asset.alt || asset.url}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {meta.slice(0, 3).map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">
              {item}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function MediaAssetDetails({
  asset,
  onPatch,
  onReplace,
  onDelete,
  onDeleted,
}: {
  asset: AssetMeta | null;
  onPatch: PatchAsset;
  onReplace: ReplaceAsset;
  onDelete: (assetId: string) => Promise<void>;
  onDeleted?: () => void;
}) {
  const [replacing, setReplacing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReplacing(false);
    setConfirmingDelete(false);
    setError("");
  }, [asset?.id]);

  const canReplace = asset ? isUploadedAsset(asset) : false;

  const handleReplace = async (nextFile?: File) => {
    if (!asset || !nextFile || !canReplace) return;
    setReplacing(true);
    setError("");

    try {
      await onReplace(asset.id, nextFile);
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : "Replace failed.");
    } finally {
      setReplacing(false);
    }
  };

  const removeAsset = async () => {
    if (!asset) return;
    setError("");

    try {
      await onDelete(asset.id);
      setConfirmingDelete(false);
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
    }
  };

  if (!asset) {
    return (
      <aside className="sticky top-4 self-start rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1ecff] text-[#6d5dfc]">
          <SvgIcon name="image" className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-black text-slate-900">No asset selected</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Select an image from the library to edit alt text, folders, tags, or replace the file.</p>
      </aside>
    );
  }

  return (
    <aside className="sticky top-4 self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-3">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <MediaThumbnail asset={asset} className="aspect-[4/3] rounded-none border-0 bg-white" fit="contain" />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-600 shadow-sm">
            {getAssetSourceLabel(asset)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="mt-3 truncate text-[13px] font-black text-slate-950">{asset.filename || asset.originalName || "Untitled asset"}</p>
          <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400">{asset.url}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
          {asset.width && asset.height && <span className="rounded-full bg-slate-100 px-2 py-1">{asset.width}x{asset.height}</span>}
          {formatAssetSize(asset.size) && <span className="rounded-full bg-slate-100 px-2 py-1">{formatAssetSize(asset.size)}</span>}
          {asset.mimeType && <span className="rounded-full bg-slate-100 px-2 py-1">{asset.mimeType.replace("image/", "")}</span>}
        </div>
      </div>

      <div className="grid gap-3 p-3">
        <Field label="Alt Text">
          <TextInput value={asset.alt ?? ""} onChange={(event) => onPatch(asset.id, { alt: event.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Folder">
            <TextInput value={asset.folder ?? ""} onChange={(event) => onPatch(asset.id, { folder: event.target.value })} />
          </Field>
          <Field label="Tags">
            <TextInput value={(asset.tags ?? []).join(", ")} onChange={(event) => onPatch(asset.id, { tags: parseTagInput(event.target.value) })} />
          </Field>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-600">{error}</p>}

        {confirmingDelete ? (
          <div className="grid gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2">
            <p className="text-[10px] font-bold text-rose-700">Remove from the library? Existing pages using this URL will not be changed.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={removeAsset}
                className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-rose-700"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 transition hover:border-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(asset.url)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 transition hover:border-[#6d5dfc]/40 hover:text-[#6247ff]"
            >
              Copy
            </button>
            <label className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] transition ${
              canReplace
                ? "border-slate-200 bg-white text-slate-600 hover:border-[#6d5dfc]/40 hover:text-[#6247ff]"
                : "border-slate-100 bg-slate-50 text-slate-300"
            }`}>
              {replacing ? "..." : "Replace"}
              <input
                type="file"
                accept={imageAccept}
                disabled={!canReplace || replacing}
                onChange={(event) => {
                  void handleReplace(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MediaLibraryManager({
  graph,
  checkUrl,
  onUpload,
  onReplace,
  onPatch,
  onDelete,
}: {
  graph: ContentGraph;
  checkUrl: string;
  onUpload: UploadAsset;
  onReplace: ReplaceAsset;
  onPatch: PatchAsset;
  onDelete: (assetId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState<"newest" | "name" | "folder">("newest");
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<MediaCheckResult[]>([]);
  const [error, setError] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");

  const folders = useMemo(
    () => [...new Set(graph.assets.map((asset) => asset.folder).filter((value): value is string => Boolean(value)))].sort(),
    [graph.assets],
  );
  const sources = useMemo(
    () => [...new Set(graph.assets.map(getAssetSourceLabel))].sort(),
    [graph.assets],
  );
  const brokenResults = checkResults.filter((result) => !result.ok);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...graph.assets]
      .filter((asset) => !normalizedQuery || assetSearchText(asset).includes(normalizedQuery))
      .filter((asset) => folder === "all" || asset.folder === folder)
      .filter((asset) => source === "all" || getAssetSourceLabel(asset) === source)
      .sort((a, b) => {
        if (sort === "name") return (a.filename || a.url).localeCompare(b.filename || b.url);
        if (sort === "folder") return (a.folder || "").localeCompare(b.folder || "") || (a.filename || a.url).localeCompare(b.filename || b.url);
        return (Date.parse(b.updatedAt || b.createdAt || "") || 0) - (Date.parse(a.updatedAt || a.createdAt || "") || 0);
      });
  }, [folder, graph.assets, query, sort, source]);
  const selectedAsset = filteredAssets.find((asset) => asset.id === selectedAssetId) ?? filteredAssets[0] ?? null;

  const checkMediaUrls = async () => {
    setChecking(true);
    setError("");

    try {
      const response = await fetch(checkUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ graph }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "URL check failed.");
      }

      setCheckResults(payload.results ?? []);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "URL check failed.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e7ec] px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#101828]">Media</h1>
            <span className="rounded-full bg-[#eef1f5] px-2.5 py-1 text-xs font-medium text-[#667085]">
              {graph.assets.length} asset{graph.assets.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-[#eef1f5] px-2.5 py-1 text-xs font-medium text-[#667085]">
              {folders.length} folder{folders.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#667085]">Upload, organize, replace, and reuse images across the website.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUploader((current) => !current)}
            className="h-10 rounded-lg bg-[#6d5dfc] px-4 text-sm font-medium text-white transition hover:bg-[#5947e8]"
          >
            {showUploader ? "Close upload" : "Upload asset"}
          </button>
          <button
            type="button"
            onClick={checkMediaUrls}
            disabled={checking}
            className="h-10 rounded-lg border border-[#d9dee7] bg-white px-4 text-sm font-medium text-[#475467] transition hover:border-[#b9adff] hover:text-[#4f3fe0] disabled:opacity-50"
          >
            {checking ? "Checking" : "Check URLs"}
          </button>
        </div>
      </div>

      {showUploader && (
        <div className="border-b border-slate-200 bg-slate-50/70 p-4">
          <div className="max-w-2xl">
            <MediaUploadForm
              onUpload={onUpload}
              onUploaded={(asset) => {
                setSelectedAssetId(asset.id);
                setShowUploader(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 bg-white p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_170px_160px_150px]">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search filename, alt, tag, URL..." />
          <select className={selectChromeClass} value={folder} onChange={(event) => setFolder(event.target.value)}>
            <option value="all">All folders</option>
            {folders.map((folderName) => <option key={folderName} value={folderName}>{folderName}</option>)}
          </select>
          <select className={selectChromeClass} value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="all">All sources</option>
            {sources.map((sourceName) => <option key={sourceName} value={sourceName}>{sourceName}</option>)}
          </select>
          <select className={selectChromeClass} value={sort} onChange={(event) => setSort(event.target.value as "newest" | "name" | "folder")}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="folder">Folder</option>
          </select>
        </div>
        {folders.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFolder("all")}
              className={`rounded-full px-3 py-1 text-[10px] font-black transition ${
                folder === "all" ? "bg-[#6d5dfc] text-white" : "bg-slate-100 text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            {folders.slice(0, 8).map((folderName) => (
              <button
                type="button"
                key={folderName}
                onClick={() => setFolder(folderName)}
                className={`rounded-full px-3 py-1 text-[10px] font-black transition ${
                  folder === folderName ? "bg-[#6d5dfc] text-white" : "bg-slate-100 text-slate-500 hover:text-slate-800"
                }`}
              >
                {folderName}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">{error}</p>}
      {checkResults.length > 0 && (
        <div className={`border-b px-5 py-3 text-sm font-semibold ${
          brokenResults.length > 0
            ? "border-amber-100 bg-amber-50 text-amber-800"
            : "border-emerald-100 bg-emerald-50 text-emerald-800"
        }`}>
          {brokenResults.length > 0
            ? `${brokenResults.length} media URL${brokenResults.length === 1 ? "" : "s"} need attention.`
            : `${checkResults.length} media URL${checkResults.length === 1 ? "" : "s"} checked successfully.`}
          {brokenResults.length > 0 && (
            <div className="mt-2 grid gap-1">
              {brokenResults.slice(0, 5).map((result) => (
                <p key={`${result.url}-${result.label}`} className="truncate text-xs">
                  {result.label}: {result.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 bg-slate-50/60 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              {filteredAssets.length} shown
            </p>
            <p className="text-[10px] font-bold text-slate-400">Select an asset to edit details.</p>
          </div>

          {filteredAssets.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
              {filteredAssets.map((asset) => (
                <MediaAssetTile
                  key={asset.id}
                  asset={asset}
                  selected={selectedAsset?.id === asset.id}
                  onSelect={() => setSelectedAssetId(asset.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1ecff] text-[#6d5dfc] shadow-sm">
                <SvgIcon name="image" className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-black text-slate-800">
                {graph.assets.length === 0 ? "No media yet." : "No media matches this search."}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {graph.assets.length === 0 ? "Upload an image to start the library." : "Try a different search, folder, or source filter."}
              </p>
            </div>
          )}
        </section>

        <MediaAssetDetails
          asset={selectedAsset}
          onPatch={onPatch}
          onReplace={onReplace}
          onDelete={onDelete}
          onDeleted={() => setSelectedAssetId("")}
        />
      </div>
    </div>
  );
}
