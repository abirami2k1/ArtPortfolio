"use client";

import { useEffect, useRef, useState } from "react";

// A thumbnail strip with a fixed indicator box: scrolling moves the strip
// under the box, and whichever thumbnail overlaps it most becomes the
// large preview. Vertical on desktop, horizontal below the breakpoint.
const MOBILE_BREAKPOINT = 900;
const ACTIVE_ITEM_OPACITY = 0.3;
const SCROLL_SPEED = 0.5;
const MAX_VELOCITY = 20;

const lerp = (start, end, factor) => start + (end - start) * factor;

export default function FolderMinimap({ artworks }) {
  const containerRef = useRef(null);
  const itemsRef = useRef(null);
  const indicatorRef = useRef(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (artworks.length === 0) return;

    const container = containerRef.current;
    const items = itemsRef.current;
    const indicator = indicatorRef.current;
    const itemEls = [...items.children];

    let isHorizontal = window.innerWidth <= MOBILE_BREAKPOINT;
    let dimensions = { itemSize: 0, containerSize: 0, indicatorSize: 0 };
    let maxTranslate = 0;
    let currentTranslate = 0;
    let targetTranslate = 0;
    let isClickMove = false;
    let frame;

    // The strip runs down the page on desktop and across it on mobile, so
    // every measurement swaps axis with the layout.
    const measure = () => {
      isHorizontal = window.innerWidth <= MOBILE_BREAKPOINT;
      const item = itemEls[0].getBoundingClientRect();
      const box = indicator.getBoundingClientRect();
      dimensions = isHorizontal
        ? {
            itemSize: item.width,
            containerSize: items.scrollWidth,
            indicatorSize: box.width,
          }
        : {
            itemSize: item.height,
            containerSize: items.scrollHeight,
            indicatorSize: box.height,
          };
      maxTranslate = Math.max(
        dimensions.containerSize - dimensions.indicatorSize,
        0
      );
    };

    const clamp = (value) => Math.min(Math.max(value, -maxTranslate), 0);

    const applyTransform = () => {
      items.style.transform = isHorizontal
        ? `translateX(${currentTranslate}px)`
        : `translateY(${currentTranslate}px)`;
    };

    // The indicator never moves, so its span in strip coordinates is just
    // the inverse of the strip's offset.
    const getItemInIndicator = () => {
      const indicatorStart = -currentTranslate;
      const indicatorEnd = indicatorStart + dimensions.indicatorSize;

      let maxOverlap = 0;
      let selectedIndex = 0;

      itemEls.forEach((item, index) => {
        const itemStart = index * dimensions.itemSize;
        const itemEnd = itemStart + dimensions.itemSize;
        const overlap = Math.max(
          0,
          Math.min(indicatorEnd, itemEnd) - Math.max(indicatorStart, itemStart)
        );
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          selectedIndex = index;
        }
      });

      return selectedIndex;
    };

    const animate = () => {
      // Clicks glide a little slower than a flick of the wheel.
      const lerpFactor = isClickMove ? 0.05 : 0.075;
      currentTranslate = lerp(currentTranslate, targetTranslate, lerpFactor);

      if (Math.abs(currentTranslate - targetTranslate) > 0.01) {
        applyTransform();
        const index = getItemInIndicator();
        if (index !== activeRef.current) {
          activeRef.current = index;
          setActive(index);
        }
      } else {
        isClickMove = false;
      }

      frame = requestAnimationFrame(animate);
    };

    const scrollBy = (delta) => {
      const velocity = Math.min(
        Math.max(delta * SCROLL_SPEED, -MAX_VELOCITY),
        MAX_VELOCITY
      );
      targetTranslate = clamp(targetTranslate - velocity);
    };

    const onWheel = (e) => {
      e.preventDefault();
      isClickMove = false;
      scrollBy(e.deltaY);
    };

    // A vertical drag advances the strip whichever way it is laid out, so
    // the gesture always matches the page rather than the thumbnails.
    let touchStartY = 0;
    const onTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      scrollBy(touchStartY - touchY);
      touchStartY = touchY;
    };

    const onKeyDown = (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
        e.key
      ];
      if (!step) return;
      e.preventDefault();
      goToIndex(activeRef.current + step);
    };

    // Centre the chosen thumbnail inside the indicator box.
    function goToIndex(index) {
      const bounded = Math.min(Math.max(index, 0), itemEls.length - 1);
      isClickMove = true;
      targetTranslate = clamp(
        -bounded * dimensions.itemSize +
          (dimensions.indicatorSize - dimensions.itemSize) / 2
      );
    }

    const clickHandlers = itemEls.map((item, index) => {
      const handler = () => goToIndex(index);
      item.addEventListener("click", handler);
      return () => item.removeEventListener("click", handler);
    });

    const onResize = () => {
      measure();
      targetTranslate = clamp(targetTranslate);
      currentTranslate = targetTranslate;
      applyTransform();
    };

    measure();
    applyTransform();
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    animate();

    return () => {
      cancelAnimationFrame(frame);
      clickHandlers.forEach((remove) => remove());
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [artworks]);

  if (artworks.length === 0) {
    return <p className="gallery-empty">New work coming soon.</p>;
  }

  const current = artworks[active];

  return (
    <div
      className="minimap-stage"
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Artworks — scroll or pick a thumbnail"
    >
      <div className="img-preview">
        <img src={current.src} alt={current.title} />
        <p className="img-preview-caption">
          <span>{current.title}</span>
          <span>{current.category}</span>
        </p>
      </div>

      <div className="minimap">
        <div className="indicator" ref={indicatorRef} aria-hidden="true" />
        <div className="items" ref={itemsRef}>
          {artworks.map((art, i) => (
            <button
              key={art.src}
              type="button"
              className="item"
              aria-label={art.title}
              aria-current={i === active}
            >
              <img
                src={art.src}
                alt=""
                style={{ opacity: i === active ? ACTIVE_ITEM_OPACITY : 1 }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
