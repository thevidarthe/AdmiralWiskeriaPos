# 🧪 CHECKLIST DE TESTING - FLUJOS UI ADMIRAL PRO

Documento para verificar que TODOS los flujos funcionan correctamente antes del deploy en vivo.

**Fecha de testing:** [escribe aquí]  
**Testeado por:** [nombre]  
**Resultado:** ⭕ PASA / ❌ FALLA

---

## ✅ CONFIGURACIÓN PREVIA

Antes de empezar, asegúrate que:

```bash
# Terminal 1: Levanta infraestructura
docker compose up -d

# Terminal 2: Backend Go
cd backend
go run ./cmd/api
# Debe mostrar: "🚀 Fiber app running on :4000"

# Terminal 3: Frontend Next.js
cd frontend
npm run dev
# Debe mostrar: "- Local: http://localhost:3000"
```

**Marca cuando todo esté listo:**
- [ ] PostgreSQL running (docker compose ps → healthy)
- [ ] Redis running (docker compose ps → healthy)
- [ ] Backend en http://localhost:4000 (responde)
- [ ] Frontend en http://localhost:3000 (carga)

---

## 📋 TEST 1: AUTENTICACIÓN

**Objetivo:** Validar que el sistema de login por PIN funciona correctamente.

### 1.1 - Pantalla de Login Carga

```
Pasos:
1. Abre http://localhost:3000
2. ¿Ves la pantalla de login con "Admiral Pro"?
3. ¿Puedes ver un dropdown con usuarios disponibles?

Criterios:
☐ Página carga sin errores
☐ Logo de Admiral visible
☐ Listado de usuarios cargado desde BD
☐ Campo de PIN disponible
```

### 1.2 - Login Exitoso

```
Pasos:
1. En el dropdown, selecciona "admin" (o el usuario por defecto)
2. Ingresa PIN: 0000 (o el PIN del usuario default)
3. Presiona "Ingresar"

Criterios:
☐ JWT se guarda en localStorage
☐ Redirección exitosa a dashboard
☐ Nombre del usuario aparece en header
☐ Rol del usuario aparece en sidebar
```

### 1.3 - Login Fallido

```
Pasos:
1. Selecciona un usuario
2. Ingresa PIN incorrecto: 9999
3. Presiona "Ingresar"

Criterios:
☐ Mensaje de error: "PIN incorrecto"
☐ Usuario NO entra al sistema
☐ Permanece en pantalla de login
☐ Después de 5 intentos fallidos → bloqueo 15 min
```

### 1.4 - Logout

```
Pasos:
1. Habiendo iniciado sesión, presiona avatar/menu de usuario
2. Click en "Salir" o "Logout"

Criterios:
☐ JWT se elimina de localStorage
☐ Redirección a /login
☐ Pantalla de login aparece
```

**Resultado Test 1:** ⭕ PASA / ❌ FALLA

---

## 🛒 TEST 2: FLUJO POS (PUNTO DE VENTA) - ⭐ CRÍTICO

**Objetivo:** Validar el flujo completo de venta desde POS.

### 2.1 - Acceder a POS

```
Pasos:
1. Login como BARISTA o CASHIER
2. Click en "POS" en el sidebar

Criterios:
☐ Carga interfaz de POS
☐ Muestra listado de categorías
☐ Muestra grid de productos
☐ Carrito está vacío (lado derecho)
```

### 2.2 - Filtro de Categorías

```
Pasos:
1. Click en "Cervezas" (o cualquier categoría)
2. Verifica que el grid actualiza

Criterios:
☐ Grid filtra productos por categoría
☐ Botones de categoría muestran estado (active/inactive)
☐ Número de productos coincide con categoría
```

### 2.3 - Búsqueda en Tiempo Real

