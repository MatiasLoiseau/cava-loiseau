import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://cava-loiseau.test${path}`, {
      headers: { accept: "text/html", host: "cava-loiseau.test" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the complete cellar and Juan ranking", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Cava Loiseau — Tu vinoteca personal<\/title>/i);
  assert.match(html, /Tu cava,/);
  assert.match(html, /Ranking de Juan/i);
  assert.match(html, /Finca Decero Signature Red Blend/);
  assert.match(html, /Cicchitti Gran Reserva Malbec/);
  assert.match(html, /Manos Negras Red Soil Pinot Noir/);
  assert.match(html, /https:\/\/cava-loiseau\.test\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("renders representative wine routes with specific content and social metadata", async () => {
  const cases = [
    {
      path: "/vinos/finca-decero-signature-red-blend-2022",
      title: /<title>Finca Decero Signature Red Blend 2022 — Cava Loiseau<\/title>/i,
      fact: /42% Cabernet Sauvignon/,
      lesson: /Una clase/,
      image: /https:\/\/cava-loiseau\.test\/wines\/finca-decero-signature-red-blend-2022\.png/,
    },
    {
      path: "/vinos/manos-negras-red-soil-pinot-noir-2024",
      title: /<title>Manos Negras Red Soil Pinot Noir 2024 — Cava Loiseau<\/title>/i,
      fact: /100% Pinot Noir/,
      lesson: /notas de tierra, té u hongos pueden ser parte de su complejidad/i,
      image: /https:\/\/cava-loiseau\.test\/wines\/manos-negras-red-soil-pinot-noir-2024\.png/,
    },
  ];

  for (const route of cases) {
    const response = await render(route.path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, route.title);
    assert.match(html, route.fact);
    assert.match(html, route.lesson);
    assert.match(html, route.image);
    assert.doesNotMatch(html, /https:\/\/cava-loiseau\.test\/og\.png/);
  }
});
