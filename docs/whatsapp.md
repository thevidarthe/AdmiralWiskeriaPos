# WhatsApp Bot — Guía de Configuración

## Requisitos

- Cuenta de Meta Business con WhatsApp Business API habilitada
- Número de teléfono verificado en Meta Business Manager
- App creada en developers.facebook.com con producto WhatsApp

## Paso 1: Crear App en Meta

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear nueva app (tipo "Business")
3. Agregar producto "WhatsApp"
4. En WhatsApp > API Setup, obtener:
   - `Phone Number ID`
   - `WABA ID` (WhatsApp Business Account ID)
   - `Permanent Access Token` (generar desde System Users)

## Paso 2: Configurar Webhook

1. En WhatsApp > Configuration > Webhook
2. URL del webhook: `https://tu-dominio.com/api/v1/whatsapp/webhook`
3. Verify token: el valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Suscribirse a campos: `messages`, `message_status`

## Paso 3: Variables de Entorno

Agregar al `.env` del backend:

```env
WHATSAPP_ENABLED=true
WHATSAPP_API_VERSION=v23.0
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_WABA_ID=tu_waba_id
WHATSAPP_ACCESS_TOKEN=tu_access_token_permanente
WHATSAPP_WEBHOOK_VERIFY_TOKEN=token_aleatorio_seguro
WHATSAPP_APP_SECRET=tu_app_secret_de_meta
WHATSAPP_DEFAULT_LANGUAGE=es
```

**Importante**: Nunca commitear tokens reales. Usar variables de entorno del sistema en producción.

## Paso 4: Ejecutar Migraciones

```bash
cd backend
go run ./cmd/migrate up
```

Esto creará las tablas:
- `whatsapp_conversations`
- `whatsapp_messages`
- `whatsapp_outbox`
- `whatsapp_bot_sessions`

## Paso 5: Templates de Meta

Crear estos templates en Meta Business Manager:

| Template Name | Tipo | Uso |
|---|---|---|
| `order_received` | Utility | Confirmación de pedido |
| `order_ready` | Utility | Pedido listo |
| `sale_summary` | Utility | Resumen de venta |
| `reservation_confirmed` | Utility | Reserva confirmada |
| `birthday_coupon` | Marketing | Cupón de cumpleaños |
| `inactive_customer_coupon` | Marketing | Reactivación |
| `waiter_called` | Utility | Mesero notificado |

## Paso 6: Verificar Funcionamiento

### Local con ngrok

```bash
ngrok http 4000
```

Configurar la URL de ngrok como webhook en Meta.

### Tests

```bash
cd backend
go test ./internal/whatsapp/... -v
```

## Arquitectura

```
Cliente WhatsApp
    ↓ (mensaje)
Meta Cloud API
    ↓ (webhook POST)
/api/v1/whatsapp/webhook
    ↓ (valida firma HMAC-SHA256)
ProcessWebhook()
    ↓ (guarda mensaje)
SaveInboundMessage()
    ↓ (emite evento)
bus.Emit("whatsapp.inbound")
    ↓ (bot engine)
HandleInboundMessage()
    ↓ (encola respuesta)
EnqueueOutbox()
    ↓ (worker polling 5s)
RunWorker()
    ↓ (envía via Meta API)
callMetaAPI()
```

## Bot Engine — Estados

| Estado | Descripción |
|---|---|
| `WELCOME` | Estado inicial, muestra menú |
| `SHOWING_MENU` | Esperando selección |
| `BUILDING_ORDER` | Recibiendo items del pedido |
| `WAITING_CONFIRMATION` | Confirmando pedido |
| `HANDOFF_HUMAN` | Transferido a humano |

## Comandos del Bot

| Comando | Acción |
|---|---|
| `hola` / `menu` | Muestra menú principal |
| `pedido` | Inicia nuevo pedido |
| `promociones` | Muestra promos activas |
| `mesero` | Llama al mesero + desactiva bot |
| `asesor` / `humano` | Transfiere a humano |
| `cancelar` / `salir` | Cancela operación actual |
| `STOP` / `BAJA` | Opt-out de mensajes |

## Outbox — Retry con Backoff

| Intento | Delay |
|---|---|
| 1 | Inmediato |
| 2 | +30s |
| 3 | +2m |
| 4 | +10m |
| 5 | +30m |
| 6+ | Status = DEAD |

## Admin Inbox

Acceso: `/admin/whatsapp`

Funcionalidades:
- Lista de conversaciones activas
- Chat con historial de mensajes
- Activar/desactivar bot por conversación
- Cerrar conversación
- Enviar mensaje manual
- Ver estado del bot

## Checklist de Producción

- [ ] `WHATSAPP_ENABLED=true`
- [ ] `WHATSAPP_ACCESS_TOKEN` es token permanente (no temporal)
- [ ] `WHATSAPP_APP_SECRET` coincide con el App Secret de Meta
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` es una cadena aleatoria segura
- [ ] Webhook URL configurada en Meta con HTTPS
- [ ] Templates aprobados por Meta
- [ ] Migración `012_whatsapp_bot.up.sql` ejecutada
- [ ] Worker corriendo (se inicia automáticamente con el API)
- [ ] Logs monitoreados para mensajes DEAD
- [ ] Rate limiting de Meta respetado (80 msg/s para business)
