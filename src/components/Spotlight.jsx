"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import spotlight from "@/data/spotlight";
import SpotlightAccordion from "@/components/SpotlightAccordion";
import SpotlightEditor, {
  parsePosition,
  formatPosition,
} from "@/components/SpotlightEditor";

const PANEL_WIDTH_COLLAPSED_MAX = 20;
const PANEL_WIDTH_COLLAPSED_MIN = 6;
const PANEL_WIDTH_EXPANDED = 320;
const PANEL_GAP = 4;
// Percent of crop shift per pixel dragged in the editor.
const PAN_SENSITIVITY = 0.25;
const CAN_EDIT = process.env.NODE_ENV === "development";

export default function Spotlight() {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [focusedPanel, setFocusedPanel] = useState(0);
  const [items, setItems] = useState(spotlight);
  const [savedItems, setSavedItems] = useState(spotlight);
  const [editing, setEditing] = useState(false);
  const panRef = useRef(null);

  const panelCount = items.length;
  const expandedWidth = Math.min(PANEL_WIDTH_EXPANDED, trackWidth * 0.45);
  // Shrink the collapsed strips so every panel fits inside the track.
  const collapsedWidth = Math.max(
    PANEL_WIDTH_COLLAPSED_MIN,
    Math.min(
      PANEL_WIDTH_COLLAPSED_MAX,
      (trackWidth - expandedWidth) / (panelCount - 1) - PANEL_GAP,
    ),
  );

  // Mobile hides the accordion, so the track measures 0 there and no panels
  // are built: phones get the feed below instead.
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width);
    });
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  const getPanelPosition = useCallback(
    (panelIndex) => {
      const totalTrackWidth =
        (panelCount - 1) * (collapsedWidth + PANEL_GAP) + expandedWidth;
      const offsetToCenter = (trackWidth - totalTrackWidth) / 2;

      let left = offsetToCenter;
      for (let i = 0; i < panelIndex; i++) {
        const w = i === focusedPanel ? expandedWidth : collapsedWidth;
        left += w + PANEL_GAP;
      }

      const width =
        panelIndex === focusedPanel ? expandedWidth : collapsedWidth;
      return { left, width };
    },
    [focusedPanel, panelCount, expandedWidth, collapsedWidth, trackWidth],
  );

  // Editor only: drag the focused image to move its crop position.
  const startPan = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      start: parsePosition(items[focusedPanel].position),
    };
  };
  const movePan = (e) => {
    const pan = panRef.current;
    if (!pan) return;
    const position = formatPosition({
      x: pan.start.x - (e.clientX - pan.x) * PAN_SENSITIVITY,
      y: pan.start.y - (e.clientY - pan.y) * PAN_SENSITIVITY,
    });
    setItems((prev) =>
      prev.map((a, i) => (i === focusedPanel ? { ...a, position } : a)),
    );
  };
  const endPan = () => {
    panRef.current = null;
  };

  const focused = items[focusedPanel];
  // Wait for the first measurement so panels don't animate in from a zero-width layout.
  const ready = trackWidth > 0;

  return (
    <>
      <section className="spotlight">
        <div className="spotlight-track" ref={trackRef}>
          <div className="spotlight-panels">
            {ready && (
              <>
                <div
                  className="spotlight-focus-indicator"
                  style={getPanelPosition(focusedPanel)}
                />

                {items.map((art, i) => {
                  const panning = editing && i === focusedPanel;
                  return (
                    <div
                      key={i}
                      className={`spotlight-panel${
                        i === focusedPanel ? " is-active" : ""
                      }${panning ? " is-panning" : ""}`}
                      style={getPanelPosition(i)}
                      onMouseEnter={
                        !editing ? () => setFocusedPanel(i) : undefined
                      }
                      onClick={() => setFocusedPanel(i)}
                      onPointerDown={panning ? startPan : undefined}
                      onPointerMove={panning ? movePan : undefined}
                      onPointerUp={panning ? endPan : undefined}
                      onPointerCancel={panning ? endPan : undefined}
                    >
                      <img
                        src={art.src}
                        alt={art.title}
                        style={{ objectPosition: art.position }}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <p className="spotlight-caption" key={focusedPanel}>
            <span>{focused.title}</span>
            <span>{focused.category}</span>
          </p>
        </div>

        {CAN_EDIT && !editing && (
          <button
            type="button"
            className="sp-editor-toggle"
            onClick={() => setEditing(true)}
          >
            Edit spotlight
          </button>
        )}
        {CAN_EDIT && editing && (
          <SpotlightEditor
            items={items}
            setItems={setItems}
            savedItems={savedItems}
            setSavedItems={setSavedItems}
            focused={focusedPanel}
            setFocused={setFocusedPanel}
            onClose={() => setEditing(false)}
          />
        )}
      </section>

      {/* Phones get the same accordion turned on its side, driven by page
          scroll. Hidden on desktop, where the horizontal one runs. */}
      <SpotlightAccordion items={items} />

    </>
  );
}
