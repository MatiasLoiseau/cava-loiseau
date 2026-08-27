import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import wines from "../data/wines.json" with { type: "json" };

const outputRoot = new URL("../vercel-dist/", import.meta.url);
const clientRoot = new URL("../dist/client/", import.meta.url);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("build", Date.now().toString());

const productionHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL ??
  "cava-loiseau.vercel.app";

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(clientRoot, outputRoot, { recursive: true });

const { default: worker } = await import(workerUrl.href);
const routes = [
  { path: "/", file: "index.html" },
  ...wines.map((wine) => ({
    path: `/vinos/${wine.id}`,
    file: `vinos/${wine.id}.html`,
  })),
];

for (const route of routes) {
  const response = await worker.fetch(
    new Request(`https://${productionHost}${route.path}`, {
      headers: {
        accept: "text/html",
        host: productionHost,
        "x-forwarded-host": productionHost,
        "x-forwarded-proto": "https",
      },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  if (!response.ok) {
    throw new Error(`Could not prerender ${route.path}: HTTP ${response.status}`);
  }

  const target = new URL(route.file, outputRoot);
  await mkdir(new URL("./", target), { recursive: true });
  await writeFile(target, await response.text(), "utf8");
}

await writeFile(
  new URL("404.html", outputRoot),
  "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>No encontramos esa botella — Cava Loiseau</title><body style=\"margin:0;background:#f2eee4;color:#201e1a;font-family:Georgia,serif;display:grid;min-height:100vh;place-items:center;text-align:center\"><main><p style=\"font:12px Arial;letter-spacing:.18em;text-transform:uppercase\">Cava Loiseau</p><h1 style=\"font-size:clamp(48px,9vw,112px);font-weight:400;line-height:.9;margin:24px 0\">Esa botella<br>no está en la cava.</h1><a href=\"/\" style=\"color:inherit\">Volver al inicio →</a></main></body></html>",
  "utf8",
);

console.log(`Prerendered ${routes.length} routes for ${productionHost}`);
