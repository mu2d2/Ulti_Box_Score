const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function base64UrlToBase64(value) {
  const withStandardAlphabet = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (withStandardAlphabet.length % 4)) % 4;
  return `${withStandardAlphabet}${"=".repeat(padLength)}`;
}

export function decodeJwtPayload(jwt) {
  const parts = (jwt || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const payload = atob(base64UrlToBase64(parts[1]));
  return JSON.parse(payload);
}

export function createNonce() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashSha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  const digestBytes = Array.from(new Uint8Array(digest));
  return digestBytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

export function initializeGoogleSignIn({ clientId, nonce, onCredential, buttonElement }) {
  if (!window.google?.accounts?.id) {
    throw new Error("Google Identity Services is unavailable");
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
    nonce,
    ux_mode: "popup",
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  window.google.accounts.id.renderButton(buttonElement, {
    type: "standard",
    shape: "pill",
    theme: "outline",
    text: "signin_with",
    size: "large",
    width: 280,
  });
}
