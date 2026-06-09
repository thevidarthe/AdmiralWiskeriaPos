// cmd/api — entry point del servicio HTTP de Admiral Pro.
//
// 📚 Cómo se ejecuta:
//  1. Cargar config desde .env / variables de entorno
//  2. Setup logger (slog)
//  3. Abrir conexión PostgreSQL (GORM)
//  4. Crear event bus
//  5. Instanciar servicios de cada módulo
//  6. Crear router Fiber + middlewares globales
//  7. Montar rutas (públicas y privadas)
//  8. Arrancar el servidor con graceful shutdown
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
    "strings"
	"strconv"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"

	"github.com/admiral/admiral-pro/internal/admin"
	"github.com/admiral/admiral-pro/internal/auth"
	"github.com/admiral/admiral-pro/internal/branch"
	"github.com/admiral/admiral-pro/internal/brand"
	"github.com/admiral/admiral-pro/internal/config"
	"github.com/admiral/admiral-pro/internal/crm"
	"github.com/admiral/admiral-pro/internal/db"
	"github.com/admiral/admiral-pro/internal/event"
	"github.com/admiral/admiral-pro/internal/health"
	"github.com/admiral/admiral-pro/internal/menu"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/internal/pos"
	"github.com/admiral/admiral-pro/internal/promotion"
	"github.com/admiral/admiral-pro/internal/qr"
	"github.com/admiral/admiral-pro/internal/report"
	"github.com/admiral/admiral-pro/internal/whatsapp"
	"github.com/admiral/admiral-pro/pkg/logger"
)

const buildVersion = "2.0.0"

