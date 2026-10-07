"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toConfig, DEFAULT_POSITION } from "@/data/spotlight";

// Dev-only panel for reordering the Spotlight and setting each piece's crop.
// Save writes src/data/spotlight.json through the dev-only API route.

const MOBILE_COUNT = 12;

export function parsePosition(position) {
  const [x, y] = (position || DEFAULT_POSITION)
    .split(" ")
    .map((v) => parseFloat(v));
  return { x, y };
}

export function formatPosition({ x, y }) {
  const clamp = (v) => Math.round(Math.min(100, Math.max(0, v)));
  return `${clamp(x)}% ${clamp(y)}%`;
}

export default function SpotlightEditor({
  items,
  setItems,
  savedItems,
  setSavedItems,
  focused,
  setFocused,
  onClose,
}) {
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [status, setStatus] = useState("");

  const dirty =
    JSON.stringify(toConfig(items)) !== JSON.stringify(toConfig(savedItems));
  const current = items[focused];
  const { x, y } = parsePosition(current?.position);

  const move = (from, to) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    // Keep the same artwork selected after it moves.
    const selectedTitle = items[focused].title;
    setFocused(next.findIndex((a) => a.title === selectedTitle));
  };

  const setPosition = (pos) => {
    setItems(
      items.map((a, i) =>
        i === focused ? { ...a, position: formatPosition(pos) } : a,
      ),
    );
  };

  const save = async () => {
    setStatus("Saving…");
    try {
      const res = await fetch("/api/spotlight/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toConfig(items)),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSavedItems(items);
      setStatus("Saved to spotlight.json");
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    }
  };

  const reset = () => {
    setItems(savedItems);
    setFocused(0);
    setStatus("");
  };

  return createPortal(
    <div className="sp-editor" role="dialog" aria-label="Spotlight editor">
      <div className="sp-editor-head">
        <strong>Edit spotlight</strong>
        <span>
          Drag thumbnails to reorder · first {MOBILE_COUNT} show on phones ·
          drag the big image to reposition it
        </span>
        <button type="button" onClick={onClose} aria-label="Close editor">
          ✕
        </button>
      </div>

      <div className="sp-editor-body">
        <ol className="sp-editor-thumbs">
          {items.map((art, i) => (
            <li
              key={art.title}
              draggable
              className={[
                i === focused && "is-selected",
                i === dragOver && dragFrom !== i && "is-drop-target",
                i === MOBILE_COUNT - 1 && "is-mobile-cutoff",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setFocused(i)}
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                move(dragFrom, i);
                setFocused(i);
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              title={art.title}
            >
              <img
                src={art.src}
                alt={art.title}
                style={{ objectPosition: art.position }}
                draggable={false}
              />
              <span>{i + 1}</span>
            </li>
          ))}
        </ol>

        {current && (
          <div className="sp-editor-controls">
            <p className="sp-editor-title">
              {focused + 1}. {current.title}
            </p>

            <div className="sp-editor-move">
              <button
                type="button"
                onClick={() => move(focused, focused - 1)}
                disabled={focused === 0}
              >
                ← Earlier
              </button>
              <button
                type="button"
                onClick={() => move(focused, focused + 1)}
                disabled={focused === items.length - 1}
              >
                Later →
              </button>
            </div>

            <label>
              Horizontal <output>{Math.round(x)}%</output>
              <input
                type="range"
                min="0"
                max="100"
                value={x}
                onChange={(e) => setPosition({ x: +e.target.value, y })}
              />
            </label>
            <label>
              Vertical <output>{Math.round(y)}%</output>
              <input
                type="range"
                min="0"
                max="100"
                value={y}
                onChange={(e) => setPosition({ x, y: +e.target.value })}
              />
            </label>
            <button type="button" onClick={() => setPosition({ x: 50, y: 50 })}>
              Centre image
            </button>

            <div className="sp-editor-actions">
              <button type="button" onClick={reset} disabled={!dirty}>
                Discard changes
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={save}
                disabled={!dirty}
              >
                Save
              </button>
            </div>
            <p className="sp-editor-status">
              {dirty ? "Unsaved changes" : status || "All changes saved"}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
