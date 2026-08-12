import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
export const RESOURCE_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'resources');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export function ensureResourceUploadDir() {
  fs.mkdirSync(RESOURCE_UPLOADS_DIR, { recursive: true });
}

/**
 * Persist a data-URL / raw base64 image and return the public URL path.
 * @param {string} dataUrl
 * @param {string} [originalName]
 * @returns {{ url: string, filename: string, mime: string, bytes: number }}
 */
export function saveResourceImageDataUrl(dataUrl, originalName = '') {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    const err = new Error('Image must be a valid image data URL.');
    err.status = 400;
    throw err;
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    const err = new Error('Only JPEG, PNG, GIF, or WebP images are allowed.');
    err.status = 400;
    throw err;
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) {
    const err = new Error('Image data is empty.');
    err.status = 400;
    throw err;
  }
  if (buffer.length > 5 * 1024 * 1024) {
    const err = new Error('Image must be 5 MB or smaller.');
    err.status = 400;
    throw err;
  }

  ensureResourceUploadDir();
  const extFromName = path.extname(String(originalName || '')).toLowerCase();
  const ext = EXT_BY_MIME[mime] || (extFromName && extFromName.length <= 5 ? extFromName : '.img');
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const absolute = path.join(RESOURCE_UPLOADS_DIR, filename);
  fs.writeFileSync(absolute, buffer);

  return {
    url: `/uploads/resources/${filename}`,
    filename,
    mime,
    bytes: buffer.length,
  };
}
