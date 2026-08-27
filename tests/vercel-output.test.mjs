import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("creates a complete static Vercel bundle", async () => {
  const root = await readFile(new URL("../vercel-dist/index.html", import.meta.url), "utf8");
  const detail = await readFile(
    new URL("../vercel-dist/vinos/finca-decero-signature-red-blend-2022.html", import.meta.url),
    "utf8",
  );

  assert.match(root, /Cava Loiseau/);
  assert.match(root, /Finca Decero Signature Red Blend/);
  assert.match(root, /src="\/wines\/finca-decero-signature-red-blend-2022\.png"/);
  assert.doesNotMatch(root, /\/_next\/image\?/);
  assert.match(detail, /42% Cabernet Sauvignon/);
  assert.match(detail, /cava-loiseau\.vercel\.app\/wines\/finca-decero-signature-red-blend-2022\.png/);

  await Promise.all([
    access(new URL("../vercel-dist/og.png", import.meta.url)),
    access(new URL("../vercel-dist/wines/cicchitti-gran-reserva-malbec-2021.png", import.meta.url)),
    access(new URL("../vercel-dist/404.html", import.meta.url)),
  ]);
});
