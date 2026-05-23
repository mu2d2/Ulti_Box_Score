import React, { useEffect, useRef } from "react";

/**
 * Modal popup for point commit results.
 *
 * Intentionally decoupled from live-entry stats and game state — it only
 * receives pre-computed display data from the caller.
 *
 * @param {{ type: "success" | "error", title: string, lines: string[], onClose: () => void }} props
 *   type    - "success" for a valid commit, "error" for an invalid selection.
 *   title   - Heading text for the popup.
 *   lines   - Body lines (updated score for success, error messages for error).
 *   onClose - Callback when the user dismisses the popup.
 */
export function PointCommitPopup({ type, title, lines, onClose }) {
  const closeRef = useRef(null);

  // Trap focus on the close button so keyboard users can dismiss immediately.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Allow Escape key to dismiss.
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="point-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="point-popup-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`point-popup-card point-popup-card-${type}`}>
        <h2 id="point-popup-title" className="point-popup-title">
          {title}
        </h2>
        <ul className="point-popup-lines">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <button
          ref={closeRef}
          type="button"
          className="point-popup-close"
          onClick={onClose}
        >
          {type === "error" ? "Go back and fix" : "OK"}
        </button>
      </div>
    </div>
  );
}
