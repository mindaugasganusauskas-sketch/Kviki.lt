import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "@/server/errors";

export const MAX_PHOTOS = 6;
const MAX_BYTES = 15 * 1024 * 1024;

export interface ProcessedPhoto {
  id: string;
  fileName: string;
  buffer: Buffer;
  width: number;
  height: number;
}

function uploadRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Katalogo kelias tik iš patikrinto UUID – kad niekas negalėtų rašyti už įkėlimų katalogo ribų. */
function requestDir(requestId: string): string {
  if (!isUuid(requestId)) throw new AppError("VALIDATION", "Neteisingas užklausos identifikatorius");
  return path.join(/*turbopackIgnore: true*/ uploadRoot(), requestId);
}

/**
 * Sumažina nuotrauką, pasuka pagal EXIF ir išsaugo kaip JPEG.
 * „sharp“ pagal nutylėjimą neperkelia metaduomenų, todėl GPS koordinatės iš telefono nuotraukos pašalinamos.
 */
export async function processPhotos(files: File[]): Promise<ProcessedPhoto[]> {
  const real = files.filter((f) => f && f.size > 0);
  if (real.length > MAX_PHOTOS) throw new AppError("VALIDATION", `Galima pridėti iki ${MAX_PHOTOS} nuotraukų`);
  const out: ProcessedPhoto[] = [];
  for (const file of real) {
    if (file.size > MAX_BYTES) throw new AppError("VALIDATION", "Nuotrauka per didelė (daugiausia 15 MB)");
    if (file.type && !file.type.startsWith("image/")) throw new AppError("VALIDATION", "Galima įkelti tik nuotraukas");
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const { data, info } = await sharp(input, { failOn: "error" })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      const id = randomUUID();
      out.push({ id, fileName: `${id}.jpg`, buffer: data, width: info.width, height: info.height });
    } catch {
      throw new AppError("VALIDATION", "Nepavyko perskaityti nuotraukos. Naudokite JPG, PNG arba WEBP.");
    }
  }
  return out;
}

export async function storePhotos(requestId: string, photos: ProcessedPhoto[]): Promise<void> {
  if (!photos.length) return;
  const dir = requestDir(requestId);
  await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
  await Promise.all(photos.map((p) => writeFile(/*turbopackIgnore: true*/ path.join(dir, p.fileName), p.buffer)));
}

export async function deletePhotoFiles(requestId: string, fileNames?: string[]): Promise<void> {
  const dir = requestDir(requestId);
  if (!fileNames) {
    await rm(/*turbopackIgnore: true*/ dir, { recursive: true, force: true });
    return;
  }
  await Promise.all(fileNames.map((f) => rm(/*turbopackIgnore: true*/ path.join(dir, path.basename(f)), { force: true })));
}

export async function readPhotoFile(requestId: string, fileName: string): Promise<Buffer | null> {
  try {
    return await readFile(/*turbopackIgnore: true*/ path.join(requestDir(requestId), path.basename(fileName)));
  } catch {
    return null;
  }
}
