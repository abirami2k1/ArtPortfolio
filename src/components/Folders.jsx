"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import folders, { getFolderPreviews } from "@/data/folders";

const BREAKPOINT_MOBILE = 1000;
const TAB_REST_OFFSET = 12;
// How far previews rise, as a share of their own height; high enough to
// clear the short tabs.
const PREVIEW_LIFT = "-170%";
const EASE = "back.out(1.7)";
const DURATION = 0.25;

// Pair folders into rows of two, matching the stacked-tab layout.
const rows = folders.reduce((acc, folder, i) => {
  if (i % 2 === 0) acc.push([]);
  acc[acc.length - 1].push({ ...folder, index: i });
  return acc;
}, []);

export default function Folders() {
  const rootRef = useRef(null);
  const [activeFolder, setActiveFolder] = useState(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    // Hover only runs on desktop; matchMedia reverts every tween when the
    // viewport drops below the breakpoint, so mobile gets the flat stack.
    mm.add(`(min-width: ${BREAKPOINT_MOBILE}px)`, () => {
      const folderEls = [...rootRef.current.querySelectorAll(".folder")];
      gsap.set(rootRef.current.querySelectorAll(".folder-wrapper"), {
        y: TAB_REST_OFFSET,
      });

      const cleanups = folderEls.map((folder, index) => {
        const wrapper = folder.querySelector(".folder-wrapper");
        const previewImages = folder.querySelectorAll(".folder-preview-img");

        const open = () => {
          setActiveFolder(index);
          gsap.to(wrapper, { y: 0, duration: DURATION, ease: EASE });
          previewImages.forEach((img, imgIndex) => {
            const [min, max] = [
              [-20, -10],
              [-10, 10],
              [10, 20],
            ][imgIndex];
            gsap.to(img, {
              y: PREVIEW_LIFT,
              rotation: gsap.utils.random(min, max),
              duration: DURATION,
              ease: EASE,
              delay: imgIndex * 0.025,
            });
          });
        };

        const close = () => {
          setActiveFolder(null);
          gsap.to(wrapper, {
            y: TAB_REST_OFFSET,
            duration: DURATION,
            ease: EASE,
          });
          previewImages.forEach((img, imgIndex) => {
            gsap.to(img, {
              y: "0%",
              rotation: 0,
              duration: DURATION,
              ease: EASE,
              delay: imgIndex * 0.05,
            });
          });
        };

        folder.addEventListener("mouseenter", open);
        folder.addEventListener("mouseleave", close);
        folder.addEventListener("focus", open);
        folder.addEventListener("blur", close);
        return () => {
          folder.removeEventListener("mouseenter", open);
          folder.removeEventListener("mouseleave", close);
          folder.removeEventListener("focus", open);
          folder.removeEventListener("blur", close);
        };
      });

      return () => {
        cleanups.forEach((cleanup) => cleanup());
        setActiveFolder(null);
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="folders-section" id="folders" aria-label="Creative corner">
      <div className="folders" ref={rootRef}>
        {rows.map((row, rowIndex) => (
          <div className="folders-row" key={rowIndex}>
            {row.map((folder) => {
              const previews = getFolderPreviews(folder);
              const disabled =
                activeFolder !== null && activeFolder !== folder.index;
              return (
                <Link
                  key={folder.slug}
                  href={`/${folder.slug}/`}
                  className={`folder variant-${folder.variant}${
                    disabled ? " disabled" : ""
                  }`}
                >
                  <div className="folder-preview" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`folder-preview-img${
                          previews[i] ? "" : " is-empty"
                        }`}
                      >
                        {previews[i] && <img src={previews[i].src} alt="" />}
                      </div>
                    ))}
                  </div>
                  <div className="folder-wrapper">
                    <div className="folder-index">
                      <p>{String(folder.index + 1).padStart(2, "0")}</p>
                    </div>
                    <div className="folder-name">
                      <h2>{folder.name}</h2>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
