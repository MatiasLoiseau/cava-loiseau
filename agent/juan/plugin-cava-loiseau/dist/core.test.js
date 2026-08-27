import assert from "node:assert/strict";
import test from "node:test";
import { applyRerank, arePluginManifestsSemanticallyEqual, assertBonvivirImage, assertBonvivirSource, consumeInventory, detectImageType, extractBonvivirProfileFromHtml, normalize, rankWines, resolveWineQuery, } from "./core.js";
function wine(overrides) {
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
    if (result.status === "matched")
        assert.equal(result.wine.id, "jorge-rubio-premiado-malbec-2022");
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
    assert.throws(() => applyRerank([low, high], [{ id: "vino-alto", juanScore: 90, rankReason: "Fundamento completo del vino alto." }]), /cada vino actual exactamente una vez/);
});
test("acepta únicamente fuentes y bytes de imagen autorizados", () => {
    assert.doesNotThrow(() => assertBonvivirSource("https://bonvivir.com/la-cava-de-bonvivir/fichas-de-vinos/ejemplo"));
    assert.throws(() => assertBonvivirSource("https://example.com/vino"));
    assert.doesNotThrow(() => assertBonvivirImage("https://backwebbonvivir-media.glanacion.com/vino.png"));
    assert.throws(() => assertBonvivirImage("https://example.com/vino.png"));
    assert.equal(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
    assert.throws(() => detectImageType(Uint8Array.from([1, 2, 3, 4])));
});
test("extrae la ficha técnica embebida de Bonvivir aunque esté oculta en la vista", () => {
    const data = {
        wineCard: {
            title: "Gran Sombrero Corte Singular Red Blend 2025 ",
            subtitle: "Blend moderno.",
            cellarLink: "huentala-wines",
            wineImage: {
                src: "https://backwebbonvivir-media.glanacion.com/gran_sombrero.png?auto=webp",
            },
        },
        technicalProfile: [
            { title: "Cosecha", description: "2025" },
            { title: "Composición", description: "50% Malbec, 50% Cabernet Franc" },
            { title: "Región", description: "Gualtallary, Valle de Uco - Mendoza" },
            { title: "Crianza", description: "30% del corte por 9 meses en barricas de 2do uso" },
            { title: "Potencial de guarda", description: "2030" },
            { title: "Visual", description: "Rojo rubí intenso." },
            { title: "En nariz", description: "Ciruelas, moras y violetas." },
            { title: "En boca", description: "Jugoso, fresco y persistente." },
        ],
        miniPairings: [{ title: "Locro con cerdo y carnes rojas." }],
    };
    const html = `<script>{"wineProfileReducer":{"data":${JSON.stringify(data)}}}</script>`;
    const result = extractBonvivirProfileFromHtml(html, "https://bonvivir.com/la-cava-de-bonvivir/fichas-de-vinos/gran-sombrero-corte-singular-red-blend-2025");
    assert.equal(result.id, "gran-sombrero-corte-singular-red-blend-2025");
    assert.equal(result.name, "Gran Sombrero Corte Singular Red Blend");
    assert.equal(result.vintage, 2025);
    assert.equal(result.wineryHint, "Huentala Wines");
    assert.equal(result.composition, "50% Malbec, 50% Cabernet Franc");
    assert.equal(result.cellarUntil, 2030);
    assert.equal(result.pairingSuggestions[0], "Locro con cerdo y carnes rojas.");
});
test("tolera sólo reordenamientos semánticos del manifiesto generado", () => {
    const left = JSON.stringify({
        contracts: { tools: ["cava_list", "cava_inspect", "cava_add"] },
        toolMetadata: { cava_list: { optional: true }, cava_inspect: { optional: true } },
    });
    const reordered = JSON.stringify({
        toolMetadata: { cava_inspect: { optional: true }, cava_list: { optional: true } },
        contracts: { tools: ["cava_add", "cava_list", "cava_inspect"] },
    });
    const changed = JSON.stringify({
        contracts: { tools: ["cava_list", "cava_add"] },
        toolMetadata: { cava_list: { optional: true }, cava_inspect: { optional: true } },
    });
    assert.equal(arePluginManifestsSemanticallyEqual(left, reordered), true);
    assert.equal(arePluginManifestsSemanticallyEqual(left, changed), false);
});
