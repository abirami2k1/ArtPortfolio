"use client";

import { useEffect, useRef } from "react";

// The desktop accordion turned on its side, driven the way phlntn.com drives
// its gallery: the swipe is an input, not a scroll position. While the stage
// holds the screen the page does not move; a gesture accumulates until it
// crosses a threshold, and that names the next piece. Nothing animates on a
// fixed duration — every frame each piece eases toward the size it wants, so
// a second flick mid-move simply changes the target and the motion carries on
// from where it is instead of queueing another second-long transition.

// Sliver size, the desktop panel's collapsed width turned on its side.
const COLLAPSED_MAX = 20;
const COLLAPSED_MIN = 6;
const GAP = 4;
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
const DEFAULT_HEADER = 56;
// The caption sits below the column as it does on desktop, not over it, so
// the column is laid out in what is left above it.
const CAPTION_SPACE = 30;
const DEFAULT_CAPTION = 46;

// Motion, with phlntn.com's constants. The ease is per millisecond rather
// than per frame, so the move takes the same time on any refresh rate, and
// the frame delta is capped: a hitch must not teleport the accordion.
const SIZE_EASE = 0.005;
const MAX_FRAME = 100;
const SETTLED = 0.05;
// Gesture weight, inverse: the threshold is this much of the viewport, so
// roughly one piece per 1.5% of the screen swiped.
const TOUCH_SPEED = 0.015;
const WHEEL_SPEED = 0.01;

const MOBILE = "(max-width: 1000px)";

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

// Where the column starts. The whole column is centred once and stays
// there — its total height never changes, since exactly one piece is open
// at a time — which is what lets the photos hold still while the frame is
// the thing that travels, as on desktop.
const originFor = (viewport, expanded, collapsed, count) =>
  (viewport - ((count - 1) * (collapsed + GAP) + expanded)) / 2;

// Server-render layout, so the first paint is a column rather than a pile.
function initialLayout(count) {
  const viewport = DEFAULT_VIEWPORT - DEFAULT_CAPTION - CAPTION_SPACE;
  const panel = panelFor(viewport, DEFAULT_WIDTH, count);
  const collapsed = collapsedFor(viewport, panel.height, count);
  const tops = [];
  let y = 0;
  for (let i = 0; i < count; i++) {
    tops.push(y);
    y += (i === 0 ? panel.height : collapsed) + GAP;
  }
  return {
    tops,
    offset: originFor(viewport, panel.height, collapsed, count),
    panel,
    collapsed,
  };
}

const pad = (n) => String(n).padStart(2, "0");

