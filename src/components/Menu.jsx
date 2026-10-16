"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import folders from "@/data/folders";
import links from "@/data/links";

const BREAKPOINT_MOBILE = 1000;

export default function Menu() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Desktop navigates folders from the stack on the home page, so the
    // overlay should never survive a resize past the breakpoint.
    const onResize = () => {
      if (window.innerWidth >= BREAKPOINT_MOBILE) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      toggleRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="menu-toggle"
        ref={toggleRef}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Menu
      </button>

      {open && (
        <div className="menu-overlay" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="menu-head">
            <span className="menu-brand">Abislovescape</span>
            <button
              type="button"
              className="menu-close"
              ref={closeRef}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <nav className="menu-folders" aria-label="Folders">
            {folders.map((folder, i) => (
              <Link
                key={folder.slug}
                href={`/${folder.slug}/`}
                className="menu-folder"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => setOpen(false)}
              >
                <span className="menu-folder-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="menu-folder-name">{folder.name}</span>
              </Link>
            ))}
          </nav>

          <nav className="menu-links" aria-label="Contact">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                download={l.download || undefined}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
