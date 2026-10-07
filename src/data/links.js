const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const links = [
  { label: "Work", href: "https://abirami2k1sr.github.io/Portfolio/" },
  { label: "Instagram", href: "https://instagram.com/abiartexplorer" },
  { label: "Abislovescape", href: "https://instagram.com/abislovescape" },
  { label: "Email", href: "mailto:abi.shree.2k1@gmail.com" },
  { label: "Full PDF", href: `${base}/Abi_Portfolio_Art.pdf`, download: true },
];

export default links;