```
Pasos:
1. En el campo de búsqueda, escribe "Corona"
2. Observa que el grid filtra mientras escribes

Criterios:
☐ Búsqueda es case-insensitive
☐ Filtra por nombre de producto
☐ Filtra por descripción (si existe)
☐ Campo limpiar búsqueda (X) funciona
```

### 2.4 - Agregar al Carrito

```
Pasos:
1. Click en cualquier producto (ej: "Corona 330ml")
2. Se debe agregar al carrito (derecha)

Criterios:
☐ Producto aparece en carrito
☐ Cantidad = 1
☐ Precio unit. se muestra correctamente
☐ Subtotal se recalcula automáticamente
☐ Toast/notificación: "Agregado a carrito"
```

### 2.5 - Múltiples Productos

```
Pasos:
1. Agrega 3 productos diferentes al carrito
2. Verifica que el carrito muestre todos

Criterios:
☐ Carrito muestra 3 líneas
☐ Cantidad total de items = 3 (o más si repetiré productos)
☐ Subtotal = suma de (unitPrice × qty) para cada item
☐ IVA se calcula automáticamente (si aplica)
☐ Total = Subtotal + IVA
```

### 2.6 - Ajustar Cantidades

```
Pasos:
1. En carrito, localiza un producto
2. Click en botón "+" para aumentar cantidad
3. Click en botón "-" para disminuir cantidad

Criterios:
☐ Cantidad aumenta/disminuye en tiempo real
☐ Subtotal del item se recalcula
☐ Total general se recalcula
☐ No se permite cantidad 0 (auto-elimina item)
☐ No se permite cantidad negativa
```

### 2.7 - Eliminar del Carrito

```
Pasos:
1. Click en botón "🗑️" (trash) de un producto
2. Verifica que se elimina del carrito

Criterios:
☐ Producto se elimina del carrito
☐ Total se recalcula
☐ Si era el único producto → carrito vacío
☐ Toast: "Producto eliminado"
```

### 2.8 - Checkout / Procesar Venta

```
Pasos:
1. Con productos en carrito, click en "PROCESAR VENTA" o "CHECKOUT"
2. Se abre modal/página de checkout

Criterios:
☐ Modal muestra resumen de venta
☐ Total a pagar es correcto
☐ Método de pago: opciones (Efectivo, Tarjeta, QR, etc)
☐ Campo de referencia (nota, cliente, etc)
☐ Botón "CONFIRMAR PAGO" disponible
```

### 2.9 - Venta Registrada en BD

```
Pasos:
1. Presiona "CONFIRMAR PAGO"
2. Venta debe procesarse y registrarse en BD

Criterios:
☐ Toast: "Venta realizada exitosamente"
☐ Carrito se limpia automáticamente
☐ Sale se registra con timestamp correcto
☐ Sale_items almacenan cada producto
☐ Descuentos se aplican correctamente (si hay)
```

### 2.10 - Recibo Generado

```
Pasos:
1. Tras confirmar pago, se genera recibo
2. Verifica que sea imprimible

Criterios:
☐ Recibo muestra:
   - Número de venta (ID único)
   - Fecha y hora (timestamp correcto)
   - Listado de items con cantidades y precios
   - Subtotal, IVA (si aplica), Total
   - Método de pago usado
   - Nombre de usuario que procesó
☐ Botón imprimir funciona
☐ Botón descargar PDF funciona (si existe)
```

### 2.11 - Nueva Venta

```
Pasos:
1. Presiona "Nueva Venta" o similar
2. Carrito debe estar vacío
3. Puedes agregar nuevos productos

Criterios:
☐ Carrito limpio
☐ Contador de items = 0
☐ Podés volver a agregar productos
```

**Resultado Test 2:** ⭕ PASA / ❌ FALLA

---

## 📊 TEST 3: PANEL ADMIN - GESTIÓN DE PRODUCTOS

**Objetivo:** Validar CRUD de productos.

### 3.1 - Acceder a Productos

