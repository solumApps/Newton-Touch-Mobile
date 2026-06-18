/**
 * Lightweight symmetric encryption shared by the mobile app (encrypt) and the
 * LCD app (decrypt) to protect the SOLUM credentials in transit / at rest.
 *
 * AES-256-GCM via the Web Crypto API (available in both Capacitor webviews —
 * they run in a secure context). A 12-byte random IV is generated per payload
 * and prepended to the ciphertext; the whole thing is base64-encoded and tagged
 * with an "enc:" prefix so the receiver can tell encrypted from plaintext.
 *
 * NOTE: the key is derived from a constant shared secret compiled into both
 * apps. This protects the credentials over the LAN transfer and on disk from
 * casual inspection; it is obfuscation, not a server-grade secret. Keep the two
 * SHARED_SECRET values identical across the apps.
 */
const SHARED_SECRET = 'NewtonTouch-ESL-v1::credential-key';
const PREFIX = 'enc:';

async function aesKey(): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SHARED_SECRET));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Encrypt a string → "enc:<base64(iv|ciphertext)>". Empty input stays empty. */
export async function encryptText(plain: string): Promise<string> {
  if (!plain) return '';
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  const buf = new Uint8Array(iv.length + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), iv.length);
  return PREFIX + toB64(buf);
}

/** Decrypt an "enc:"-prefixed string. Returns plaintext input unchanged. */
export async function decryptText(payload: string): Promise<string> {
  if (!payload || !payload.startsWith(PREFIX)) return payload || '';
  try {
    const raw = fromB64(payload.slice(PREFIX.length));
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const key = await aesKey();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return ''; // tampered / wrong key
  }
}
