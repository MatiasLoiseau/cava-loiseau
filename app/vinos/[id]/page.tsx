/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";
import winesData from "@/data/wines.json";

type Wine = {
  id: string;
  rank: number;
  juanScore: number;
  rankReason: string;
  name: string;
  vintage: number;
  winery: string;
  style: string;
  composition: string;
  region: string;
  altitude: string | null;
  soil: string | null;
  aging: string | null;
  vinificationMethod?: string;
  cellarUntil: number;
  alcohol: string | null;
  awards: string[];
  quantity: number;
  accent: string;
  image: string;
  sourceUrl: string;
  shortNote: string;
  didacticDescription: string;
  appearance: string;
  aroma: string;
  palate: string;
  servingAdvice: string;
  pairing: string[];
  learning: string;
};

const wines = winesData as Wine[];

type WinePageProps = { params: Promise<{ id: string }> };

async function absoluteUrl(path: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "cava-loiseau.vercel.app";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}${path}`;
}

export function generateStaticParams() {
  return wines.map((wine) => ({ id: wine.id }));
}

export async function generateMetadata({ params }: WinePageProps): Promise<Metadata> {
  const { id } = await params;
  const wine = wines.find((item) => item.id === id);

  if (!wine) {
    return { title: "Vino no encontrado — Cava Loiseau" };
  }

  const image = await absoluteUrl(wine.image);
  const title = `${wine.name} ${wine.vintage} — Cava Loiseau`;
  const description = wine.shortNote;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, alt: `${wine.name} ${wine.vintage}` }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function WinePage({ params }: WinePageProps) {
  const { id } = await params;
  const wine = wines.find((item) => item.id === id);

  if (!wine) notFound();

  const facts = [
    ["Bodega", wine.winery],
    ["Origen", wine.region],
    ["Composición", wine.composition],
    ["Altitud", wine.altitude],
    ["Suelo", wine.soil],
    ["Crianza", wine.aging],
    ["Vinificación", wine.vinificationMethod],
    ["Alcohol", wine.alcohol],
    ["Guarda sugerida", `Hasta ${wine.cellarUntil}`],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <main className="wine-detail" id="top">
      <header className="site-header detail-header">
        <a className="brand" href="/" aria-label="Cava Loiseau, inicio">
          <span className="brand-mark">CL</span>
          <span>Cava Loiseau</span>
        </a>
        <a className="back-link" href="/#ranking">← Volver al ranking</a>
      </header>

      <section className="detail-hero">
        <div className="detail-title">
          <p className="eyebrow">Puesto {String(wine.rank).padStart(2, "0")} · Ranking de Juan</p>
          <p className="detail-style">{wine.style} · {wine.vintage}</p>
          <h1>{wine.name}</h1>
          <p className="detail-lead">{wine.shortNote}</p>
          <div className="detail-score"><strong>{wine.juanScore}</strong><span>/ 100<br />puntaje de Juan</span></div>
        </div>
        <div className="detail-art" style={{ "--wine-accent": wine.accent } as React.CSSProperties}>
          <span className="detail-year">{wine.vintage}</span>
          <Image src={wine.image} alt={`Botella de ${wine.name} ${wine.vintage}`} width={125} height={475} priority />
          <span className="detail-origin">{wine.region}</span>
        </div>
      </section>

      <section className="detail-story">
        <div className="detail-story-heading">
          <p className="eyebrow">Qué podés esperar</p>
          <h2>Una clase<br /><em>en la copa.</em></h2>
        </div>
        <div className="detail-story-copy">
          <p>{wine.didacticDescription}</p>
          <blockquote>{wine.servingAdvice}</blockquote>
        </div>
      </section>

      <section className="tasting-notes">
        <div><span>01 · Vista</span><p>{wine.appearance}</p></div>
        <div><span>02 · Nariz</span><p>{wine.aroma}</p></div>
        <div><span>03 · Boca</span><p>{wine.palate}</p></div>
      </section>

      <section className="detail-facts">
        <div>
          <p className="eyebrow">La ficha, sin vueltas</p>
          <h2>De dónde viene<br />lo que sentís.</h2>
        </div>
        <dl>
          {facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </section>

      <section className="learn-callout">
        <span>Apunte de Juan</span>
        <p>{wine.learning}</p>
      </section>

      <section className="pairing-section">
        <div>
          <p className="eyebrow">Para llevarlo a la mesa</p>
          <h2>¿Con qué<br />lo abrimos?</h2>
        </div>
        <ol>
          {wine.pairing.map((dish, index) => (
            <li key={dish}><span>{String(index + 1).padStart(2, "0")}</span>{dish}</li>
          ))}
        </ol>
      </section>

      {wine.awards.length > 0 && (
        <section className="awards-section">
          <p className="eyebrow">Reconocimientos</p>
          <div>{wine.awards.map((award) => <span key={award}>{award}</span>)}</div>
        </section>
      )}

      <section className="detail-source">
        <p>Los datos técnicos fueron contrastados con la ficha original y fuentes de la bodega.</p>
        <a href={wine.sourceUrl} target="_blank" rel="noreferrer">Consultar la ficha de Bonvivir ↗</a>
      </section>

      <footer>
        <a className="brand footer-brand" href="/"><span className="brand-mark">CL</span><span>Cava Loiseau</span></a>
        <p>Curado por Juan, para disfrutar con curiosidad.</p>
        <a href="#top">Volver arriba ↑</a>
      </footer>
    </main>
  );
}
