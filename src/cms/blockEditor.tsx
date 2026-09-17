import { useEffect, useId, useState, type MouseEvent, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cloneBlockValue, getBlockDefinition, type BlockEditorField } from "../blocks/registry";
import { blockLabels, blockShortLabels } from "./constants";
import { emptyRichTextDoc } from "./contentUtils";
import { SvgIcon } from "./icons";
import { MediaPickerField } from "./media/MediaLibrary";
import { Field, TextArea, TextInput, selectChromeClass } from "./ui";
import type { AssetMeta, BlockData, FieldDefinition, FieldType } from "../../types";

export function SortableBlockButton({
  block,
  active,
  onSelect,
  onRemove,
}: {
  block: BlockData;
  active: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group grid min-w-0 grid-cols-[22px_28px_minmax(0,1fr)_32px] items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-1 transition ${
        active
          ? "bg-[#f1ecff] text-[#6247ff] ring-1 ring-[#c7b8ff]"
          : "text-[#344054] hover:bg-[#f8fafc]"
      } ${isDragging ? "z-20 scale-[1.02] opacity-95 shadow-xl ring-2 ring-[#c7b8ff]" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${blockLabels[block.type as keyof typeof blockLabels] ?? block.type} block`}
        title="Drag to reorder"
        className={`grid h-7 w-5 cursor-grab place-items-center rounded-md border transition active:cursor-grabbing ${
          isDragging
            ? "border-[#6d5dfc] bg-[#6d5dfc] text-white shadow-sm"
            : active
              ? "border-[#d8d0ff] bg-white/55 text-[#7665c9] hover:border-[#b9aaff] hover:bg-white"
              : "border-transparent bg-transparent text-[#8d99aa] hover:border-[#d0d5dd] hover:bg-white hover:text-[#6247ff]"
        }`}
      >
        <SvgIcon name="grip" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className={`grid h-7 w-7 place-items-center rounded-md text-[10px] font-black transition ${
          active ? "bg-[#6d5dfc] text-white" : "bg-[#f1f3f7] text-[#667085]"
        }`}
      >
        {blockShortLabels[block.type as keyof typeof blockShortLabels] ?? String(block.type).slice(0, 2)}
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 overflow-hidden text-left">
        <span className="block truncate text-[12px] font-bold tracking-[-0.02em]">{blockLabels[block.type as keyof typeof blockLabels] ?? block.type}</span>
      </button>
      <span className={`flex items-center justify-end gap-0.5 transition ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}>
        <span className="text-[#98a2b3]" aria-hidden="true">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-[#98a2b3] transition hover:bg-rose-50 hover:text-rose-600"
            aria-label={`Remove ${blockLabels[block.type as keyof typeof blockLabels] ?? block.type} section`}
            title="Remove section"
          >
            <SvgIcon name="trash" className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const content = value?.type === "doc" ? value : emptyRichTextDoc;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      LinkExtension.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Write structured rich text...",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "min-h-[220px] max-w-none overflow-hidden rounded-b-xl bg-white px-3.5 py-3 text-[13px] leading-6 text-slate-800 outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextContent = value?.type === "doc" ? value : emptyRichTextDoc;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) {
      editor.commands.setContent(nextContent, false);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[220px] rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-bold text-slate-400">
        Loading editor...
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL", previousUrl);
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const buttonClass = (active = false) =>
    `grid h-8 min-w-8 place-items-center rounded-md px-2 text-[10px] font-semibold transition ${
      active ? "bg-violet-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
    }`;

  const textStyle = editor.isActive("heading", { level: 2 }) ? "2"
    : editor.isActive("heading", { level: 3 }) ? "3"
      : editor.isActive("heading", { level: 4 }) ? "4"
        : editor.isActive("heading", { level: 5 }) ? "5"
          : "paragraph";

  const setTextStyle = (style: string) => {
    if (style === "paragraph") editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(style) as 2 | 3 | 4 | 5 }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-2">
        <div className="flex flex-wrap items-center gap-1">
          <select value={textStyle} onChange={(event) => setTextStyle(event.target.value)} aria-label="Text style" className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
            <option value="paragraph">Paragraph</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
            <option value="5">Heading 5</option>
          </select>
          <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />
          <button type="button" title="Bold" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive("bold"))}><strong>B</strong></button>
          <button type="button" title="Italic" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive("italic"))}><em>I</em></button>
          <button type="button" title="Underline" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleUnderline().run()} className={buttonClass(editor.isActive("underline"))}><span className="underline">U</span></button>
          <button type="button" title="Link" onMouseDown={keepEditorSelection} onClick={setLink} className={buttonClass(editor.isActive("link"))}>Link</button>
          <button type="button" title="Bullet list" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive("bulletList"))}>• List</button>
          <button type="button" title="Numbered list" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive("orderedList"))}>1. List</button>
          <button type="button" title="Quote" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleBlockquote().run()} className={buttonClass(editor.isActive("blockquote"))}>Quote</button>
          <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />
          <button type="button" title="Undo" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${buttonClass()} disabled:opacity-30`}>↶</button>
          <button type="button" title="Redo" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${buttonClass()} disabled:opacity-30`}>↷</button>
        </div>
        <details className="mt-1.5">
          <summary className="w-fit cursor-pointer rounded-md px-1 py-0.5 text-[9px] font-semibold text-slate-500 hover:text-slate-900">More formatting</summary>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button type="button" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleStrike().run()} className={buttonClass(editor.isActive("strike"))}>Strike</button>
            <button type="button" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleCode().run()} className={buttonClass(editor.isActive("code"))}>Code</button>
            <button type="button" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleSubscript().run()} className={buttonClass(editor.isActive("subscript"))}>Sub</button>
            <button type="button" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().toggleSuperscript().run()} className={buttonClass(editor.isActive("superscript"))}>Sup</button>
            <button type="button" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().setHorizontalRule().run()} className={buttonClass()}>Rule</button>
          </div>
        </details>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function BlockManualFields({
  block,
  onPatch,
  assets = [],
  onUploadAsset,
  onFocusField,
  activeFieldPath,
  fieldPathPrefix,
}: {
  block: BlockData;
  onPatch: (updater: (block: BlockData) => void) => void;
  assets?: AssetMeta[];
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
  fieldPathPrefix?: string;
}) {
  const content = block.content ?? {};
  const definition = getBlockDefinition(block.type);
  const updateContent = (updates: Record<string, any>) => {
    onPatch((draft) => {
      draft.content = { ...draft.content, ...updates };
    });
  };

  if (!definition) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-bold text-rose-700">
        No registered editor fields for {block.type}.
      </div>
    );
  }

  return (
    <BlockContentFields
      fields={definition.fields}
      content={content}
      onChange={(fieldId, value) => updateContent({ [fieldId]: value })}
      assets={assets}
      onUploadAsset={onUploadAsset}
      onFocusField={onFocusField}
      activeFieldPath={activeFieldPath}
      fieldPathPrefix={fieldPathPrefix}
    />
  );
}

