// src/utils/storage.js

/**
 * Gemmer JSON-værdi med absolut udløbstid (TTL).
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs  millisekunder
 */
export function setWithTTL(key, value, ttlMs) {
  const now = Date.now();
  const payload = {
    v: value,
    expiresAt: now + (ttlMs ?? 0),
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

/**
 * Henter JSON-værdi gemt med TTL. Returnerer null hvis udløbet/mangler.
 * @param {string} key
 */
export function getWithTTL(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { v, expiresAt } = parsed;
    if (typeof expiresAt === "number" && Date.now() > expiresAt) {
      // udløbet: ryd
      localStorage.removeItem(key);
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

/**
 * Sætter ren JSON uden TTL (persistent).
 */
export function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Henter ren JSON uden TTL (persistent).
 * fallback bruges hvis key ikke findes.
 */
export function getJSON(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Fjerner item sikkert.
 */
export function del(key) {
  localStorage.removeItem(key);
}
