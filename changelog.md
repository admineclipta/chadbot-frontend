# Changelog

## [Unreleased]

## [Release]

### v2.4.1

- hotfix: Redireccionamiento de reiniciar contraseña no funcionaba

### v2.4.0

- hotfix: Refactor UI/UX en conversaciones, conversación, asistentes, configuraciones de credenciales [#13](https://github.com/admineclipta/chadbot-frontend/pull/13)

### v2.3.0

- hotfix: Se soluciona el redireccionamiento de login cuando 401 o rutas mal escritas
- feature: rediseño de `Asistentes` a mapa visual con `reactflow` (flujo izquierda → derecha, nodo derivador destacado, conexiones automáticas estéticas) [#10](https://github.com/admineclipta/chadbot-frontend/pull/10)
- feature: Formateo markdown en los mensajes de la conversación [#11](https://github.com/admineclipta/chadbot-frontend/pull/11)

### v2.2.1

- feature: split SSE channels by responsibility (`/realtime/messages/incoming` for inbox/chat sync, `/realtime/notifications` for personal alerts) with `MESSAGE_CREATED` global message contract and smart inbox refetch fallback

### v2.2.0

- feature: Web Push notifications frontend (Service Worker + Push subscription flow + settings UI + open conversation on notification click) [#6](https://github.com/admineclipta/chadbot-frontend/pull/6)
- feature: Presence session header for SSE notifications + visibility-aware presence heartbeat (`/realtime/presence/heartbeat`) [#7](https://github.com/admineclipta/chadbot-frontend/pull/7)

### v2.1.0

- feature: Implementacion SSE para mensajes/conversaciones [#4](https://github.com/admineclipta/chadbot-frontend/pull/4)
