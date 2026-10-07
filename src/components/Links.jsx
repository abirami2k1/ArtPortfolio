import links from "@/data/links";

export default function Links() {
  return (
    <nav className="links" aria-label="Contact">
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
  );
}
