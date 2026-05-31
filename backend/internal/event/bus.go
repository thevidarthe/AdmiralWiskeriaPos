// Package event implementa un event bus en memoria para eventos del dominio.
//
// 📚 Patrón: en lugar de que el servicio POS llame directamente a CRM y
// WhatsApp cuando se cierra una venta, emite un evento "sale.closed" y
// cada módulo que le interese se suscribe. Esto desacopla los módulos.
//
// Implementación pequeña pero suficiente para un POS de un solo nodo.
// Si en el futuro hay varios nodos del backend, se reemplaza por Redis
// pub/sub o similar sin cambiar los callers (mismo interface).
package event

import (
	"log/slog"
	"sync"
)

// Handler es la función que se ejecuta cuando se publica un evento.
type Handler func(payload any)

// Bus es un publicador/suscriptor en memoria seguro para concurrencia.
type Bus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

// New crea un bus vacío.
func New() *Bus {
	return &Bus{handlers: make(map[string][]Handler)}
}

// On suscribe un handler a un evento. Puede haber varios por evento.
func (b *Bus) On(event string, h Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[event] = append(b.handlers[event], h)
}

// Emit dispara el evento. Los handlers se ejecutan en goroutines separadas
// para que el caller no se bloquee si un handler tarda (ej: envío WhatsApp).
func (b *Bus) Emit(event string, payload any) {
	b.mu.RLock()
	hs := b.handlers[event]
	b.mu.RUnlock()

	for _, h := range hs {
		go func(h Handler) {
			defer func() {
				if r := recover(); r != nil {
					slog.Error("event handler panic", "event", event, "panic", r)
				}
			}()
			h(payload)
		}(h)
	}
}
