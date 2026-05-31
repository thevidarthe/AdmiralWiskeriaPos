# Aprender Go con Admiral Pro

Esta guía te explica los **patrones de Go** que están en este código, en orden de cuándo los vas viendo si lees el proyecto de adelante hacia atrás.

> Suponiendo que vienes de JavaScript/TypeScript. Si vienes de otro lenguaje, los conceptos son similares.

---

## 1. Estructura de un proyecto Go

```
admiral-pro/backend/
├── go.mod              ← declara el módulo y sus dependencias (como package.json)
├── go.sum              ← hash de dependencias para reproducibilidad
├── cmd/
│   └── api/main.go     ← entry point (en JS sería index.ts)
└── internal/           ← código privado; nadie afuera puede importarlo
```

**Regla clave**: lo que está en `internal/` solo puede ser importado por código dentro del mismo módulo. Es un mecanismo del compilador para forzar privacidad real (mejor que `private` en TS).

`pkg/` es lo opuesto: código que SÍ puede ser importado por otros proyectos.

---

## 2. `package` y `import`

```go
package config  // ← cada archivo declara su paquete

import (
    "errors"                              // stdlib
    "github.com/joho/godotenv"            // dependencia externa
    "github.com/admiral/admiral-pro/internal/config"  // dependencia interna
)
```

- Un paquete es una carpeta. Todos los archivos de la carpeta declaran el mismo `package`.
- En JS importas por ruta de archivo; en Go importas por ruta del paquete.

---

## 3. Structs y tags (en lugar de clases)

```go
type User struct {
    ID       string    `gorm:"primaryKey;type:uuid" json:"id"`
    Email    string    `gorm:"not null" json:"email"`
    Password string    `json:"-"`                     // "-" = no exponer en JSON
    Active   bool
}
```

- **No hay clases**. Solo `struct` y métodos sueltos.
- Los **tags** (entre backticks) son metadatos que las librerías leen vía reflexión.
  - `gorm:"..."` → cómo se mapea a la tabla
  - `json:"..."` → cómo se serializa/deserializa en HTTP
  - `validate:"..."` → reglas de validación

Equivalente TS:
```ts
class User {
  @PrimaryKey() id!: string;
  @Column({ nullable: false }) email!: string;
  @Exclude() password!: string;
}
```

---

## 4. Métodos sobre structs

```go
type Config struct {
    AppEnv Env
}

// Receiver: este método pertenece a Config (como `this`)
func (c Config) IsProd() bool {
    return c.AppEnv == EnvProduction
}
```

`(c Config)` se llama **receiver**. Es como `this` pero explícito. Si usas `*Config` (con puntero) puedes mutar el struct; sin puntero solo lo lees.

---

## 5. Pointers (asteriscos) sin perder la cabeza

```go
var name string = "Juan"     // string vacío "" es el cero
var ptr *string = &name      // & = "dame la dirección de memoria"
fmt.Println(*ptr)            // * = "dame el valor en esa dirección"
```

En este proyecto los punteros aparecen para representar **nullable**:

```go
type User struct {
    LockedUntil *time.Time  // pointer = puede ser nil (NULL en SQL)
    LastLoginAt *time.Time
}

if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
    // bloqueado
}
```

En TS sería `lockedUntil?: Date`. La diferencia es que en Go siempre es explícito.

---

## 6. Errores: `(valor, error)` en vez de try/catch

```go
config, err := config.Load()
if err != nil {
    return fmt.Errorf("no se pudo cargar config: %w", err)
}
```

**No hay try/catch**. Cada función puede devolver dos valores: el resultado y un error. Tu código revisa `if err != nil` casi en cada línea.

- `errors.New("...")` crea un error
- `fmt.Errorf("contexto: %w", err)` envuelve un error con más contexto
- `errors.Is(err, ErrSaleNotFound)` compara errores específicos
- `errors.Join(e1, e2)` combina varios errores

Equivalente TS:
```ts
try { ... } catch (e) { ... }
// vs Go
result, err := doSomething()
if err != nil { ... }
```

Es más verboso pero más explícito: nunca te olvidas de un error.

---

## 7. Interfaces (poliformismo sin herencia)

```go
type Handler func(payload any)  // tipo función

type Bus struct {
    handlers map[string][]Handler
}
```

Las interfaces en Go son **implícitas**: si tu struct tiene los métodos que pide la interfaz, satisface la interfaz. No declaras "implements".

```go
type Logger interface {
    Info(msg string, args ...any)
}

// MiLogger implementa Logger automáticamente con solo tener el método Info
type MiLogger struct{}
func (m *MiLogger) Info(msg string, args ...any) { ... }
```

---

## 8. Goroutines y channels (concurrencia)

```go
// Lanza una función en una goroutine (hilo ligero del runtime)
go func() {
    h.OnEvent(payload)
}()
```

En `event/bus.go` cada handler corre en su propia goroutine. Es como `Promise` en JS pero más barato (millones de goroutines en MBs de RAM).

Channels los usaremos al hacer graceful shutdown:

```go
quit := make(chan os.Signal, 1)        // canal con buffer 1
signal.Notify(quit, syscall.SIGTERM)   // suscribir señales del SO
<-quit                                  // bloquear hasta recibir algo
```

Equivalente TS: `process.on('SIGTERM', ...)`. La diferencia: en Go los channels son ciudadanos de primera clase y se componen con `select`.

---

## 9. `defer`

```go
file, err := os.Open("config.txt")
if err != nil { return err }
defer file.Close()  // ← se ejecuta al SALIR de esta función, pase lo que pase

// ahora puedes hacer cosas con file...
```

