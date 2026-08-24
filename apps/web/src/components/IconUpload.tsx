import { useRef } from "react";

export function IconUpload({
  iconUrl,
  alt,
  onUpload,
  busy,
  size = 32,
}: {
  iconUrl: string | null;
  alt: string;
  onUpload: (file: File) => void;
  busy?: boolean;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label
      className="relative inline-block cursor-pointer overflow-hidden rounded-full border border-slate-300 bg-slate-100"
      style={{ width: size, height: size }}
      title={busy ? "Uploading..." : "Change icon"}
    >
      {iconUrl ? (
        <img src={iconUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">?</span>
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] text-slate-600">
          ...
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </label>
  );
}

export function Icon({ iconUrl, alt, size = 24 }: { iconUrl: string | null; alt: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 align-middle"
      style={{ width: size, height: size }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">?</span>
      )}
    </span>
  );
}
