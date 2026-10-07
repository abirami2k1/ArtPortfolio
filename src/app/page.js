import Spotlight from "@/components/Spotlight";
import Links from "@/components/Links";
import Header from "@/components/Header";
import Folders from "@/components/Folders";

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <Header />
        <Spotlight />
        <Links />
      </section>
      <Folders />
    </main>
  );
}