const normalizeRepeaterItems = (items: unknown) =>
  (Array.isArray(items) ? items : []).map((item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? item as Record<string, any>
      : { value: item },
  );

const fieldInputType = (type: FieldType) =>
  type === "number" ? "number" : type === "date" ? "date" : type === "url" || type === "image" ? "url" : "text";

export function BlockContentFields({
  fields,
  content,
  onChange,
  assets = [],
  onUploadAsset,
  onFocusField,
  activeFieldPath,
  fieldPathPrefix,
}: {
  fields: BlockEditorField[];
  content: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  assets?: AssetMeta[];
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
  fieldPathPrefix?: string;
}) {
  return (
    <div className="grid w-full min-w-0 gap-3">
      {fields.map((field) => {
        const fieldPath = fieldPathPrefix ? `${fieldPathPrefix}/${field.id}` : field.id;

        return (
          <div
            key={field.id}
            className={activeFieldPath === fieldPath
              ? "relative z-[1] min-w-0 rounded-lg bg-violet-50/70 ring-1 ring-inset ring-violet-200 transition"
              : "min-w-0 rounded-lg transition"}
            data-cms-editor-field={fieldPath}
            data-cms-editor-field-active={activeFieldPath === fieldPath ? "true" : undefined}
            onFocusCapture={() => onFocusField?.(fieldPath)}
          >
            <Field label={`${field.label}${field.required ? " *" : ""}`}>
              <BlockFieldInput
                field={field}
                fieldPath={fieldPath}
                value={content[field.id]}
                onChange={(value) => onChange(field.id, value)}
                assets={assets}
                onUploadAsset={onUploadAsset}
                onFocusField={onFocusField}
                activeFieldPath={activeFieldPath}
              />
              {field.type !== "select" && "helpText" in field && field.helpText && (
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{field.helpText}</p>
              )}
            </Field>
          </div>
        );
      })}
    </div>
  );
}

function BlockScalarFieldInput({
  field,
  value,
  onChange,
  assets = [],
  onUploadAsset,
}: {
  field: Exclude<BlockEditorField, { type: "repeater" }>;
  value: any;
  onChange: (value: any) => void;
  assets?: AssetMeta[];
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
}) {
  if (field.type === "select") {
    return (
      <div className="grid gap-1.5">
        <select
          className={selectChromeClass}
          value={String(value ?? field.options[0]?.value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {field.helpText && <p className="text-[10px] leading-4 text-slate-500">{field.helpText}</p>}
      </div>
    );
  }

  if (field.type === "richText") {
    return <RichTextEditor value={value} onChange={onChange} />;
  }

  if (field.type === "textarea") {
    return (
      <TextArea
        rows={field.rows ?? 4}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
        <input className="h-4 w-4 accent-teal-600" type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        Enabled
      </label>
    );
  }

  if (field.type === "image") {
    return (
      <MediaPickerField
        value={String(value ?? "")}
        onChange={onChange}
        assets={assets ?? []}
        onUploadAsset={onUploadAsset}
      />
    );
  }

  return (
    <TextInput
      type={fieldInputType(field.type)}
      value={value ?? ""}
      onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
      placeholder={field.placeholder}
    />
  );
}

function BlockFieldInput({
  field,
  fieldPath,
  value,
  onChange,
  assets = [],
  onUploadAsset,
  onFocusField,
  activeFieldPath,
}: {
  field: BlockEditorField;
  fieldPath: string;
  value: any;
  onChange: (value: any) => void;
  assets?: AssetMeta[];
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
}) {
  if (field.type !== "repeater") {
    return <BlockScalarFieldInput field={field} value={value} onChange={onChange} assets={assets} onUploadAsset={onUploadAsset} />;
  }

  return (
    <Repeater
      items={normalizeRepeaterItems(value)}
      addLabel={field.addLabel}
      createItem={() => cloneBlockValue(field.defaultItem)}
      onChange={onChange}
      activeItemIndex={activeFieldPath?.startsWith(`${fieldPath}.`)
        ? Number(activeFieldPath.slice(`${fieldPath}.`.length).split(".")[0])
        : undefined}
      renderItem={(item, setItem, itemIndex) => (
        <div className="grid min-w-0 gap-3">
          {field.fields.map((childField) => {
            const childPath = `${fieldPath}.${itemIndex}.${childField.id}`;
            return (
            <div
              key={childField.id}
              className={`grid min-w-0 gap-1.5 rounded-md transition ${
                activeFieldPath === childPath
                  ? "relative z-[1] bg-violet-50/70 ring-1 ring-inset ring-violet-200"
                  : ""
              }`}
              data-cms-editor-field={childPath}
              data-cms-editor-field-active={activeFieldPath === childPath ? "true" : undefined}
              onFocusCapture={() => onFocusField?.(childPath)}
            >
              <span className="text-[11px] font-medium leading-4 text-slate-600">{childField.label}</span>
              <BlockScalarFieldInput
                field={childField}
                value={item[childField.id]}
                onChange={(nextValue) => setItem({ ...item, [childField.id]: nextValue })}
                assets={assets}
                onUploadAsset={onUploadAsset}
              />
            </div>
          )})}
        </div>
      )}
    />
  );
}

export function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  onPatch,
  onRemove,
  onDuplicate,
  onMove,
}: {
  block: BlockData;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onPatch: (updater: (block: BlockData) => void) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const definition = getBlockDefinition(block.type);
  const updateContent = (updates: Record<string, any>) => {
    onPatch((draft) => {
      draft.content = { ...draft.content, ...updates };
    });
  };

  const content = block.content ?? {};

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">Block {index + 1}</p>
          <h4 className="text-[12px] font-semibold text-slate-950">{definition?.label ?? block.type.replace("_", " ")}</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={isFirst} onClick={() => onMove(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-30">Up</button>
          <button disabled={isLast} onClick={() => onMove(1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-30">Down</button>
          <button onClick={onDuplicate} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 transition hover:border-teal-300 hover:text-teal-700">Duplicate</button>
          <button onClick={onRemove} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100">Remove</button>
        </div>
      </div>

      {definition ? (
        <BlockContentFields
          fields={definition.fields}
          content={content}
          onChange={(fieldId, value) => updateContent({ [fieldId]: value })}
        />
      ) : (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-bold text-rose-700">
          No registered editor fields for {block.type}.
        </div>
      )}
    </div>
  );
}

export function CreateModalField({
  id,
  label,
  required = false,
  error = "",
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition ${
      error ? "border-rose-200 bg-rose-50/60" : "border-slate-200/80 bg-white"
    }`}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[11px] font-semibold text-slate-700">
          {label}
        </label>
        {required && (
          <span className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${error ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
            Required
          </span>
        )}
      </div>
      <div className="mt-2">
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-center gap-2 text-[11px] font-bold text-rose-700">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function FieldValueInput({
  field,
  value,
  onChange,
  assets = [],
  onUploadAsset,
  inputId,
  required = false,
  invalid = false,
  describedBy,
  className = "",
}: {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  assets?: AssetMeta[];
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  inputId?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  if (field.type === "textarea" || field.type === "richText") {
    return (
      <TextArea
        id={inputId}
        rows={4}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <div className={`flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] ${className}`}>
        <input
          id={inputId}
          className="h-4 w-4 accent-teal-600"
          type="checkbox"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <label htmlFor={inputId}>Enabled</label>
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <MediaPickerField
        value={String(value ?? "")}
        onChange={onChange}
        assets={assets ?? []}
        onUploadAsset={onUploadAsset}
      />
    );
  }

  const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text";

  return (
    <TextInput
      id={inputId}
      type={inputType}
      required={required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      value={value ?? ""}
      onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
      className={className}
    />
  );
}

export function Repeater<T extends Record<string, any>>({
  items,
  addLabel,
  createItem,
  onChange,
  renderItem,
  activeItemIndex,
}: {
  items: T[];
  addLabel: string;
  createItem: () => T;
  onChange: (items: T[]) => void;
  renderItem: (item: T, setItem: (item: T) => void, index: number) => ReactNode;
  activeItemIndex?: number;
}) {
  const repeaterId = useId();
  const validActiveIndex = Number.isInteger(activeItemIndex) && Number(activeItemIndex) >= 0 && Number(activeItemIndex) < items.length
    ? Number(activeItemIndex)
    : undefined;
  const [openIndex, setOpenIndex] = useState<number | null>(validActiveIndex ?? (items.length > 0 ? 0 : null));

  useEffect(() => {
    if (validActiveIndex !== undefined) setOpenIndex(validActiveIndex);
  }, [validActiveIndex]);

  useEffect(() => {
    if (items.length === 0) {
      setOpenIndex(null);
      return;
    }
    setOpenIndex((current) => current === null ? current : Math.min(current, items.length - 1));
  }, [items.length]);

  const itemSummary = (item: T) => {
    const primaryKeys = ["title", "label", "name", "heading", "text", "value"];
    const primary = primaryKeys
      .map((key) => item[key])
      .find((candidate) => typeof candidate === "string" && candidate.trim());
    const secondaryKeys = ["href", "link", "url", "description", "eyebrow"];
    const secondary = secondaryKeys
      .map((key) => item[key])
      .find((candidate) => typeof candidate === "string" && candidate.trim() && candidate !== primary);
    const image = ["image", "photo", "thumbnail", "imageUrl", "src"]
      .map((key) => item[key])
      .find((candidate) => typeof candidate === "string" && candidate.trim());

    return {
      primary: String(primary || "Untitled item"),
      secondary: secondary ? String(secondary) : "",
      image: image ? String(image) : "",
    };
  };

  return (
    <div className="w-full min-w-0 space-y-2">
      {items.map((item, index) => {
        const open = openIndex === index;
        const selected = validActiveIndex === index;
        const summary = itemSummary(item);
        const contentId = `${repeaterId}-item-${index}`;

        return (
          <div
            key={index}
            className={`w-full min-w-0 overflow-hidden rounded-lg border bg-white transition ${
              selected ? "border-violet-300 ring-1 ring-violet-100" : open ? "border-slate-300" : "border-slate-200 hover:border-slate-300"
            }`}
            data-cms-editor-item-active={selected ? "true" : undefined}
          >
            <div className="flex min-w-0 items-center gap-2 px-2 py-2">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={contentId}
                onClick={() => setOpenIndex((current) => current === index ? null : index)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                {summary.image ? (
                  <img src={summary.image} alt="" className="h-9 w-9 shrink-0 rounded-md border border-slate-200 object-cover" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-500">
                    {index + 1}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold leading-4 text-slate-800">{summary.primary}</span>
                  <span className="block truncate text-[9px] leading-4 text-slate-500">
                    {summary.secondary || `Item ${index + 1}`}
                  </span>
                </span>
                <SvgIcon name="chevronRight" className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-90" : ""}`} />
              </button>
              <button
                type="button"
                aria-label={`Remove ${summary.primary}`}
                title="Remove item"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                <SvgIcon name="trash" className="h-4 w-4" />
              </button>
            </div>
            {open && (
              <div id={contentId} className="min-w-0 border-t border-slate-100 bg-slate-50/50 p-3">
                {renderItem(item, (nextItem) => onChange(items.map((candidate, itemIndex) => itemIndex === index ? nextItem : candidate)), index)}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          onChange([...items, createItem()]);
          setOpenIndex(items.length);
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      >
        <SvgIcon name="plus" className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}