`defer` ejecuta al final, incluso si hay panic. Es como `finally` en JS pero más limpio. Lo uso para:
- `defer file.Close()`
- `defer cancel()` (cancelar contexts)
- `defer mu.Unlock()` (liberar mutex)

---

## 10. Context

```go
func Load(ctx context.Context, dsn string) (*gorm.DB, error) {
    pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    return sqlDB.PingContext(pingCtx)
}
```

`context.Context` se pasa como primer argumento a casi toda función que pueda bloquear (BD, HTTP, etc.). Sirve para:
- Cancelar operaciones (cuando el cliente cierra la conexión)
- Timeouts
- Pasar valores entre middlewares

Equivalente TS: `AbortController` + `signal`.

---

## 11. GORM: el ORM de este proyecto

```go
var user User
db.Where("email = ?", email).First(&user)
// vs Prisma
const user = await prisma.user.findUnique({ where: { email }});
```

- `db.Where(...).First(&user)` — `&user` es "puntero a la variable user" porque GORM la rellena.
- `db.Transaction(func(tx *gorm.DB) error { ... })` — todo dentro corre en una transacción
- `db.Preload("Items")` — equivalente a `include` en Prisma

---

## 12. Fiber: el framework HTTP

```go
app := fiber.New()
app.Get("/users/:id", func(c *fiber.Ctx) error {
    id := c.Params("id")
    return c.JSON(fiber.Map{"id": id})
})
app.Listen(":4000")
```

Si vienes de Express, te vas a sentir en casa. Diferencias:
- En Go el handler devuelve `error` (cualquier error que devuelvas se convierte en 500)
- `c.JSON()` ya hace `Content-Type: application/json` por ti
- `fiber.Map` es un alias de `map[string]any`

---

## 13. Validación

```go
type loginDTO struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=6"`
}

func handler(c *fiber.Ctx) error {
    var dto loginDTO
    if err := httpx.BindAndValidate(c, &dto); err != nil {
        return err  // ya escribió 400 con detalles
    }
    // dto.Email y dto.Password ya son válidos aquí
}
```

`validator` lee los tags y aplica reglas. `BindAndValidate` es un helper que hace parse + validate + respuesta de error en una sola llamada.

---

## 14. Patrón "Service Layer"

```
Handler (HTTP) → Service (lógica de negocio) → Repository (queries DB)
```

En este proyecto:
- `internal/pos/handlers.go` → recibe HTTP, parsea DTO
- `internal/pos/service.go` → lógica pura (no sabe nada de HTTP)
- GORM hace de "repository" implícito

El service nunca debe importar Fiber. Eso permite testear lógica sin levantar HTTP.

---

## 15. Tests

```go
func TestHashPassword_RoundTrip(t *testing.T) {
    h, err := HashPassword("super-secret")
    require.NoError(t, err)                          // si err != nil, falla y para
    assert.True(t, CheckPassword("super-secret", h)) // si false, falla pero sigue
    assert.False(t, CheckPassword("incorrecto", h))
}
```

- Archivos terminan en `_test.go`
- Funciones empiezan con `Test` y reciben `*testing.T`
- `require.X` = aborta el test si falla; `assert.X` = sigue
- Correr: `go test ./...` (./... = todos los paquetes)

---

## 16. Compilar a un binario único

```bash
go build -ldflags="-s -w" -o ./bin/admiral-api ./cmd/api
```

Resultado: **un solo archivo ejecutable de ~15 MB** con todo adentro (incluso PostgreSQL driver). No necesitas Node, no necesitas runtimes. En producción solo copias ese binario y lo corres.

- `-s -w` = strip symbols, reduce tamaño
- `CGO_ENABLED=0` = build totalmente estático (corre en Alpine, scratch images)

---

## 17. Vocabulario rápido

| Tú dirías (JS/TS)             | En Go                              |
| ----------------------------- | ---------------------------------- |
| `class`                       | `struct` + métodos                 |
| `interface`                   | `interface` (pero implícito)       |
| `null` / `undefined`          | `nil`                              |
| `try/catch`                   | `if err != nil`                    |
| `async/await`                 | goroutines + channels              |
| `npm install`                 | `go mod download`                  |
| `package.json`                | `go.mod`                           |
| `node_modules/`               | módulos en `~/go/pkg/`             |
| `for (let x of arr)`          | `for _, x := range arr`            |
| `arr.map(...)`                | un `for` loop (no hay map nativo)  |
| `Object.entries(obj)`         | `for k, v := range obj`            |
| `console.log`                 | `fmt.Println` o `slog.Info`        |

---

## 18. Próximos pasos sugeridos

1. Lee `cmd/api/main.go` — verás cómo se ensambla todo
2. Lee `internal/auth/service.go` — un servicio limpio con lógica de negocio
3. Lee `internal/pos/service.go` — el archivo más complejo (transacciones BD)
4. Modifica un test, corre `go test ./internal/auth -v` para ver el feedback
5. Lee la [Tour of Go](https://go.dev/tour/) oficial — 1 hora bien invertida

---

## 19. Recursos recomendados

- **Tour of Go** — https://go.dev/tour/
- **Effective Go** — https://go.dev/doc/effective_go
- **Standard Library** — https://pkg.go.dev/std
- **Awesome Go** — https://awesome-go.com/
- **Fiber docs** — https://docs.gofiber.io/
- **GORM docs** — https://gorm.io/docs/

> *Tip personal: Go premia la simplicidad. Si tu solución necesita 5 abstracciones, casi siempre hay una forma más directa.*
