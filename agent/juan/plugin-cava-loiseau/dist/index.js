import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { addWine, consumeWine, inspectBonvivirWine, listCellar, rerankCellar } from "./core.js";
const NullableString = Type.Union([Type.String({ maxLength: 500 }), Type.Null()]);
const ConfigSchema = Type.Object({
    repoPath: Type.String({ minLength: 1, pattern: "^/" }),
    branch: Type.Optional(Type.String({ default: "main", pattern: "^[A-Za-z0-9._/-]+$" })),
}, { additionalProperties: false });
const WineDraftSchema = Type.Object({
    id: Type.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 160 }),
    juanScore: Type.Number({ minimum: 0, maximum: 100 }),
    rankReason: Type.String({ minLength: 20, maxLength: 700 }),
    name: Type.String({ minLength: 2, maxLength: 180 }),
    vintage: Type.Integer({ minimum: 1900, maximum: 2100 }),
    winery: Type.String({ minLength: 2, maxLength: 160 }),
    style: Type.String({ minLength: 2, maxLength: 120 }),
    composition: Type.String({ minLength: 2, maxLength: 300 }),
    region: Type.String({ minLength: 2, maxLength: 220 }),
    altitude: NullableString,
    soil: NullableString,
    aging: NullableString,
    vinificationMethod: Type.Optional(NullableString),
    cellarUntil: Type.Integer({ minimum: 2020, maximum: 2200 }),
    alcohol: NullableString,
    awards: Type.Array(Type.String({ minLength: 2, maxLength: 160 }), { maxItems: 12 }),
    quantity: Type.Optional(Type.Integer({ minimum: 1, maximum: 99, default: 1 })),
    accent: Type.String({ pattern: "^#[0-9A-Fa-f]{6}$" }),
    sourceImageUrl: Type.String({
        pattern: "^https://backwebbonvivir-media\\.glanacion\\.com/",
        maxLength: 1000,
    }),
    sourceUrl: Type.String({
        pattern: "^https://bonvivir\\.com/la-cava-de-bonvivir/fichas-de-vinos/",
        maxLength: 1000,
    }),
    shortNote: Type.String({ minLength: 20, maxLength: 500 }),
    didacticDescription: Type.String({ minLength: 100, maxLength: 2500 }),
    appearance: Type.String({ minLength: 5, maxLength: 500 }),
    aroma: Type.String({ minLength: 5, maxLength: 800 }),
    palate: Type.String({ minLength: 5, maxLength: 800 }),
    servingAdvice: Type.String({ minLength: 10, maxLength: 600 }),
    pairing: Type.Array(Type.String({ minLength: 3, maxLength: 220 }), {
        minItems: 1,
        maxItems: 8,
    }),
    learning: Type.String({ minLength: 50, maxLength: 1200 }),
}, { additionalProperties: false });
const RankingEntrySchema = Type.Object({
    id: Type.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
    juanScore: Type.Number({ minimum: 0, maximum: 100 }),
    rankReason: Type.String({ minLength: 20, maxLength: 700 }),
}, { additionalProperties: false });
export default defineToolPlugin({
    id: "cava-loiseau",
    name: "Cava Loiseau",
    description: "Herramientas limitadas para administrar el inventario y ranking de Cava Loiseau.",
    configSchema: ConfigSchema,
    tools: (tool) => [
        tool({
            name: "cava_list",
            label: "Consultar Cava Loiseau",
            description: "Devuelve el inventario vigente y el ranking de Juan. Consultar antes de recomendar o mutar.",
            parameters: Type.Object({}, { additionalProperties: false }),
            optional: true,
            execute: (_params, config) => listCellar(config),
        }),
        tool({
            name: "cava_consume",
            label: "Registrar vino consumido",
            description: "Descuenta una botella sólo cuando la referencia coincide de forma única; si es ambigua no modifica nada.",
            parameters: Type.Object({
                query: Type.String({ minLength: 2, maxLength: 200 }),
                quantity: Type.Optional(Type.Integer({ minimum: 1, maximum: 99, default: 1 })),
            }, { additionalProperties: false }),
            optional: true,
            execute: ({ query, quantity }, config) => consumeWine(config, query, quantity ?? 1),
        }),
        tool({
            name: "cava_inspect",
            label: "Investigar ficha de Bonvivir",
            description: "Extrae y valida la ficha técnica y la imagen oficial embebidas en una URL de Bonvivir, incluso cuando la vista pública oculta los datos.",
            parameters: Type.Object({
                sourceUrl: Type.String({
                    pattern: "^https://bonvivir\\.com/la-cava-de-bonvivir/fichas-de-vinos/",
                    maxLength: 1000,
                }),
            }, { additionalProperties: false }),
            optional: true,
            execute: ({ sourceUrl }, _config, context) => inspectBonvivirWine(sourceUrl, context.signal),
        }),
        tool({
            name: "cava_add",
            label: "Agregar vino",
            description: "Agrega una ficha completa investigada desde Bonvivir, descarga su imagen autorizada, recalcula el ranking y publica.",
            parameters: Type.Object({ wine: WineDraftSchema }, { additionalProperties: false }),
            optional: true,
            execute: ({ wine }, config, context) => addWine(config, wine, context.signal),
        }),
        tool({
            name: "cava_rerank",
            label: "Actualizar ranking de Juan",
            description: "Reordena la cava. Exige exactamente todos los IDs actuales con puntaje y fundamento.",
            parameters: Type.Object({ ranking: Type.Array(RankingEntrySchema, { minItems: 1, maxItems: 200 }) }, { additionalProperties: false }),
            optional: true,
            execute: ({ ranking }, config) => rerankCellar(config, ranking),
        }),
    ],
});
