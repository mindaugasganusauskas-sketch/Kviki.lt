"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import type { PhotoDTO } from "@/shared/types";
import { useI18n } from "@/i18n/client";

export const MAX_PHOTOS = 6;

/** Sumažina nuotrauką telefone prieš siunčiant – kaime mobilusis ryšys būna lėtas. */
async function downscale(file: File): Promise<File> {
  try {
    if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PhotoPicker({
  files,
  onFiles,
  existing = [],
  removedIds = [],
  onToggleExisting,
}: {
  files: File[];
  onFiles: (files: File[]) => void;
  existing?: PhotoDTO[];
  removedIds?: string[];
  onToggleExisting?: (id: string) => void;
}) {
  const { t } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const keptExisting = existing.filter((p) => !removedIds.includes(p.id));
  const room = MAX_PHOTOS - keptExisting.length - files.length;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const picked = Array.from(list).slice(0, Math.max(0, room));
    const processed = await Promise.all(picked.map(downscale));
    onFiles([...files, ...processed]);
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={room <= 0 || busy}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-paper disabled:opacity-50"
        >
          <Camera className="size-5 text-brand-600" aria-hidden /> {t.photos.camera}
        </button>
        <button
          type="button"
          disabled={room <= 0 || busy}
          onClick={() => galleryRef.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-paper disabled:opacity-50"
        >
          <ImagePlus className="size-5 text-brand-600" aria-hidden /> {t.photos.gallery}
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
          aria-label={t.photos.camera}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          data-testid="photo-input"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
          aria-label={t.photos.choose}
        />
      </div>
      {(keptExisting.length > 0 || files.length > 0 || existing.length > 0) && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {existing.map((p) => {
            const removed = removedIds.includes(p.id);
            return (
              <li key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className={`size-24 rounded-xl border border-line object-cover ${removed ? "opacity-30" : ""}`} />
                <button
                  type="button"
                  onClick={() => onToggleExisting?.(p.id)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 shadow ring-1 ring-line"
                  aria-label={removed ? t.photos.restore : t.photos.remove}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
          {previews.map((url, i) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={t.photos.newPhoto(i + 1)} className="size-24 rounded-xl border border-line object-cover" />
              <button
                type="button"
                onClick={() => onFiles(files.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 shadow ring-1 ring-line"
                aria-label={t.photos.remove}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted">
        {t.photos.hint(MAX_PHOTOS)}
      </p>
    </div>
  );
}
