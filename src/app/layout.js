import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
});

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata = {
  title: "Abislovescape · Abirami",
  description:
    "Art portfolio of Abirami Saravanan — digital illustrations, calligraphy, Tanjore paintings, pencil sketches and canvas art.",
  metadataBase: new URL("https://abirami2k1.github.io/ArtPortfolio/"),
  openGraph: {
    title: "Abislovescape · Abirami",
    description: "Digital illustrations, calligraphy, traditional art and more.",
    images: [`${base}/cover.jpg`],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