```
Pasos:
1. Login como ADMIN
2. Sidebar → Gestión → Productos

Criterios:
☐ Página carga correctamente
☐ Tabla muestra listado de productos actuales
☐ Columnas: Nombre, Categoría, Precio, Stock, Acciones
```

### 3.2 - Crear Producto

```
Pasos:
1. Click en botón "+ Nuevo Producto"
2. Completa formulario:
   - Nombre: "Corona Extra 330ml"
   - Categoría: "Cervezas"
   - Precio: 2.50
   - Stock inicial: 50
   - Descripción: (opcional)
3. Click "Guardar"

Criterios:
☐ Validación: campos requeridos no pueden estar vacíos
☐ Producto se agrega a tabla
☐ Toast: "Producto creado"
☐ Producto aparece inmediatamente en POS
☐ Stock se actualiza en inventario
```

### 3.3 - Editar Producto

```
Pasos:
1. Click en botón "✏️ Editar" de un producto
2. Cambia: Precio: 2.75
3. Click "Guardar"

Criterios:
☐ Precio se actualiza en tabla
☐ Cambio se refleja en POS (nuevas ventas)
☐ Ventas anteriores NO se modifican
☐ Toast: "Producto actualizado"
```

### 3.4 - Eliminar Producto

```
Pasos:
1. Click en botón "🗑️ Eliminar"
2. Confirmación: "¿Eliminar producto?"
3. Click "Confirmar"

Criterios:
☐ Producto se elimina de tabla
☐ Producto desaparece de POS
☐ Toast: "Producto eliminado"
☐ No debe permitir eliminar si hay ventas (usar soft delete o prevenir)
```

### 3.5 - Filtro y Búsqueda

```
Pasos:
1. En tabla, busca por nombre: "Corona"
2. Filtra por categoría: "Cervezas"

Criterios:
☐ Tabla se filtra en tiempo real
☐ Búsqueda es case-insensitive
☐ Combinación de filtros funciona
```

**Resultado Test 3:** ⭕ PASA / ❌ FALLA

---

## 👥 TEST 4: ADMIN - CRM (CLIENTES)

**Objetivo:** Validar gestión de clientes y puntos de lealtad.

### 4.1 - Listado de Clientes

```
Pasos:
1. Admin → Clientes
2. Verifica tabla de clientes

Criterios:
☐ Tabla carga con listado de clientes
☐ Columnas: Nombre, Email, Teléfono, Puntos, Nivel, Acciones
☐ Clientes registrados desde ventas POS aparecen aquí
```

### 4.2 - Crear Cliente Manual

```
Pasos:
1. Click "+ Nuevo Cliente"
2. Completa:
   - Nombre: "Juan Pérez"
   - Email: juan@example.com
   - Teléfono: +1234567890
3. Click "Guardar"

Criterios:
☐ Cliente se agrega a tabla
☐ ID único se genera automáticamente
☐ Toast: "Cliente creado"
☐ Puede ser vinculado a futuras ventas
```

### 4.3 - Historial de Compras

```
Pasos:
1. Click en nombre de cliente
2. Abre detalle/perfil del cliente

Criterios:
☐ Muestra listado de todas las ventas del cliente
☐ Cada venta muestra: Fecha, Monto, Productos, Descuentos
☐ Historial está ordenado por fecha (más reciente primero)
```

### 4.4 - Puntos de Lealtad

```
Pasos:
1. Cliente realiza venta (ej: $50)
2. Ve el cliente en Admin → Clientes

Criterios:
☐ Puntos se asignan automáticamente (ej: 50 pts por $50)
☐ Nivel de cliente cambia según puntos:
   - 0-100 pts: Regular
   - 101-500 pts: VIP
   - 500+ pts: Platinum (ejemplo)
☐ Descuentos por nivel se aplican automáticamente en nuevas ventas
```

**Resultado Test 4:** ⭕ PASA / ❌ FALLA

---

## 📈 TEST 5: REPORTES

**Objetivo:** Validar generación de reportes y exportación.

