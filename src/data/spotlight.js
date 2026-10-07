import artworks from "@/data/artworks";
import saved from "@/data/spotlight.json";

// spotlight.json holds the Spotlight's order (by artwork title) and each
// piece's crop `position` ("x% y%", 50% 50% = centred). Edit it by hand or
// with the in-browser editor: run `npm run dev` and click "Edit spotlight".
// Artworks missing from the file are appended so new pieces still show up.

export const DEFAULT_POSITION = "50% 50%";

export function resolveSpotlight(config) {
  const byTitle = new Map(artworks.map((a) => [a.title, a]));
  const items = config
    .filter((c) => byTitle.has(c.title))
    .map((c) => ({
      ...byTitle.get(c.title),
      position: c.position || DEFAULT_POSITION,
    }));
  const listed = new Set(items.map((a) => a.title));
  for (const a of artworks) {
    if (!listed.has(a.title)) items.push({ ...a, position: DEFAULT_POSITION });
  }
  return items;
}

export function toConfig(items) {
  return items.map(({ title, position }) => ({ title, position }));
}

const spotlight = resolveSpotlight(saved);

export default spotlight;
