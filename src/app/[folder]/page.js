import Link from "next/link";
import Header from "@/components/Header";
import FolderGallery from "@/components/FolderGallery";
import folders, { getFolder, getFolderArtworks } from "@/data/folders";

export const dynamicParams = false;

export function generateStaticParams() {
  return folders.map((f) => ({ folder: f.slug }));
}

export async function generateMetadata({ params }) {
  const { folder: slug } = await params;
  const folder = getFolder(slug);
  return {
    title: `${folder.name} · Abislovescape`,
    description: folder.blurb,
  };
}

export default async function FolderPage({ params }) {
  const { folder: slug } = await params;
  const folder = getFolder(slug);
  const index = folders.indexOf(folder);
  const next = folders[(index + 1) % folders.length];

  return (
    <main className="folder-page">
      <Header />

      <div className="folder-page-head">
        <p className="folder-page-index">
          {String(index + 1).padStart(2, "0")} / {String(folders.length).padStart(2, "0")}
        </p>
        <h1>{folder.name}</h1>
        <p className="folder-page-blurb">{folder.blurb}</p>
      </div>

      <FolderGallery artworks={getFolderArtworks(slug)} />

      <nav className="folder-page-nav" aria-label="Folders">
        <Link href="/#folders">← All folders</Link>
        <Link href={`/${next.slug}/`}>Next: {next.name} →</Link>
      </nav>
    </main>
  );
}