### 5.1 - Acceder a Reportes

```
Pasos:
1. Admin → Reportes

Criterios:
☐ Página carga correctamente
☐ Muestra opciones de filtro:
   - Rango de fechas
   - Sucursal
   - Usuario
```

### 5.2 - Cierre Diario

```
Pasos:
1. Selecciona fecha de hoy
2. Click "Cierre Diario"

Criterios:
☐ Muestra:
   - Total de ventas
   - Número de transacciones
   - Ticket promedio
   - Productos más vendidos
   - Métodos de pago utilizados
   - Descuentos otorgados
☐ Totales son matemáticamente correctos
```

### 5.3 - Exportar a Excel

```
Pasos:
1. En reporte, click "Descargar Excel"
2. Archivo se descarga

Criterios:
☐ Archivo .xlsx se descarga
☐ Excel contiene todos los datos del reporte
☐ Formato está limpio y legible
☐ Gráficos se incluyen (si corresponde)
```

### 5.4 - Gráficos Dinámicos

```
Pasos:
1. Observa gráficos en dashboard de reportes

Criterios:
☐ Gráfico de ventas por día (línea)
☐ Gráfico de productos más vendidos (barras)
☐ Gráfico de métodos de pago (pie/dona)
☐ Gráficos son responsivos (adaptables a pantalla)
```

**Resultado Test 5:** ⭕ PASA / ❌ FALLA

---

## 🔗 TEST 6: QR DE MESA

**Objetivo:** Validar generación y escaneo de QR.

### 6.1 - Generar QR

```
Pasos:
1. Admin → QR de Mesas
2. Click "+ Generar Código QR"
3. Completa:
   - Número de mesa: "Mesa 5"
   - Sucursal: [selecciona sucursal]
4. Click "Generar"

Criterios:
☐ QR se genera y se muestra en pantalla
☐ QR es imprimible
☐ QR contiene token único para esa mesa
☐ Descargar QR como imagen (.png, .pdf)
```

### 6.2 - Escanear QR

```
Pasos:
1. Usa teléfono y escanea el QR generado
2. Navegador abre automáticamente a /qr/[token]

Criterios:
☐ Redirección automática funciona
☐ Página carga menú digital
☐ No requiere login para ver menú
```

### 6.3 - Menú Digital en QR

```
Pasos:
1. En página de QR, veo el menú
2. Click en producto

Criterios:
☐ Productos cargados correctamente
☐ Muestra: Nombre, Precio, Descripción, Foto
☐ Puedo agregar a carrito
☐ Botón "Pedir" o "Agregar"
```

### 6.4 - Llamada a Mesero

```
Pasos:
1. En menú QR, click "Llamar Mesero"
2. Confirmación: "Mesero avisado"

Criterios:
☐ Notificación llega a staff
☐ Panel de Mesero muestra llamada pendiente
☐ Mesero puede marcar como "atendido"
☐ Notificación desaparece cuando se marca como atendido
```

**Resultado Test 6:** ⭕ PASA / ❌ FALLA

---

## 🧑‍💼 TEST 7: PANEL MESERO

**Objetivo:** Validar funcionalidad del panel de mesero.

### 7.1 - Acceder a Panel Mesero

```
Pasos:
1. Login como WAITER (mesero)
2. Sistema redirige a /mesero

Criterios:
☐ Página carga correctamente
☐ Muestra mesas activas
☐ Muestra órdenes pendientes
```

### 7.2 - Órdenes desde QR

```
Pasos:
1. Cliente pide desde QR mesa 5
2. En panel mesero, debe aparecer orden

Criterios:
☐ Orden aparece en "Órdenes Pendientes"
☐ Muestra: Número de mesa, productos solicitados, hora
☐ Notificación sonora/visual (si está configurada)
```

### 7.3 - Marcar Orden Completa

