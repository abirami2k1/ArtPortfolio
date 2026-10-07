import artworks from "@/data/artworks";

// Order sets the folder layout: rows of two, back row first.
// `variant` picks the tab colour; `preview` lists the three artwork titles
// that fan out on hover (defaults to the folder's first three pieces).
const folders = [
  {
    slug: "calligraphy",
    name: "Calligraphy",
    blurb: "Brush and pointed pen lettering.",
    variant: 1,
  },
  {
    slug: "illustration",
    name: "Illustration",
    blurb: "Digital illustrations about moods, moments and the in-between.",
    variant: 2,
    preview: ["Shifting Focus", "Bloom", "Breaking Silence"],
  },
  {
    slug: "characters",
    name: "Characters",
    blurb: "Portraits, caricatures and character designs.",
    variant: 2,
    preview: ["Couple Portrait", "Sticker Portrait", "Cyber Panda"],
  },
  {
    slug: "traditional",
    name: "Traditional",
    blurb: "Tanjore, canvas, pencil and pastel — made by hand.",
    variant: 3,
    preview: ["Goddess Lakshmi", "Maple Sunset", "Mother & Child"],
  },
  {
    slug: "design",
    name: "Design",
    blurb: "Logos, identities and wedding stationery.",
    variant: 1,
  },
  {
    slug: "photography",
    name: "Photography",
    blurb: "Through the lens.",
    variant: 2,
  },
];

export function getFolderArtworks(slug) {
  return artworks.filter((a) => a.folder === slug);
}

export function getFolder(slug) {
  return folders.find((f) => f.slug === slug);
}

export function getFolderPreviews(folder) {
  const items = getFolderArtworks(folder.slug);
  if (!folder.preview) return items.slice(0, 3);
  return folder.preview
    .map((title) => items.find((a) => a.title === title))
    .filter(Boolean);
}

export default folders;
