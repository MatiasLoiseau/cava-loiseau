# Juan en Ironforge

Este directorio contiene la identidad de Juan y el plugin limitado que administra Cava Loiseau. El despliegue previsto crea un agente secundario dentro del gateway existente de OpenClaw; no reemplaza ni modifica la identidad, el workspace o las conversaciones del agente principal.

## Diseño de seguridad

- Workspace independiente: `/home/tinker/.openclaw/workspace-juan`.
- Estado independiente: `/home/tinker/.openclaw/agents/juan`.
- Modelo: `openai/gpt-5.6-terra`, reutilizando la autorización de Codex mediante la herencia de OpenClaw.
- Bot de Telegram y binding exclusivos para la cuenta `juan`.
- Mensajes directos limitados al propietario ya autorizado; grupos deshabilitados inicialmente.
- Perfil de herramientas mínimo: web de sólo lectura y `cava_*`.
- Terminal, filesystem general, privilegios elevados, Gmail, Calendar, sesiones, nodos y cron denegados.
- El token de Telegram vive fuera del repositorio, en un archivo regular con modo `0600`, y nunca se pasa como argumento de proceso.

## Activación pendiente

Para terminar la instalación hacen falta dos autorizaciones externas del propietario:

1. Crear el bot `Juan` con BotFather y entregar su token por un canal seguro para guardarlo directamente en Ironforge.
2. Autorizar una deploy key de escritura limitada únicamente al repositorio `MatiasLoiseau/cava-loiseau`, para que los commits del inventario actualicen GitHub y disparen el despliegue web.

Antes de activar el canal se realiza un backup verificable de la configuración, se valida el archivo resultante y recién entonces se reinicia el gateway. La prueba final debe confirmar que el bot existente sigue respondiendo por su cuenta `default` y Juan sólo por la cuenta `juan`.
