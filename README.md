# Cava Loiseau

Vinoteca personal de Matías y sommelier por Telegram. La web muestra las botellas disponibles, las ordena según el criterio de Juan y ofrece una ficha didáctica para aprender a mirar, oler, probar y acompañar cada vino.

## Qué incluye

- Inventario actual con cantidad, origen, varietal y añada.
- Ranking editorial de Juan con puntaje y fundamento.
- Una ficha propia por vino con notas de cata, servicio, crianza, guarda y maridajes.
- Fotos de las botellas guardadas en el repositorio; la web no depende del hotlink de Bonvivir.
- Tarjeta social propia para compartir el sitio.
- Preparación para Vercel y actualización automática después de cada cambio en `main`.
- Paquete aislado para el agente Juan de OpenClaw, dentro de `agent/juan/`.

## Desarrollo local

Requiere Node.js 22.13 o posterior.

```bash
npm install
npm run dev
```

La vista local queda disponible en `http://localhost:3000`.

Antes de subir cambios:

```bash
npm run lint
npm test
```

`npm test` genera tanto el bundle de Sites como la salida estática que usa Vercel y verifica la portada, dos fichas representativas, las imágenes y los metadatos sociales.

## Dónde editar

- `app/page.tsx`: portada, inventario, ranking y presentación de Juan.
- `app/vinos/[id]/page.tsx`: plantilla de las fichas individuales.
- `app/globals.css`: identidad visual y responsive.
- `data/wines.json`: fuente de verdad del inventario y el ranking.
- `public/wines/`: imágenes locales de cada botella.
- `public/og.png`: tarjeta al compartir el enlace.

El diseño no necesita una base de datos para esta primera versión. Cada alta o baja modifica `data/wines.json`; un push a GitHub hace que Vercel vuelva a publicar el sitio.

## Modelo de una botella

Cada registro guarda, entre otros datos:

- `id`: identificador estable tomado del slug de Bonvivir.
- `quantity`: cantidad disponible.
- `juanScore`, `rank` y `rankReason`: criterio editorial actual de Juan.
- `sourceUrl` y `sourceImageUrl`: procedencia de los datos.
- `didacticDescription`, `learning` y `servingAdvice`: explicación pedagógica.
- `appearance`, `aroma` y `palate`: recorrido de cata.
- `pairing`: sugerencias concretas para la mesa.

No se inventan datos técnicos ausentes. Alcohol, altura, suelo o crianza pueden quedar en `null` hasta verificarlos en una fuente confiable o en la botella.

## Publicación en Vercel

El proyecto contiene `vercel.json`. Al importar `MatiasLoiseau/cava-loiseau` en Vercel, la plataforma ejecuta `npm run build:vercel` y publica `vercel-dist/`.

La rama de producción es `main`. Vercel crea nuevas versiones automáticamente con cada push y también previews para ramas o pull requests.

## Juan en Ironforge

Juan se monta como un segundo agente dentro del mismo Gateway de OpenClaw. De ese modo hereda de forma segura el acceso OAuth a OpenAI/Codex, pero mantiene separados su workspace, sesiones, Telegram y herramientas. Ruby —el agente actual detrás del bot conocido como Lucy— no se modifica.

El diseño de seguridad es intencional:

- Telegram usa una cuenta y un binding exclusivos para `juan`.
- Sólo el dueño ya autorizado puede escribirle.
- Juan no recibe Gmail, Calendar, sesiones de Ruby, cron, nodos ni ejecución general.
- Las altas, bajas y reordenamientos pasan por herramientas estrechas del plugin `cava-loiseau`.
- Para publicar, Ironforge usa una deploy key de GitHub limitada únicamente a este repositorio.

La guía operativa está en `agent/juan/README.md`. Para completar el alta se necesita crear un bot nuevo con `@BotFather`; su token se guarda directamente en Ironforge con permisos `0600` y nunca se versiona.

## Repositorio

[github.com/MatiasLoiseau/cava-loiseau](https://github.com/MatiasLoiseau/cava-loiseau)

Remoto SSH correcto:

```text
git@github.com:MatiasLoiseau/cava-loiseau.git
```
