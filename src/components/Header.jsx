import Link from "next/link";
import Menu from "@/components/Menu";

export default function Header() {
  return (
    <header className="header">
      <Link href="/" className="header-brand">
        Abislovescape
      </Link>
      <span className="header-by">Art by Abirami</span>
      <Menu />
    </header>
  );
}
