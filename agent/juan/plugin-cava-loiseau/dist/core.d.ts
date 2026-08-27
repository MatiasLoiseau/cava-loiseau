export type WineRecord = {
    id: string;
    rank: number;
    juanScore: number;
    rankReason: string;
    rankingUpdatedAt: string;
    name: string;
    vintage: number;
    winery: string;
    style: string;
    composition: string;
    region: string;
    altitude: string | null;
    soil: string | null;
    aging: string | null;
    vinificationMethod?: string | null;
    cellarUntil: number;
    alcohol: string | null;
    awards: string[];
    quantity: number;
    addedAt: string;
    accent: string;
    image: string;
    sourceImageUrl: string;
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
export type WineDraft = Omit<WineRecord, "rank" | "rankingUpdatedAt" | "quantity" | "addedAt" | "image"> & {
    quantity?: number;
};
export type RankingEntry = {
    id: string;
    juanScore: number;
    rankReason: string;
};
export type PluginConfig = {
    repoPath: string;
    branch?: string;
};
type QueryResolution = {
    status: "matched";
    wine: WineRecord;
} | {
    status: "ambiguous";
    options: Array<Pick<WineRecord, "id" | "name" | "vintage">>;
} | {
    status: "not_found";
};
export declare function normalize(value: string): string;
export declare function resolveWineQuery(wines: WineRecord[], query: string): QueryResolution;
export declare function rankWines(wines: WineRecord[], tieOrder?: string[]): {
    rank: number;
    rankingUpdatedAt: string;
    id: string;
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
    vinificationMethod?: string | null;
    cellarUntil: number;
    alcohol: string | null;
    awards: string[];
    quantity: number;
    addedAt: string;
    accent: string;
    image: string;
    sourceImageUrl: string;
    sourceUrl: string;
    shortNote: string;
    didacticDescription: string;
    appearance: string;
    aroma: string;
    palate: string;
    servingAdvice: string;
    pairing: string[];
    learning: string;
}[];
export declare function consumeInventory(wines: WineRecord[], query: string, quantity?: number): {
    resolution: {
        status: "ambiguous";
        options: Array<Pick<WineRecord, "id" | "name" | "vintage">>;
    } | {
        status: "not_found";
    };
    wines: WineRecord[];
    consumed: null;
} | {
    resolution: {
        status: "matched";
        wine: WineRecord;
    };
    wines: {
        rank: number;
        rankingUpdatedAt: string;
        id: string;
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
        vinificationMethod?: string | null;
        cellarUntil: number;
        alcohol: string | null;
        awards: string[];
        quantity: number;
        addedAt: string;
        accent: string;
        image: string;
        sourceImageUrl: string;
        sourceUrl: string;
        shortNote: string;
        didacticDescription: string;
        appearance: string;
        aroma: string;
        palate: string;
        servingAdvice: string;
        pairing: string[];
        learning: string;
    }[];
    consumed: {
        id: string;
        name: string;
        quantity: number;
        removed: boolean;
    };
};
export declare function applyRerank(wines: WineRecord[], entries: RankingEntry[]): {
    rank: number;
    rankingUpdatedAt: string;
    id: string;
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
    vinificationMethod?: string | null;
    cellarUntil: number;
    alcohol: string | null;
    awards: string[];
    quantity: number;
    addedAt: string;
    accent: string;
    image: string;
    sourceImageUrl: string;
    sourceUrl: string;
    shortNote: string;
    didacticDescription: string;
    appearance: string;
    aroma: string;
    palate: string;
    servingAdvice: string;
    pairing: string[];
    learning: string;
}[];
export declare function assertBonvivirSource(value: string): URL;
export declare function assertBonvivirImage(value: string): URL;
export declare function detectImageType(bytes: Uint8Array): "png" | "jpg" | "webp";
export declare function listCellar(config: PluginConfig): Promise<{
    totalBottles: number;
    totalLabels: number;
    wines: {
        id: string;
        rank: number;
        juanScore: number;
        name: string;
        vintage: number;
        winery: string;
        style: string;
        region: string;
        quantity: number;
        shortNote: string;
        pairing: string[];
    }[];
}>;
export declare function consumeWine(config: PluginConfig, query: string, quantity?: number): Promise<{
    status: "ambiguous";
    options: Array<Pick<WineRecord, "id" | "name" | "vintage">>;
    changed: boolean;
} | {
    status: "not_found";
    changed: boolean;
} | {
    published: boolean;
    commit: string | null;
    warning?: string;
    changed: boolean;
    consumed: {
        id: string;
        name: string;
        quantity: number;
        removed: boolean;
    } | null;
    totalBottles: number;
    ranking: {
        rank: number;
        id: string;
        name: string;
        juanScore: number;
    }[];
}>;
export declare function addWine(config: PluginConfig, draft: WineDraft, signal?: AbortSignal): Promise<{
    published: boolean;
    commit: string | null;
    warning?: string;
    changed: boolean;
    added: {
        id: string;
        name: string;
        vintage: number;
        quantity: number;
    };
    totalBottles: number;
    ranking: {
        rank: number;
        id: string;
        name: string;
        juanScore: number;
    }[];
}>;
export declare function rerankCellar(config: PluginConfig, entries: RankingEntry[]): Promise<{
    changed: boolean;
    ranking: {
        rank: number;
        id: string;
        name: string;
        juanScore: number;
    }[];
} | {
    published: boolean;
    commit: string | null;
    warning?: string;
    changed: boolean;
    ranking: {
        rank: number;
        id: string;
        name: string;
        juanScore: number;
        rankReason: string;
    }[];
}>;
export {};
