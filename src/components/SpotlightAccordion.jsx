"use client";

import { useEffect, useRef, useState } from "react";

// The desktop accordion turned on its side. A tall spacer gives the page
// something to scroll; the stage sticks to the viewport while scroll picks
// which piece is open. Exactly as on desktop, that choice is a whole number:
// scroll names the open piece and CSS runs the move, so the column is never
// caught resting mid-swap with two half-open photos.
// Sliver size, the desktop panel's collapsed width turned on its side.
const COLLAPSED_MAX = 20;
const COLLAPSED_MIN = 6;
const GAP = 4;
// Page travel per piece: how far you scroll to move the accordion by one.
const SCROLL_PER_ITEM = 90;
// The open piece keeps the desktop panel's 320-by-340 proportion, at about
// half the viewport width — the column is a centred strip, not full bleed.
const PANEL_WIDTH = 320;
const PANEL_ASPECT = 340 / PANEL_WIDTH;
const WIDTH_RATIO = 0.5;
// Ceilings, so the open piece leaves the slivers room: never more than
// this much of the screen, and never so much that the column of slivers
// has to run off it — but never shrunk below this either, since past a
// certain point the photo matters more than the last few slivers.
const HEIGHT_RATIO = 0.45;
const HEIGHT_FLOOR_RATIO = 0.4;
// Server-render size, corrected on the first frame in the browser.
const DEFAULT_VIEWPORT = 800;
const DEFAULT_WIDTH = 390;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// The open piece's box. Width leads; if that makes it too tall for the
// screen the height leads instead, so the proportion never changes.
function panelFor(viewport, width, count) {
  const panel = Math.min(width * WIDTH_RATIO, PANEL_WIDTH);
  // What is left once every sliver has its smallest share of the screen.
  const fits = viewport - (count - 1) * (COLLAPSED_MIN + GAP);
  const height = Math.min(
    panel * PANEL_ASPECT,
    viewport * HEIGHT_RATIO,
    Math.max(fits, viewport * HEIGHT_FLOOR_RATIO),
  );
  return { width: height / PANEL_ASPECT, height };
}

// Shrink the slivers until the whole column fits the screen, exactly as
// the desktop track shrinks its collapsed strips to fit its width.
const collapsedFor = (viewport, expanded, count) =>
  clamp(
    (viewport - expanded) / (count - 1) - GAP,
    COLLAPSED_MIN,
    COLLAPSED_MAX,
  );

function layoutFor(active, viewport, width, count) {
  const panel = panelFor(viewport, width, count);
  const collapsed = collapsedFor(viewport, panel.height, count);
  const tops = [];
  const sizes = [];
  let total = 0;

  for (let i = 0; i < count; i++) {
    const size = i === active ? panel.height : collapsed;
    tops.push(total);
    sizes.push(size);
    total += size + GAP;
  }

  // Slide the stack so the open piece sits at screen centre.
  const centre = tops[active] + sizes[active] / 2;
  return { tops, sizes, panel, offset: viewport / 2 - centre };
}

export default function SpotlightAccordion({ items }) {
  const spacerRef = useRef(null);
  const stageRef = useRef(null);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [active, setActive] = useState(0);

  const count = items.length;

  // Scroll decides which piece is open; the transition itself is CSS, so a
  // swap always runs to completion instead of tracking the finger.
  useEffect(() => {
    const spacer = spacerRef.current;
    if (!spacer) return;

    let frame = null;

    const read = () => {
      frame = null;
      // The stage's own height, not window.innerHeight: the stage is 100svh,
      // and on mobile browsers innerHeight is the larger viewport. Measuring
      // the stage is what keeps the open piece centred inside the frame.
      const stage = stageRef.current;
      const height = stage?.getBoundingClientRect().height || window.innerHeight;
      setViewport(height);
      setWidth(window.innerWidth);

      const rect = spacer.getBoundingClientRect();
      const range = rect.height - height;
      const position =
        range > 0 ? clamp(-rect.top / range, 0, 1) * (count - 1) : 0;

      const nearest = Math.round(position);
      setActive((prev) => (prev === nearest ? prev : nearest));
    };

    const request = () => {
      if (frame === null) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [count]);

  // Tapping a sliver scrolls to it, so scroll stays the only thing deciding
  // what is open; the native smooth scroll carries it there.
  const goTo = (index) => {
    const spacer = spacerRef.current;
    if (!spacer) return;
    const { top, height } = spacer.getBoundingClientRect();
    const stage = stageRef.current;
    const range =
      height - (stage?.getBoundingClientRect().height || window.innerHeight);
    window.scrollTo({
      top: top + window.scrollY + (index / (count - 1)) * range,
      behavior: "smooth",
    });
  };

  // Rendered from the open piece alone: the first paint is correct before
  // any measurement, and every later change is one CSS transition.
  const { tops, sizes, panel, offset } = layoutFor(
    active,
    viewport,
    width,
    count,
  );
  const current = items[active];
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div
      className="sa"
      ref={spacerRef}
      style={{ height: count * SCROLL_PER_ITEM }}
    >
      <div
        className="sa-stage"
        ref={stageRef}
        style={{
          "--sa-w": `${panel.width.toFixed(1)}px`,
          "--sa-h": `${panel.height.toFixed(1)}px`,
        }}
      >
        <div className="sa-frame" aria-hidden="true" />

        {items.map((art, i) => (
          <button
            type="button"
            key={art.src}
            className={`sa-item${i === active ? " is-active" : ""}`}
            style={{
              transform: `translate3d(0, ${(offset + tops[i]).toFixed(1)}px, 0)`,
              height: sizes[i],
            }}
            aria-label={art.title}
            aria-current={i === active}
            onClick={() => goTo(i)}
          >
            <img
              src={art.src}
              alt={i === active ? art.title : ""}
              style={{ objectPosition: art.position }}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </button>
        ))}

        <p className="sa-caption" key={active}>
          <span className="sa-index">
            {pad(active + 1)} <span>/ {count}</span>
          </span>
          <span className="sa-title">{current.title}</span>
          <span className="sa-category">{current.category}</span>
        </p>
      </div>
    </div>
  );
}
