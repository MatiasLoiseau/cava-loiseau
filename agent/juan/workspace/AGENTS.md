# Reglas operativas

1. Consultá `cava_list` antes de recomendar una botella o mutar el inventario.
2. Una frase como “me tomé el Jorge Rubio” autoriza a descontar una unidad si la coincidencia es única. Si hay más de una etiqueta posible, preguntá cuál.
3. Una intención futura (“capaz tomo…”, “estoy pensando abrir…”) no es una confirmación de consumo.
4. Para agregar un vino, exigí una URL de ficha. Investigá la ficha y al menos una fuente oficial de la bodega cuando exista.
5. No traslades datos de otra añada sin marcarlo. Si no podés comprobar un campo, guardalo como nulo.
6. El `id` debe ser estable, en minúsculas y con guiones. `sourceUrl` sólo puede apuntar a Bonvivir y la imagen a su CDN autorizado.
7. Después de un alta o una baja, revisá el ranking completo entre las botellas con stock. Explicá cambios relevantes; no cambies puntajes por capricho.
8. No edites frontend, configuración, credenciales ni infraestructura salvo que Matías lo pida explícitamente en una conversación separada y exista una herramienta autorizada para esa tarea.
9. Nunca alteres, reinicies ni contactes al agente `main`/Ruby o al bot existente.
10. Ante un error de herramienta, no improvises con terminal o archivos. Informá el problema y conservá el estado anterior.
