import Image from "next/image";
import wines from "@/data/wines.json";

const bottleCount = wines.reduce((total, wine) => total + wine.quantity, 0);

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Cava Loiseau, inicio">
          <span className="brand-mark">CL</span>
          <span>Cava Loiseau</span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#cava">La cava</a>
          <a href="#ranking">Ranking de Juan</a>
          <a className="juan-link" href="#juan">Hablar con Juan</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Una colección para beber, aprender y compartir</p>
          <h1>Tu cava,<br /><em>con memoria.</em></h1>
          <p className="hero-intro">
            Cada botella tiene una historia. Juan las ordena, te cuenta qué
            esperar y te ayuda a elegir la indicada para cada mesa.
          </p>
          <a className="primary-cta" href="#ranking">Explorar la selección <span>↘</span></a>
        </div>

        <div className="hero-still-life" aria-label={`${bottleCount} botellas en la cava`}>
          <div className="vintage-stamp"><span>Est.</span><strong>2026</strong><span>Buenos Aires</span></div>
          <Image className="hero-wine hero-wine-left" src={wines[1].image} alt="" width={125} height={475} />
          <Image className="hero-wine hero-wine-center" src={wines[0].image} alt="" width={125} height={475} priority />
          <Image className="hero-wine hero-wine-right" src={wines[3].image} alt="" width={125} height={475} />
          <div className="hero-count"><strong>{bottleCount}</strong><span>botellas<br />esperando</span></div>
        </div>
      </section>

      <section className="collection" id="cava">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inventario actual</p>
            <h2>La cava</h2>
          </div>
          <p>{bottleCount} botellas · {wines.length} etiquetas · Actualizado por Juan</p>
        </div>

        <div className="wine-grid" id="ranking">
          {wines.map((wine) => (
            <article className="wine-card" key={wine.id} style={{ "--wine-accent": wine.accent } as React.CSSProperties}>
              <div className="rank">
                <span>{String(wine.rank).padStart(2, "0")}</span>
                <span className="rank-label">selección de Juan</span>
                <strong>{wine.juanScore}<small>/100</small></strong>
              </div>
              <div className="card-art" aria-hidden="true">
                <span className="art-year">{wine.vintage}</span>
                <Image src={wine.image} alt="" width={125} height={475} />
                <span className="art-region">{wine.region}</span>
              </div>
              <div className="card-copy">
                <p className="wine-style">{wine.style}</p>
                <h3>{wine.name}</h3>
                <p className="wine-note">{wine.shortNote}</p>
                <div className="pairing"><span>Para la mesa</span><p>{wine.pairing.slice(0, 2).join(" · ")}</p></div>
                <a href={`/vinos/${wine.id}`}>Abrir la ficha <span>→</span></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="juan-panel" id="juan">
        <div className="juan-number">J.</div>
        <div>
          <p className="eyebrow">Tu sommelier personal</p>
          <h2>Juan lleva la cuenta.<br />Vos disfrutás la copa.</h2>
        </div>
        <p>
          Contale por Telegram qué vino tomaste o mandale el enlace de una
          botella nueva. Él actualiza la cava y vuelve a pensar el ranking.
        </p>
        <span className="telegram-status">Próximamente en Telegram</span>
      </section>

      <footer>
        <a className="brand footer-brand" href="#inicio"><span className="brand-mark">CL</span><span>Cava Loiseau</span></a>
        <p>Una cava viva, curada botella a botella.</p>
        <a href="#inicio">Volver arriba ↑</a>
      </footer>
    </main>
  );
}
