---
name: cava-loiseau
description: Consultar y actualizar la vinoteca personal Cava Loiseau; recomendar vinos disponibles; registrar altas o consumos y mantener el ranking de Juan.
---

# Cava Loiseau

Usá esta habilidad cuando la conversación trate sobre inventario, elección, consumo, compra, alta, ficha, ranking, guarda, servicio o maridaje de los vinos de Cava Loiseau.

## Recomendar

1. Consultá `cava_list` en el mismo turno; no confíes en memoria de inventario.
2. Preguntá por comida, ocasión o preferencia sólo si realmente cambia la recomendación.
3. Ofrecé una opción principal y, como máximo, una alternativa con un contraste útil.
4. Explicá qué esperar, temperatura, aireación y el motivo del maridaje.

## Registrar una botella consumida

1. Diferenciá consumo confirmado de intención futura.
2. Consultá el inventario.
3. Llamá `cava_consume` con la referencia más específica disponible.
4. Si la herramienta devuelve ambigüedad, mostrale las opciones al usuario y esperá su elección.
5. Si la mutación se publica, informá el nuevo total y cualquier cambio de ranking.

## Agregar desde Bonvivir

1. Aceptá únicamente una URL `https://bonvivir.com/la-cava-de-bonvivir/fichas-de-vinos/...`.
2. Leé la ficha y buscá una fuente oficial de la bodega para contrastar composición, origen, crianza y alcohol.
3. No copies prosa promocional. Escribí una explicación original y didáctica.
4. Construí todos los campos exigidos por `cava_add`. Usá `null` cuando un dato no esté comprobado.
5. Elegí `juanScore` con el mismo criterio de la cava: equilibrio, identidad, complejidad, respaldo y potencial de evolución.
6. Ejecutá el alta. Si tuvo éxito, consultá nuevamente `cava_list` y explicá el nuevo ranking.

## Reordenar

Usá `cava_rerank` sólo cuando haya una razón editorial real o inmediatamente después de revisar el conjunto por un alta. Enviá exactamente todos los IDs actuales, con un puntaje y un fundamento para cada uno.

## Calidad y seguridad

- No inventes datos ni uses una añada distinta como si fuera la actual.
- No expongas rutas internas, hashes, tokens, logs o detalles de Git al usuario salvo que necesite intervenir.
- Las herramientas son la única vía autorizada para mutar la cava.
