import { useRef, useState } from "react";
import { CloudArrowUpIcon, DocumentIcon } from "@heroicons/react/24/outline";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "@/services/processors/documentProcessor";

export function StatementUploadZone({
  onFiles,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFiles = (files: FileList | null) => {
    if (files?.length) onFiles(Array.from(files));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) selectFiles(event.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors ${
        dragging ? "border-accent-primary bg-accent-primary/5" : "border-border bg-surface hover:border-accent-primary/60"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-secondary">
        <CloudArrowUpIcon className="size-6" />
      </span>
      <span>
        <span className="block text-sm font-semibold">Drop a statement here or browse</span>
        <span className="mt-1 block text-xs text-ink-muted">
          Digital PDFs, CSV, XLSX, XLS, or images (JPG/PNG) · up to {MAX_FILE_SIZE / 1024 / 1024} MB per file
        </span>
      </span>
      <span className="flex flex-wrap justify-center gap-2">
        {ALLOWED_EXTENSIONS.map((extension) => (
          <span key={extension} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] uppercase text-ink-muted">
            <DocumentIcon className="size-3" />
            {extension.slice(1)}
          </span>
        ))}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(event) => {
          selectFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
