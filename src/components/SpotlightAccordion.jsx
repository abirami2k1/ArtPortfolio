"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The desktop accordion turned on its side. A tall spacer gives the page
// something to scroll; the stage sticks to the viewport while that scroll
// decides which piece is open, so there is no hijacked scrolling anywhere.
const COLLAPSED = 30;
const GAP = 4;
// Page travel per piece: how far you scroll to move the accordion by one.
const SCROLL_PER_ITEM = 90;

// Drag weight, as on the feed: speed leans the pieces, letting go settles.
const MAX_VELOCITY = 60;
const MAX_SKEW = 3;
const MAX_STRETCH = 0.06;
const VELOCITY_EASE = 0.22;

const lerp = (start, end, factor) => start + (end - start) * factor;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function SpotlightAccordion({ items }) {
  const spacerRef = useRef(null);
  const stageRef = useRef(null);
  const [active, setActive] = useState(0);
  // Sensible defaults so the pieces render in the server HTML and survive a
  // failed script; the first measurement corrects them immediately.
  const [metrics, setMetrics] = useState({ expanded: 464, viewport: 800 });

  const count = items.length;

  useEffect(() => {
    const measure = () => {
      const viewport = window.innerHeight;
      setMetrics({ expanded: Math.min(viewport * 0.58, 520), viewport });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Where the page sits inside the spacer picks the open piece.
  useEffect(() => {
    const spacer = spacerRef.current;
    if (!spacer) return;

    let frame = null;
    const update = () => {
      frame = null;
      const { top, height } = spacer.getBoundingClientRect();
      const range = height - window.innerHeight;
      const progress = range > 0 ? clamp(-top / range, 0, 1) : 0;
      const index = Math.round(progress * (count - 1));
      setActive((prev) => (prev === index ? prev : index));
    };

    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  // Scroll speed leans the open piece; it eases back to rest on its own.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let last = window.scrollY;
    let velocity = 0;
    let frame = null;
    let idle = 0;

    const set = (skew, stretch) => {
      stage.style.setProperty("--sa-skew", `${skew}deg`);
      stage.style.setProperty("--sa-stretch", stretch);
    };

    const tick = () => {
      const y = window.scrollY;
      const delta = y - last;
      last = y;

      velocity = lerp(velocity, delta, VELOCITY_EASE);
      const capped = clamp(velocity, -MAX_VELOCITY, MAX_VELOCITY);
      const ratio = capped / MAX_VELOCITY;

      set(
        (ratio * MAX_SKEW).toFixed(2),
        (1 + Math.min(Math.abs(ratio), 1) * MAX_STRETCH).toFixed(3),
      );

      if (delta === 0 && Math.abs(velocity) < 0.05) {
        idle += 1;
        if (idle > 8) {
          velocity = 0;
          set(0, 1);
          frame = null;
          return;
        }
      } else {
        idle = 0;
      }

      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      idle = 0;
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
      set(0, 1);
    };
  }, []);

  const { expanded, viewport } = metrics;

  const sizeOf = useCallback(
    (index) => (index === active ? expanded : COLLAPSED),
    [active, expanded],
  );

  const startOf = useCallback(
    (index) => {
      let start = 0;
      for (let i = 0; i < index; i++) start += sizeOf(i) + GAP;
      return start;
    },
    [sizeOf],
  );

  // Slide the whole stack so the open piece sits at the centre of the
  // screen. The stack's total height never changes, whichever is open.
  const offset = viewport / 2 - (startOf(active) + expanded / 2);

  // Tapping a sliver scrolls to it, so the scroll stays the single source
  // of truth for which piece is open.
  const goTo = (index) => {
    const spacer = spacerRef.current;
    if (!spacer) return;
    const { top, height } = spacer.getBoundingClientRect();
    const docTop = top + window.scrollY;
    const range = height - window.innerHeight;
    window.scrollTo({
      top: docTop + (index / (count - 1)) * range,
      behavior: "smooth",
    });
  };

  const current = items[active];
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div
      className="sa"
      ref={spacerRef}
      style={{ height: count * SCROLL_PER_ITEM }}
    >
      <div className="sa-stage" ref={stageRef}>
        <div
          className="sa-frame"
          style={{ top: offset + startOf(active), height: expanded }}
          aria-hidden="true"
        />

        {items.map((art, i) => (
          <button
            type="button"
            key={art.src}
            className={`sa-item${i === active ? " is-active" : ""}`}
            style={{ top: offset + startOf(i), height: sizeOf(i) }}
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
