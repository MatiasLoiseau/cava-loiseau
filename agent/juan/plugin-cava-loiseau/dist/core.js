import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const ALLOWED_REMOTES = new Set([
    "git@github.com:MatiasLoiseau/cava-loiseau.git",
    "https://github.com/MatiasLoiseau/cava-loiseau.git",
]);
const GENERATED_MANIFEST_PATH = "agent/juan/plugin-cava-loiseau/openclaw.plugin.json";
const stopWords = new Set([
    "a", "al", "de", "del", "el", "la", "las", "lo", "los", "me", "mi", "un", "una",
    "vino", "botella", "tome", "tomo", "tomé", "ya",
]);
let mutationQueue = Promise.resolve();
function today() {
    return new Date().toISOString().slice(0, 10);
}
export function normalize(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}
function canonicalJson(value, path = []) {
    if (Array.isArray(value)) {
        const items = value.map((item) => canonicalJson(item, path));
        return path.join(".") === "contracts.tools"
            ? [...items].sort((left, right) => String(left).localeCompare(String(right)))
            : items;
    }
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalJson(item, [...path, key])]));
}
export function arePluginManifestsSemanticallyEqual(left, right) {
    try {
        return JSON.stringify(canonicalJson(JSON.parse(left))) ===
            JSON.stringify(canonicalJson(JSON.parse(right)));
    }
    catch {
        return false;
    }
}
function queryTokens(value) {
    return normalize(value)
        .split(" ")
        .filter((token) => token && !stopWords.has(token));
}
export function resolveWineQuery(wines, query) {
    const normalizedQuery = normalize(query);
    const tokens = queryTokens(query);
    if (!normalizedQuery || tokens.length === 0)
        return { status: "not_found" };
    const exact = wines.filter((wine) => {
        const exactValues = [wine.id, wine.name, `${wine.name} ${wine.vintage}`].map(normalize);
        return exactValues.includes(normalizedQuery);
    });
    if (exact.length === 1)
        return { status: "matched", wine: exact[0] };
    const candidates = wines.filter((wine) => {
        const haystack = normalize(`${wine.id} ${wine.name} ${wine.winery} ${wine.style} ${wine.vintage}`);
        return tokens.every((token) => haystack.includes(token));
    });
    if (candidates.length === 1)
        return { status: "matched", wine: candidates[0] };
    if (candidates.length > 1) {
        return {
            status: "ambiguous",
            options: candidates.map(({ id, name, vintage }) => ({ id, name, vintage })),
        };
    }
    return { status: "not_found" };
}
export function rankWines(wines, tieOrder = []) {
    const order = new Map(tieOrder.map((id, index) => [id, index]));
    const ranked = [...wines].sort((left, right) => {
        const scoreDifference = right.juanScore - left.juanScore;
        if (scoreDifference !== 0)
            return scoreDifference;
        const leftOrder = order.get(left.id) ?? left.rank ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = order.get(right.id) ?? right.rank ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder)
            return leftOrder - rightOrder;
        return left.name.localeCompare(right.name, "es");
    });
    const updatedAt = today();
    return ranked.map((wine, index) => ({
        ...wine,
        rank: index + 1,
        rankingUpdatedAt: updatedAt,
    }));
}
export function consumeInventory(wines, query, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("La cantidad a descontar debe ser un entero positivo.");
    }
    const resolution = resolveWineQuery(wines, query);
    if (resolution.status !== "matched")
        return { resolution, wines, consumed: null };
    const target = resolution.wine;
    if (quantity > target.quantity) {
        throw new Error(`Sólo hay ${target.quantity} botella(s) de ${target.name}.`);
    }
    const remaining = wines.flatMap((wine) => {
        if (wine.id !== target.id)
            return [wine];
        const nextQuantity = wine.quantity - quantity;
        return nextQuantity > 0 ? [{ ...wine, quantity: nextQuantity }] : [];
    });
    return {
        resolution,
        wines: rankWines(remaining),
        consumed: {
            id: target.id,
            name: target.name,
            quantity,
            removed: target.quantity === quantity,
        },
    };
}
export function applyRerank(wines, entries) {
    const currentIds = new Set(wines.map((wine) => wine.id));
    const suppliedIds = new Set(entries.map((entry) => entry.id));
    if (entries.length !== wines.length || suppliedIds.size !== entries.length) {
        throw new Error("El ranking debe incluir cada vino actual exactamente una vez.");
    }
    for (const id of currentIds) {
        if (!suppliedIds.has(id))
            throw new Error(`Falta el vino ${id} en el ranking.`);
    }
    for (const id of suppliedIds) {
        if (!currentIds.has(id))
            throw new Error(`El ranking incluye un vino inexistente: ${id}.`);
    }
    const updates = new Map(entries.map((entry) => [entry.id, entry]));
    const updated = wines.map((wine) => {
        const entry = updates.get(wine.id);
        return { ...wine, juanScore: entry.juanScore, rankReason: entry.rankReason };
    });
    return rankWines(updated, entries.map((entry) => entry.id));
}
export function assertBonvivirSource(value) {
    const url = new URL(value);
    if (url.protocol !== "https:" ||
        url.hostname !== "bonvivir.com" ||
        !url.pathname.startsWith("/la-cava-de-bonvivir/fichas-de-vinos/")) {
        throw new Error("La ficha debe ser una URL HTTPS de Bonvivir.");
    }
    return url;
}
export function assertBonvivirImage(value) {
    const url = new URL(value);
    if (url.protocol !== "https:" ||
        url.hostname !== "backwebbonvivir-media.glanacion.com") {
        throw new Error("La imagen debe provenir del CDN autorizado de Bonvivir.");
    }
    return url;
}
function readBoundedBody(response, maxBytes, signal) {
    if (!response.body)
        throw new Error("Bonvivir devolvió una respuesta vacía.");
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > maxBytes)
        throw new Error("La ficha de Bonvivir supera el límite permitido.");
    return (async () => {
        const reader = response.body.getReader();
        const chunks = [];
        let total = 0;
        while (true) {
            if (signal?.aborted) {
                await reader.cancel();
                throw new Error("La consulta a Bonvivir fue cancelada.");
            }
            const { done, value } = await reader.read();
            if (done)
                break;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel();
                throw new Error("La ficha de Bonvivir supera el límite permitido.");
            }
            chunks.push(value);
        }
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return new TextDecoder().decode(bytes);
    })();
}
function extractJsonObject(source, start) {
    if (source[start] !== "{")
        throw new Error("La ficha embebida de Bonvivir es inválida.");
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
        const character = source[index];
        if (inString) {
            if (escaped)
                escaped = false;
            else if (character === "\\")
                escaped = true;
            else if (character === '"')
                inString = false;
            continue;
        }
        if (character === '"')
            inString = true;
        else if (character === "{")
            depth += 1;
        else if (character === "}") {
            depth -= 1;
            if (depth === 0)
                return source.slice(start, index + 1);
        }
    }
    throw new Error("La ficha embebida de Bonvivir está incompleta.");
}
function optionalString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}
function humanizeCellarSlug(value) {
    const slug = optionalString(value);
    if (!slug)
        return null;
    return slug
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
export function extractBonvivirProfileFromHtml(html, sourceUrl) {
    const source = assertBonvivirSource(sourceUrl);
    const marker = '"wineProfileReducer":{"data":';
    const markerIndex = html.indexOf(marker);
    if (markerIndex < 0) {
        throw new Error("Bonvivir no expuso una ficha técnica embebida para este vino.");
    }
    const objectStart = html.indexOf("{", markerIndex + marker.length);
    const data = JSON.parse(extractJsonObject(html, objectStart));
    const wineCard = (data.wineCard ?? {});
    const wineImage = (wineCard.wineImage ?? {});
    const image = optionalString(wineImage.src);
    if (!image)
        throw new Error("La ficha de Bonvivir no incluye la imagen oficial del vino.");
    assertBonvivirImage(image);
    const rawTechnical = Array.isArray(data.technicalProfile) ? data.technicalProfile : [];
    const technical = new Map();
    for (const item of rawTechnical) {
        if (!item || typeof item !== "object")
            continue;
        const entry = item;
        const title = optionalString(entry.title);
        const description = optionalString(entry.description);
        if (title && description)
            technical.set(normalize(title), description);
    }
    const title = optionalString(wineCard.title);
    const vintageText = technical.get("cosecha");
    const vintage = Number(vintageText);
    if (!title || !Number.isInteger(vintage) || vintage < 1900 || vintage > 2100) {
        throw new Error("La ficha de Bonvivir no incluye un nombre y una cosecha válidos.");
    }
    const miniPairings = Array.isArray(data.miniPairings) ? data.miniPairings : [];
    const pairingSuggestions = miniPairings.flatMap((item) => {
        if (!item || typeof item !== "object")
            return [];
        const title = optionalString(item.title);
        return title ? [title] : [];
    });
    const pairingCard = (data.pairingCard ?? {});
    const featuredPairing = optionalString(pairingCard.title);
    if (featuredPairing && !pairingSuggestions.some((item) => item.includes(featuredPairing))) {
        pairingSuggestions.push(featuredPairing);
    }
    const cleanName = title.replace(new RegExp(`\\s+${vintage}\\s*$`), "").trim();
    const pathParts = source.pathname.split("/").filter(Boolean);
    const id = pathParts.at(-1);
    const field = (name) => technical.get(normalize(name)) ?? null;
    return {
        sourceUrl: source.href,
        id,
        name: cleanName,
        vintage,
        subtitle: optionalString(wineCard.subtitle),
        wineryHint: humanizeCellarSlug(wineCard.cellarLink),
        composition: field("Composición"),
        region: field("Región"),
        aging: field("Crianza"),
        cellarUntil: Number.isInteger(Number(field("Potencial de guarda")))
            ? Number(field("Potencial de guarda"))
            : null,
        appearance: field("Visual"),
        aroma: field("En nariz"),
        palate: field("En boca"),
        sourceImageUrl: image,
        pairingSuggestions,
        missingOnBonvivir: ["altitude", "soil", "alcohol", "awards"],
    };
}
export async function inspectBonvivirWine(sourceUrl, signal) {
    const source = assertBonvivirSource(sourceUrl);
    const response = await fetch(source, {
        signal,
        redirect: "error",
        headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent": "CavaLoiseau-Juan/1.0",
        },
    });
    if (!response.ok) {
        throw new Error(`No se pudo consultar la ficha de Bonvivir (HTTP ${response.status}).`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
        throw new Error("Bonvivir no devolvió una ficha HTML válida.");
    }
    const html = await readBoundedBody(response, MAX_HTML_BYTES, signal);
    return extractBonvivirProfileFromHtml(html, source.href);
}
export function detectImageType(bytes) {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((value, index) => bytes[index] === value))
        return "png";
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
        return "jpg";
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP")
        return "webp";
    throw new Error("La descarga no es una imagen PNG, JPEG o WebP válida.");
}
async function downloadImage(value, signal) {
    let url = assertBonvivirImage(value);
    let response;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
        response = await fetch(url, {
            signal,
            redirect: "manual",
            headers: { "user-agent": "CavaLoiseau-Juan/1.0" },
        });
        if (![301, 302, 303, 307, 308].includes(response.status))
            break;
        const location = response.headers.get("location");
        if (!location || redirects === 3) {
            throw new Error("La imagen de Bonvivir tiene una redirección inválida.");
        }
        url = assertBonvivirImage(new URL(location, url).href);
    }
    if (!response)
        throw new Error("No se pudo iniciar la descarga de la imagen.");
    if (!response.ok || !response.body) {
        throw new Error(`No se pudo descargar la imagen de Bonvivir (HTTP ${response.status}).`);
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_IMAGE_BYTES)
        throw new Error("La imagen supera el límite de 5 MB.");
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
        const { done, value: chunk } = await reader.read();
        if (done)
            break;
        total += chunk.byteLength;
        if (total > MAX_IMAGE_BYTES) {
            await reader.cancel();
            throw new Error("La imagen supera el límite de 5 MB.");
        }
        chunks.push(chunk);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return { bytes, extension: detectImageType(bytes) };
}
async function atomicWrite(path, contents) {
    const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
    await writeFile(temporary, contents, { flag: "wx", mode: 0o644 });
    await rename(temporary, path);
}
function runGit(repoPath, args, timeout = 30_000) {
    return new Promise((resolve, reject) => {
        execFile("git", args, { cwd: repoPath, encoding: "utf8", timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Git no pudo completar ${args[0]}.`));
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}
async function openRepository(config) {
    if (!isAbsolute(config.repoPath))
        throw new Error("repoPath debe ser una ruta absoluta.");
    const repoPath = await realpath(config.repoPath);
    const dataPath = join(repoPath, "data", "wines.json");
    const imageDirectory = join(repoPath, "public", "wines");
    const dataStat = await lstat(dataPath);
    if (!dataStat.isFile() || dataStat.isSymbolicLink()) {
        throw new Error("data/wines.json debe ser un archivo regular, no un enlace.");
    }
    await mkdir(imageDirectory, { recursive: true });
    const imageStat = await lstat(imageDirectory);
    if (!imageStat.isDirectory() || imageStat.isSymbolicLink()) {
        throw new Error("public/wines debe ser un directorio regular.");
    }
    const root = (await runGit(repoPath, ["rev-parse", "--show-toplevel"])).stdout.trim();
    if ((await realpath(root)) !== repoPath)
        throw new Error("repoPath no coincide con la raíz Git.");
    const branch = config.branch ?? "main";
    const activeBranch = (await runGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
    if (activeBranch !== branch)
        throw new Error(`La rama activa debe ser ${branch}.`);
    const remote = (await runGit(repoPath, ["remote", "get-url", "origin"])).stdout.trim();
    if (!ALLOWED_REMOTES.has(remote))
        throw new Error("El remoto origin no es MatiasLoiseau/cava-loiseau.");
    return { repoPath, dataPath, imageDirectory, branch };
}
async function readCellar(dataPath) {
    const text = await readFile(dataPath, "utf8");
    const wines = JSON.parse(text);
    if (!Array.isArray(wines))
        throw new Error("data/wines.json no contiene una lista válida.");
    for (const wine of wines) {
        if (!wine.id || !wine.name || !Number.isInteger(wine.quantity) || wine.quantity < 1) {
            throw new Error("El inventario contiene un registro inválido.");
        }
    }
    return { text, wines };
}
async function ensureClean(repoPath) {
    const status = (await runGit(repoPath, ["status", "--porcelain", "--untracked-files=no"])).stdout.trim();
    if (status)
        throw new Error("El checkout tiene cambios pendientes; Juan no modificó nada.");
}
async function repairGeneratedManifestNoise(repoPath) {
    const status = (await runGit(repoPath, ["status", "--porcelain", "--untracked-files=no"])).stdout
        .split("\n")
        .filter(Boolean);
    const manifestStatus = status.find((line) => line.slice(3) === GENERATED_MANIFEST_PATH);
    if (!manifestStatus || manifestStatus.slice(0, 2) !== " M")
        return;
    const worktree = await readFile(join(repoPath, GENERATED_MANIFEST_PATH), "utf8");
    const head = (await runGit(repoPath, ["show", `HEAD:${GENERATED_MANIFEST_PATH}`])).stdout;
    if (!arePluginManifestsSemanticallyEqual(worktree, head))
        return;
    await runGit(repoPath, ["restore", "--worktree", "--", GENERATED_MANIFEST_PATH]);
}
async function branchDistance(repoPath, branch) {
    const output = (await runGit(repoPath, ["rev-list", "--left-right", "--count", `${branch}...origin/${branch}`])).stdout.trim();
    const [ahead, behind] = output.split(/\s+/).map(Number);
    if (!Number.isInteger(ahead) || !Number.isInteger(behind)) {
        throw new Error("Git devolvió un estado de sincronización inválido.");
    }
    return { ahead, behind };
}
async function rebaseOntoRemote(repoPath, branch) {
    try {
        await runGit(repoPath, ["rebase", `origin/${branch}`], 60_000);
    }
    catch {
        await runGit(repoPath, ["rebase", "--abort"]).catch(() => undefined);
        throw new Error("GitHub y la copia de Ironforge cambiaron el mismo contenido. Juan conservó ambos trabajos, pero necesita revisión humana para decidir la combinación.");
    }
}
async function prepareMutation(repository) {
    await repairGeneratedManifestNoise(repository.repoPath);
    await ensureClean(repository.repoPath);
    try {
        await runGit(repository.repoPath, ["fetch", "origin", repository.branch], 60_000);
    }
    catch {
        throw new Error("Juan no pudo sincronizar la cava con GitHub; no modificó nada.");
    }
    const distance = await branchDistance(repository.repoPath, repository.branch);
    if (distance.ahead > 0 && distance.behind > 0) {
        await rebaseOntoRemote(repository.repoPath, repository.branch);
        await runGit(repository.repoPath, ["push", "origin", repository.branch], 60_000).catch(() => {
            throw new Error("Juan combinó los cambios, pero no pudo publicar los commits pendientes.");
        });
    }
    else if (distance.behind > 0) {
        await runGit(repository.repoPath, ["merge", "--ff-only", `origin/${repository.branch}`]);
    }
    else if (distance.ahead > 0) {
        await runGit(repository.repoPath, ["push", "origin", repository.branch], 60_000).catch(() => {
            throw new Error("Juan encontró commits locales pendientes, pero no pudo publicarlos en GitHub.");
        });
    }
    await ensureClean(repository.repoPath);
}
async function retryPushAfterSync(repository) {
    try {
        await runGit(repository.repoPath, ["fetch", "origin", repository.branch], 60_000);
        const distance = await branchDistance(repository.repoPath, repository.branch);
        if (distance.behind > 0)
            await rebaseOntoRemote(repository.repoPath, repository.branch);
        await runGit(repository.repoPath, ["push", "origin", repository.branch], 60_000);
        return true;
    }
    catch {
        return false;
    }
}
async function publishMutation(repository, originalData, changedPaths, message, newImagePath) {
    try {
        await runGit(repository.repoPath, ["add", "--", ...changedPaths]);
        await runGit(repository.repoPath, ["commit", "--no-gpg-sign", "-m", message]);
    }
    catch (error) {
        await atomicWrite(repository.dataPath, originalData);
        if (newImagePath)
            await unlink(newImagePath).catch(() => undefined);
        await runGit(repository.repoPath, ["restore", "--staged", "--", ...changedPaths]).catch(() => undefined);
        throw error;
    }
    const commit = (await runGit(repository.repoPath, ["rev-parse", "HEAD"])).stdout.trim();
    try {
        await runGit(repository.repoPath, ["push", "origin", repository.branch], 60_000);
        return { published: true, commit };
    }
    catch {
        if (await retryPushAfterSync(repository))
            return { published: true, commit };
        return {
            published: false,
            commit,
            warning: "El cambio quedó confirmado en Ironforge, pero el push a GitHub está pendiente.",
        };
    }
}
function enqueueMutation(operation) {
    const next = mutationQueue.then(operation, operation);
    mutationQueue = next.then(() => undefined, () => undefined);
    return next;
}
export async function listCellar(config) {
    const repository = await openRepository(config);
    const { wines } = await readCellar(repository.dataPath);
    return {
        totalBottles: wines.reduce((total, wine) => total + wine.quantity, 0),
        totalLabels: wines.length,
        wines: [...wines]
            .sort((left, right) => left.rank - right.rank)
            .map(({ id, rank, juanScore, name, vintage, winery, style, region, quantity, shortNote, pairing }) => ({
            id, rank, juanScore, name, vintage, winery, style, region, quantity, shortNote, pairing,
        })),
    };
}
export async function consumeWine(config, query, quantity = 1) {
    return enqueueMutation(async () => {
        const repository = await openRepository(config);
        await prepareMutation(repository);
        const { text, wines } = await readCellar(repository.dataPath);
        const result = consumeInventory(wines, query, quantity);
        if (result.resolution.status !== "matched") {
            return { changed: false, ...result.resolution };
        }
        await atomicWrite(repository.dataPath, `${JSON.stringify(result.wines, null, 2)}\n`);
        const publish = await publishMutation(repository, text, ["data/wines.json"], `cava: registrar consumo de ${result.consumed.name}`);
        return {
            changed: true,
            consumed: result.consumed,
            totalBottles: result.wines.reduce((total, wine) => total + wine.quantity, 0),
            ranking: result.wines.map(({ rank, id, name, juanScore }) => ({ rank, id, name, juanScore })),
            ...publish,
        };
    });
}
export async function addWine(config, draft, signal) {
    return enqueueMutation(async () => {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) {
            throw new Error("El id del vino no es un slug válido.");
        }
        assertBonvivirSource(draft.sourceUrl);
        assertBonvivirImage(draft.sourceImageUrl);
        const repository = await openRepository(config);
        await prepareMutation(repository);
        const { text, wines } = await readCellar(repository.dataPath);
        if (wines.some((wine) => wine.id === draft.id || wine.sourceUrl === draft.sourceUrl)) {
            throw new Error("Ese vino ya existe en la cava.");
        }
        const { bytes, extension } = await downloadImage(draft.sourceImageUrl, signal);
        const imageFilename = `${draft.id}.${extension}`;
        const imagePath = join(repository.imageDirectory, imageFilename);
        try {
            await lstat(imagePath);
            throw new Error("Ya existe una imagen con ese identificador.");
        }
        catch (error) {
            if (error.code !== "ENOENT")
                throw error;
        }
        const now = today();
        const record = {
            ...draft,
            quantity: draft.quantity ?? 1,
            rank: wines.length + 1,
            rankingUpdatedAt: now,
            addedAt: now,
            image: `/wines/${imageFilename}`,
        };
        const nextWines = rankWines([...wines, record]);
        await writeFile(imagePath, bytes, { flag: "wx", mode: 0o644 }).catch((error) => {
            if (error.code === "EEXIST") {
                throw new Error("Ya existe una imagen con ese identificador.");
            }
            throw error;
        });
        try {
            await atomicWrite(repository.dataPath, `${JSON.stringify(nextWines, null, 2)}\n`);
        }
        catch (error) {
            await unlink(imagePath).catch(() => undefined);
            throw error;
        }
        const publish = await publishMutation(repository, text, ["data/wines.json", `public/wines/${imageFilename}`], `cava: agregar ${record.name} ${record.vintage}`, imagePath);
        return {
            changed: true,
            added: { id: record.id, name: record.name, vintage: record.vintage, quantity: record.quantity },
            totalBottles: nextWines.reduce((total, wine) => total + wine.quantity, 0),
            ranking: nextWines.map(({ rank, id, name, juanScore }) => ({ rank, id, name, juanScore })),
            ...publish,
        };
    });
}
export async function rerankCellar(config, entries) {
    return enqueueMutation(async () => {
        const repository = await openRepository(config);
        await prepareMutation(repository);
        const { text, wines } = await readCellar(repository.dataPath);
        const nextWines = applyRerank(wines, entries);
        const nextText = `${JSON.stringify(nextWines, null, 2)}\n`;
        if (nextText === text) {
            return { changed: false, ranking: nextWines.map(({ rank, id, name, juanScore }) => ({ rank, id, name, juanScore })) };
        }
        await atomicWrite(repository.dataPath, nextText);
        const publish = await publishMutation(repository, text, ["data/wines.json"], "cava: actualizar ranking de Juan");
        return {
            changed: true,
            ranking: nextWines.map(({ rank, id, name, juanScore, rankReason }) => ({ rank, id, name, juanScore, rankReason })),
            ...publish,
        };
    });
}
