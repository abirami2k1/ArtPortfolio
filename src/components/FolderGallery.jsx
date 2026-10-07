"use client";

import { useState } from "react";

const ALL = "All";

export default function FolderGallery({ artworks }) {
  const mediums = [...new Set(artworks.map((a) => a.category))];
  const [medium, setMedium] = useState(ALL);

  if (artworks.length === 0) {
    return <p className="gallery-empty">New work coming soon.</p>;
  }

  const visible =
    medium === ALL ? artworks : artworks.filter((a) => a.category === medium);

  return (
    <>
      {mediums.length > 1 && (
        <div className="gallery-filters" role="group" aria-label="Filter by medium">
          {[ALL, ...mediums].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={m === medium}
              onClick={() => setMedium(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <ul className="gallery">
        {visible.map((art) => (
          <li key={art.src} className="gallery-item">
            <img src={art.src} alt={art.title} loading="lazy" />
            <p className="gallery-caption">
              <span>{art.title}</span>
              <span>{art.category}</span>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
