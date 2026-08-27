# Plugin Cava Loiseau para OpenClaw

Plugin de herramientas estrechas para que el agente Juan consulte y mantenga la cava sin acceso general a terminal, correo, calendario ni archivos del host.

## Herramientas

- `cava_list`: lee inventario y ranking.
- `cava_inspect`: extrae y valida la ficha técnica y la imagen oficial embebidas en Bonvivir.
- `cava_consume`: descuenta una cantidad cuando la referencia identifica un único vino.
- `cava_add`: agrega una ficha completa, descarga una imagen validada desde Bonvivir, recalcula el ranking y publica el cambio.
- `cava_rerank`: actualiza puntajes y fundamentos exigiendo todos los vinos actuales exactamente una vez.

Las mutaciones se serializan, usan escrituras seguras y sólo ejecutan Git mediante argumentos explícitos. El plugin rechaza repositorios, ramas, fuentes e imágenes fuera de la lista permitida. Si el push falla, conserva el commit local y lo informa como pendiente.

Antes de cada mutación, el plugin limpia únicamente reordenamientos semánticamente idénticos del manifiesto generado, descarga cambios remotos, publica commits locales pendientes y hace rebase automático cuando no hay conflictos de contenido. Un conflicto real se aborta sin borrar ninguna de las dos versiones.

## Desarrollo

```bash
npm install
npm test
npm run plugin:validate
```

OpenClaw 2026.7 requiere Node 24.15 o posterior dentro de la rama 24; Ironforge ya cumple ese requisito.

Configuración mínima:

```json
{
  "repoPath": "/home/tinker/cava-loiseau",
  "branch": "main"
}
```

`repoPath` debe ser la raíz real de un checkout limpio de `MatiasLoiseau/cava-loiseau`, en la rama indicada y con su remoto `origin` oficial.