export default function SpotlightAccordion({ items }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const itemRefs = useRef([]);
  const captionRef = useRef(null);
  const numberRef = useRef(null);
  const titleRef = useRef(null);
  const categoryRef = useRef(null);

  const count = items.length;

  // One effect owns the whole thing. Nothing here goes through React state:
  // a re-render per frame would cost more than the motion itself, and the
  // caption is three text nodes, so it is written straight to the DOM — the
  // component renders once and the loop takes it from there.
  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const mobile = window.matchMedia(MOBILE);

    // Each piece carries its own current size and eases toward its own
    // target, which is the whole of phlntn's gallery layout.
    const sizes = new Array(count).fill(COLLAPSED_MIN);
    const written = new Array(count).fill(-1);
    const tops = new Array(count).fill(0);

    let target = 0;
    let viewport = DEFAULT_VIEWPORT;
    let panelHeight = 0;
    let collapsedHeight = COLLAPSED_MIN;
    let primed = false;

    let frame = null;
    let previous = 0;

    let tracker = 0;
    let lastTouch = null;
    let lastDelta = 0;

    // The stage fills what the sticky header leaves, so the page sits at
    // the top with the accordion exactly filling the screen — which is what
    // makes "scrolled to the top" a reliable test for owning the gesture.
    const measure = () => {
      const header = document.querySelector(".header");
      const headerHeight = Math.round(
        header?.getBoundingClientRect().height || DEFAULT_HEADER,
      );
      root.style.setProperty("--sa-top", `${headerHeight}px`);

      const rect = stage.getBoundingClientRect();
      const caption = captionRef.current;
      const captionHeight =
        caption?.getBoundingClientRect().height || DEFAULT_CAPTION;
      // The column gets the stage minus the caption's band, so the two never
      // sit on top of each other however long a title runs.
      viewport = Math.max(
        160,
        (rect.height || window.innerHeight) - captionHeight - CAPTION_SPACE,
      );
      const panel = panelFor(viewport, rect.width || window.innerWidth, count);
      panelHeight = panel.height;
      collapsedHeight = collapsedFor(viewport, panelHeight, count);

      stage.style.setProperty("--sa-w", `${panel.width.toFixed(1)}px`);
      stage.style.setProperty("--sa-h", `${panelHeight.toFixed(1)}px`);

      // First measurement lands settled, so the accordion does not animate
      // in from a layout that was only ever a guess.
      if (!primed) {
        for (let i = 0; i < count; i++) {
          sizes[i] = i === target ? panelHeight : collapsedHeight;
        }
        primed = true;
      }
    };

    const draw = () => {
      let y = 0;
      for (let i = 0; i < count; i++) {
        tops[i] = y;
        y += sizes[i] + GAP;
      }

      // A fixed origin, taken from the settled sizes rather than the ones
      // mid-move, so the column cannot drift while a piece grows.
      const offset = originFor(viewport, panelHeight, collapsedHeight, count);

      // The frame travels to the open piece and the photos hold still,
      // which is the desktop track's behaviour turned on its side.
      const frameNode = frameRef.current;
      if (frameNode) {
        frameNode.style.transform = `translate3d(0, ${(offset + tops[target]).toFixed(2)}px, 0)`;
        frameNode.style.height = `${sizes[target].toFixed(2)}px`;
      }

      for (let i = 0; i < count; i++) {
        const node = itemRefs.current[i];
        if (!node) continue;
        node.style.transform = `translate3d(0, ${(offset + tops[i]).toFixed(2)}px, 0)`;
        // Height is the one write that costs layout, so only the two or
        // three pieces actually resizing pay for it.
        if (Math.abs(written[i] - sizes[i]) > 0.01) {
          node.style.height = `${sizes[i].toFixed(2)}px`;
          written[i] = sizes[i];
        }
      }
    };

    const animate = (now) => {
      const delta = Math.min(now - previous, MAX_FRAME);
      previous = now;
      const ease = Math.min(delta * SIZE_EASE, 1);

      let moving = false;
      for (let i = 0; i < count; i++) {
        const want = i === target ? panelHeight : collapsedHeight;
        const gap = want - sizes[i];
        if (Math.abs(gap) > SETTLED) {
          sizes[i] += gap * ease;
          moving = true;
        } else {
          sizes[i] = want;
        }
      }

      draw();
      // Stop once everything has settled rather than burning a phone's
      // battery on a loop with nothing to do.
      frame = moving ? requestAnimationFrame(animate) : null;
    };

    const start = () => {
      if (frame !== null) return;
      previous = performance.now();
      frame = requestAnimationFrame(animate);
    };

    const writeCaption = () => {
      const art = items[target];
      if (numberRef.current) numberRef.current.textContent = pad(target + 1);
      if (titleRef.current) titleRef.current.textContent = art.title;
      if (categoryRef.current) categoryRef.current.textContent = art.category;

      // Replay the entrance by taking the class off and putting it back.
      const caption = captionRef.current;
      if (caption) {
        caption.classList.remove("is-in");
        void caption.offsetWidth;
        caption.classList.add("is-in");
      }
    };

    const navigate = (direction) => {
      const next = clamp(target + direction, 0, count - 1);
      if (next === target) return false;

      const leaving = itemRefs.current[target];
      const entering = itemRefs.current[next];
      leaving?.classList.remove("is-active");
      leaving?.removeAttribute("aria-current");
      leaving?.querySelector("img")?.setAttribute("alt", "");
      entering?.classList.add("is-active");
      entering?.setAttribute("aria-current", "true");
      entering?.querySelector("img")?.setAttribute("alt", items[next].title);

      target = next;
      writeCaption();
      start();
      return true;
    };

    // The gallery owns the gesture while it has the whole screen. On a phone
    // that is the whole page — the folder stack is hidden and lives in the
    // menu, so there is nothing below to scroll to and nothing is taken away
    // by holding the swipe. The scroll test is only insurance for the day
    // something is put below it.
    const owns = () => mobile.matches && window.scrollY <= 1;

    // phlntn's accumulator: a gesture adds up until it is worth a piece, the
    // threshold is taken back out rather than reset, so a long steady swipe
    // keeps stepping, and reversing direction drops what had built up.
    const accumulate = (amount, threshold) => {
      // A move that reports no change says nothing about direction; letting
      // it through would read as a reversal and throw away a slow drag.
      if (amount === 0) return;
      if (Math.sign(amount) !== Math.sign(lastDelta)) tracker = 0;
      lastDelta = amount;
      tracker += amount;

      if (Math.abs(tracker) > threshold) {
        const direction = Math.sign(tracker);
        tracker -= direction * threshold;
        navigate(direction);
      }
    };

    const onTouchStart = () => {
      tracker = 0;
      lastTouch = null;
      lastDelta = 0;
    };

    const onTouchMove = (event) => {
      if (!owns() || event.touches.length > 1) return;
      event.preventDefault();

      const position = event.touches[0].screenY;
      const delta = lastTouch !== null ? position - lastTouch : 0;
      lastTouch = position;
      // Negated: dragging the finger up moves forward, as scrolling would.
      accumulate(-delta, viewport * TOUCH_SPEED);
    };

    const onWheel = (event) => {
      if (!owns()) return;
      event.preventDefault();
      accumulate(event.deltaX + event.deltaY, viewport * WHEEL_SPEED);
    };

    const onKeyDown = (event) => {
      if (!owns() || event.key.indexOf("Arrow") !== 0) return;
      const direction =
        event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      event.preventDefault();
      navigate(direction);
    };

    // Taking the touch means telling the browser not to scroll from it in
    // the first place; give it back the moment the page has moved on.
    const onScroll = () => {
      stage.style.touchAction = owns() ? "none" : "auto";
    };

    const sync = () => {
      if (!mobile.matches) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        stage.style.touchAction = "";
        return;
      }
      measure();
      draw();
      start();
      onScroll();
    };

    sync();

    mobile.addEventListener("change", sync);
    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("wheel", onWheel, { passive: false });

    // Tapping a sliver opens it, the same move by another route.
    const onClick = (event) => {
      const button = event.target.closest(".sa-item");
      if (!button) return;
      const index = itemRefs.current.indexOf(button);
      if (index >= 0) navigate(index - target);
    };
    stage.addEventListener("click", onClick);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      mobile.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("click", onClick);
    };
  }, [items, count]);

  const first = initialLayout(count);

  return (
    <div className="sa" ref={rootRef}>
      <div
        className="sa-stage"
        ref={stageRef}
        style={{
          "--sa-w": `${first.panel.width.toFixed(1)}px`,
          "--sa-h": `${first.panel.height.toFixed(1)}px`,
        }}
      >
        <div
          className="sa-frame"
          ref={frameRef}
          aria-hidden="true"
          style={{
            transform: `translate3d(0, ${(first.offset + first.tops[0]).toFixed(1)}px, 0)`,
            height: first.panel.height,
          }}
        />

        {items.map((art, i) => (
          <button
            type="button"
            key={art.src}
            ref={(node) => {
              itemRefs.current[i] = node;
            }}
            className={`sa-item${i === 0 ? " is-active" : ""}`}
            aria-current={i === 0 ? "true" : undefined}
            style={{
              transform: `translate3d(0, ${(first.offset + first.tops[i]).toFixed(1)}px, 0)`,
              height: i === 0 ? first.panel.height : first.collapsed,
            }}
            aria-label={art.title}
          >
            <img
              src={art.src}
              alt={i === 0 ? art.title : ""}
              style={{ objectPosition: art.position }}
              loading={i === 0 ? "eager" : "lazy"}
              draggable="false"
            />
          </button>
        ))}

        <p className="sa-caption is-in" ref={captionRef}>
          <span className="sa-index">
            <span ref={numberRef}>{pad(1)}</span> <span>/ {count}</span>
          </span>
          <span className="sa-title" ref={titleRef}>
            {items[0].title}
          </span>
          <span className="sa-category" ref={categoryRef}>
            {items[0].category}
          </span>
        </p>
      </div>
    </div>
  );
}