```
Pasos:
1. Click "Completado" o "✓" en orden
2. Orden desaparece de pendientes

Criterios:
☐ Orden se marca como completada
☐ Se registra en historial
☐ Cliente es notificado (si hay integración)
```

**Resultado Test 7:** ⭕ PASA / ❌ FALLA

---

## ⚙️ TEST 8: CONFIGURACIÓN

**Objetivo:** Validar configuración de sistema.

### 8.1 - Sucursales

```
Pasos:
1. Admin → Configuración → Sucursales
2. Verifica datos de sucursal actual

Criterios:
☐ Muestra: Nombre, Dirección, Teléfono, Horarios
☐ Puedo editar datos
☐ Cambios se reflejan en reportes y facturas
```

### 8.2 - Integración WhatsApp

```
Pasos:
1. Admin → Configuración → WhatsApp

Criterios:
☐ Muestra campo para conectar WhatsApp Business
☐ Autenticación con QR o token
☐ Status de conexión visible
```

**Resultado Test 8:** ⭕ PASA / ❌ FALLA

---

## 🔐 TEST 9: SEGURIDAD Y PERMISOS

**Objetivo:** Validar que permisos por rol funcionan correctamente.

### 9.1 - BARISTA

```
Pasos:
1. Login como BARISTA
2. Intenta acceder a /admin/reportes

Criterios:
☐ Acceso denegado
☐ Redirigido a /pos
☐ Pueda usar POS pero NO admin
```

### 9.2 - MANAGER

```
Pasos:
1. Login como MANAGER
2. Intenta usar todas las funciones

Criterios:
☐ Acceso a Admin completo
☐ Acceso a Reportes
☐ Acceso a POS
☐ NO acceso a Usuarios (solo ADMIN)
```

### 9.3 - ADMIN

```
Pasos:
1. Login como ADMIN
2. Verifica acceso total

Criterios:
☐ Acceso a todo el sistema
☐ Pueda crear/editar/eliminar usuarios
☐ Pueda cambiar configuración global
```

**Resultado Test 9:** ⭕ PASA / ❌ FALLA

---

## 📱 TEST 10: PWA (Progressive Web App)

**Objetivo:** Validar que la app es instalable en móvil.

### 10.1 - Instalación en Móvil

```
Pasos:
1. Abre http://localhost:3000 en móvil (iOS/Android)
2. Browser muestra opción "Instalar app"
3. Click "Instalar"

Criterios:
☐ App se agrega al home screen
☐ Ícono y nombre correcto
☐ La aplicación funciona en pantalla completa (sin URL bar)
```

### 10.2 - Funcionalidad Offline

```
Pasos:
1. Con app instalada, desactiva internet
2. Intenta acceder a pantalla visitada

Criterios:
☐ Cache local funciona
☐ Pantallas visitadas se muestran sin internet
☐ Al conectar nuevamente, sincroniza datos
```

**Resultado Test 10:** ⭕ PASA / ❌ FALLA

---

## 📋 RESUMEN FINAL

### Resultados por módulo:

| Test | Resultado | Observaciones |
|------|-----------|---------------|
| 1. Autenticación | ⭕ / ❌ | |
| 2. POS | ⭕ / ❌ | |
| 3. Productos | ⭕ / ❌ | |
| 4. CRM | ⭕ / ❌ | |
| 5. Reportes | ⭕ / ❌ | |
| 6. QR | ⭕ / ❌ | |
| 7. Mesero | ⭕ / ❌ | |
| 8. Configuración | ⭕ / ❌ | |
| 9. Seguridad | ⭕ / ❌ | |
| 10. PWA | ⭕ / ❌ | |

### Problemas encontrados:

```
[Escribe aquí los bugs o issues encontrados]
```

### Acciones pendientes:

```
[Escribe aquí qué falta antes de deploy]
```

---

**✅ LISTO PARA DEPLOY:** [SÍ / NO]

Si respondiste NO, corrige los problemas antes de proceder con Railway.
