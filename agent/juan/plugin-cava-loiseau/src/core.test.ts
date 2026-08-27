import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRerank,
  assertBonvivirImage,
  assertBonvivirSource,
  consumeInventory,
  detectImageType,
  normalize,
  rankWines,
  resolveWineQuery,
  type WineRecord,
} from "./core.js";

function wine(overrides: Partial<WineRecord>): WineRecord {
  return {
    id: "vino-base-2024",
    rank: 1,
    juanScore: 90,
    rankReason: "Un fundamento editorial suficientemente detallado.",
    rankingUpdatedAt: "2026-08-27",
    name: "Vino Base",
    vintage: 2024,
    winery: "Bodega Base",
    style: "Malbec",
    composition: "100% Malbec",
    region: "Mendoza",
    altitude: null,
    soil: null,
    aging: null,
    cellarUntil: 2029,
    alcohol: null,
    awards: [],
    quantity: 1,
    addedAt: "2026-08-27",
    accent: "#76223a",
    image: "/wines/vino-base-2024.png",
    sourceImageUrl: "https://backwebbonvivir-media.glanacion.com/vino.png",
    sourceUrl: "https://bonvivir.com/la-cava-de-bonvivir/fichas-de-vinos/vino-base-2024",
    shortNote: "Un vino base para probar el plugin de la cava.",
    didacticDescription: "Descripción didáctica del vino base para las pruebas unitarias del plugin.",
    appearance: "Rubí.",
    aroma: "Fruta roja.",
    palate: "Fresco.",
    servingAdvice: "Servir a 16 °C.",
    pairing: ["Pastas"],
    learning: "Una nota de aprendizaje suficientemente explicativa para la prueba.",
    ...overrides,
  };
}

test("normaliza acentos y resuelve una referencia conversacional única", () => {
  const wines = [
    wine({ id: "jorge-rubio-premiado-malbec-2022", name: "Jorge Rubio Premiado Malbec", winery: "Jorge Rubio" }),
    wine({ id: "otro-malbec-2022", name: "Otro Malbec", winery: "Otra Bodega", rank: 2 }),
  ];
  assert.equal(normalize("Tomé el Jorge Rubío"), "tome el jorge rubio");
  const result = resolveWineQuery(wines, "ya me tomé el vino de Jorge Rubio");
  assert.equal(result.status, "matched");
  if (result.status === "matched") assert.equal(result.wine.id, "jorge-rubio-premiado-malbec-2022");
});

test("no muta cuando la referencia es ambigua", () => {
  const wines = [
    wine({ id: "malbec-uno", name: "Malbec Uno" }),
    wine({ id: "malbec-dos", name: "Malbec Dos", rank: 2 }),
  ];
  const result = consumeInventory(wines, "Malbec");
  assert.equal(result.resolution.status, "ambiguous");
  assert.equal(result.wines, wines);
  assert.equal(result.consumed, null);
});

test("descuenta cantidad y elimina la etiqueta sólo al llegar a cero", () => {
  const stocked = wine({ quantity: 2 });
  const first = consumeInventory([stocked], "Vino Base", 1);
  assert.equal(first.wines[0].quantity, 1);
  assert.equal(first.consumed?.removed, false);
  const second = consumeInventory(first.wines, "Vino Base", 1);
  assert.equal(second.wines.length, 0);
  assert.equal(second.consumed?.removed, true);
});

test("ordena por puntaje y exige un ranking completo", () => {
  const low = wine({ id: "vino-bajo", name: "Vino Bajo", juanScore: 80 });
  const high = wine({ id: "vino-alto", name: "Vino Alto", juanScore: 95, rank: 2 });
  assert.deepEqual(rankWines([low, high]).map((item) => item.id), ["vino-alto", "vino-bajo"]);

  assert.throws(
    () => applyRerank([low, high], [{ id: "vino-alto", juanScore: 90, rankReason: "Fundamento completo del vino alto." }]),
    /cada vino actual exactamente una vez/,
  );
});

test("acepta únicamente fuentes y bytes de imagen autorizados", () => {
  assert.doesNotThrow(() => assertBonvivirSource("https://bonvivir.com/la-cava-de-bonvivir/fichas-de-vinos/ejemplo"));
  assert.throws(() => assertBonvivirSource("https://example.com/vino"));
  assert.doesNotThrow(() => assertBonvivirImage("https://backwebbonvivir-media.glanacion.com/vino.png"));
  assert.throws(() => assertBonvivirImage("https://example.com/vino.png"));
  assert.equal(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.throws(() => detectImageType(Uint8Array.from([1, 2, 3, 4])));
});