func main() {
	// 1. Config
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Config inválida: %v\n", err)
		os.Exit(1)
	}

	// 2. Logger
	logger.New(cfg.LogLevel, cfg.LogFormat, os.Stdout)
	slog.Info("🥃 Admiral Pro Backend",
		"env", cfg.AppEnv,
		"port", cfg.AppPort,
		"version", buildVersion,
	)

	// 3. DB
	ctx := context.Background()
	gormDB, err := db.Open(ctx, cfg.DatabaseURL, cfg.IsDev())
	if err != nil {
		slog.Error("no se pudo abrir BD", "err", err)
		os.Exit(1)
	}
	defer func() { _ = db.Close(gormDB) }()

	// 4. Event bus
	bus := event.New()

	// 5. Servicios
	jwtSvc, err := auth.NewJWTService(cfg.JWTSecret, cfg.JWTExpiresHours, "admiral-pro")
	if err != nil {
		slog.Error("JWT init falló", "err", err)
		os.Exit(1)
	}
	authSvc := auth.NewService(gormDB, jwtSvc)
	branchSvc := branch.NewService(gormDB)
	menuSvc := menu.NewService(gormDB)
	promoSvc := promotion.NewService(gormDB)
	posSvc := pos.NewService(gormDB, promoSvc, bus)
	crmSvc := crm.NewService(gormDB, bus)
	qrSvc := qr.NewService(gormDB, menuSvc, bus)
	reportSvc := report.NewService(gormDB)
	waSvc := whatsapp.NewService(gormDB, bus, whatsapp.Config{
		Enabled:            cfg.WhatsAppEnabled,
		PhoneNumberID:      cfg.WhatsAppPhoneNumberID,
		AccessToken:        cfg.WhatsAppAccessToken,
		WebhookVerifyToken: cfg.WhatsAppWebhookVerifyToken,
		AppSecret:          cfg.WhatsAppAppSecret,
		APIVersion:         cfg.WhatsAppAPIVersion,
		DefaultTenantID:    "",
	})

	// Admin sub-services
	adminMod := &admin.Module{
		Products:   admin.NewProductHandlers(admin.NewProductService(gormDB)),
		Categories: admin.NewCategoryHandlers(admin.NewCategoryService(gormDB)),
		Inventory:  admin.NewInventoryHandlers(admin.NewInventoryService(gormDB)),
		Users:      admin.NewUserHandlers(admin.NewUserService(gormDB)),
		Import:     admin.NewImportHandlers(admin.NewImportService(gormDB)),
	}

	// 6. Fiber app
	app := fiber.New(fiber.Config{
		AppName:               cfg.AppName,
		DisableStartupMessage: true,
		BodyLimit:             cfg.UploadMaxSizeMB * 1024 * 1024,
		ReadTimeout:           20 * time.Second,
		WriteTimeout:          30 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			message := "Error interno"
			errName := "InternalError"

			var e *fiber.Error
			if errors.As(err, &e) {
				code = e.Code
				message = e.Message
				switch code {
				case fiber.StatusNotFound:
					errName = "NotFound"
				case fiber.StatusBadRequest:
					errName = "BadRequest"
				case fiber.StatusUnauthorized:
					errName = "Unauthorized"
				case fiber.StatusForbidden:
					errName = "Forbidden"
				case fiber.StatusMethodNotAllowed:
					errName = "MethodNotAllowed"
				case fiber.StatusRequestEntityTooLarge:
					errName = "PayloadTooLarge"
				default:
					errName = "Error"
				}
			} else {
				slog.Error("error no manejado en handler", "err", err, "path", c.Path())
			}

			return c.Status(code).JSON(fiber.Map{
				"error":   errName,
				"message": message,
			})
		},
	})

	// Middleware de Seguridad (Helmet) con Content Security Policy (CSP) estricto y adaptativo
	if cfg.IsProd() {
		app.Use(helmet.New(helmet.Config{
			ContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;",
		}))
	} else {
		app.Use(helmet.New(helmet.Config{
			// En desarrollo permitimos 'unsafe-eval' para Next.js Hot Module Replacement (HMR)
			ContentSecurityPolicy: "default-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https:;",
		}))
	}
	if cfg.IsProd() {
		// Note: some Fiber versions don't expose EnableTrustedProxy; instead
		// respect an explicit env flag `TRUSTED_PROXY` to allow trusting
		// `X-Forwarded-Proto: https` when the app is behind a TLS-terminating proxy.
		app.Use(func(c *fiber.Ctx) error {
			secure := c.Secure()
			if !secure && cfg.TrustedProxy {
				if proto := strings.TrimSpace(c.Get("X-Forwarded-Proto")); strings.EqualFold(proto, "https") {
					secure = true
				}
			}
			if !secure {
				// Use Hostname() to get the host as a string (safer than casting request host bytes)
				return c.Redirect("https://"+c.Hostname()+c.OriginalURL(), fiber.StatusPermanentRedirect)
			}
			return c.Next()
		})
	}

	// Middlewares globales
	app.Use(middleware.Recover())
	app.Use(middleware.RequestLog())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     joinOrigins(cfg.AllowedOrigins()),
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Authorization,Content-Type,Accept",
		AllowCredentials: true,
	}))

	// Rate limit global (por IP)
	app.Use(limiter.New(limiter.Config{
		Max:        cfg.RateLimitMax,
		Expiration: time.Duration(cfg.RateLimitWindowSec) * time.Second,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
	}))

	// Servir archivos estáticos de subidas (fotos de asistencia, logos, etc.)
	app.Static("/uploads", "./uploads")

	// 7. Rutas — v1
	v1 := app.Group("/api/v1")

	// Públicas (sin JWT)
	health.NewHandlers(gormDB, buildVersion).Register(v1.Group("/health"))

	authH := auth.NewHandlers(authSvc)
	authH.RegisterPublic(v1.Group("/auth", limiter.New(limiter.Config{
		Max:        cfg.RateLimitAuthMax,
		Expiration: time.Duration(cfg.RateLimitWindowSec) * time.Second,
	})))

	brandH := brand.NewHandlers(authSvc, menuSvc, qrSvc)

	qrH := qr.NewHandlers(qrSvc, menuSvc, posSvc)
	qrH.RegisterPublic(v1.Group("/qr"))

	whatsapp.NewHandlers(waSvc).RegisterPublic(v1.Group("/whatsapp"))

	posH := pos.NewHandlers(posSvc, cfg)

	crmH := crm.NewHandlers(crmSvc)
	crmH.RegisterPublic(v1.Group("/crm/public"))

	// Privadas (requieren JWT)
	private := v1.Group("/", middleware.JWTAuth(jwtSvc))
	branch.NewHandlers(branchSvc).Register(private.Group("/branches"))
	brandH.RegisterPrivate(private.Group("/mi"))
	authH.RegisterPrivate(private.Group("/auth"))
	menu.NewHandlers(menuSvc).Register(private.Group("/menu"))
	promotion.NewHandlers(promoSvc).Register(private.Group("/promotions"))
	posH.Register(private.Group("/pos"))
	crmH.Register(private.Group("/crm"))
	qrH.RegisterPrivate(private.Group("/qr"))
	whatsapp.NewHandlers(waSvc).RegisterPrivate(private.Group("/whatsapp"))
	report.NewHandlers(reportSvc).Register(private.Group("/reports"))
	adminMod.Register(private.Group("/admin"))

	// 8. Arrancar servidor + graceful shutdown
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	go waSvc.RunWorker(workerCtx, 5*time.Second)

	go func() {
		addr := ":" + strconv.Itoa(cfg.AppPort)
		slog.Info("🚀 escuchando", "addr", addr, "frontend", cfg.FrontendURL)
		if err := app.Listen(addr); err != nil {
			slog.Error("listen falló", "err", err)
			os.Exit(1)
		}
	}()

	// Esperar señal de terminación (Ctrl+C, SIGTERM de Railway)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("🛑 Apagando con gracia...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	slog.Info("✅ Cerrado correctamente")
}

func joinOrigins(origins []string) string {
	if len(origins) == 0 {
		return "*"
	}
	out := ""
	for i, o := range origins {
		if i > 0 {
			out += ","
		}
		out += o
	}
	return out
}
