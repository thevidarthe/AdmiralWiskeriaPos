// Package auth — lógica de negocio de autenticación.
package auth

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"gorm.io/gorm"
)

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000 // Radio de la Tierra en metros
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0
	
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
		math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c // Distancia en metros
}

const (
	MaxFailedAttempts = 5
	LockDuration      = 15 * time.Minute
)

// Errores semánticos exportados — los handlers los traducen a 401/403.
var (
	ErrInvalidCredentials = errors.New("credenciales inválidas")
	ErrTenantInvalid      = errors.New("tenant inválido")
	ErrAccountLocked      = errors.New("cuenta bloqueada por intentos fallidos")
	ErrCurrentPasswordBad = errors.New("la contraseña actual no es correcta")
)

// Service agrupa las operaciones de auth.
type Service struct {
	db  *gorm.DB
	jwt *JWTService
}

// NewService construye el servicio. db es la conexión GORM activa.
func NewService(db *gorm.DB, jwt *JWTService) *Service {
	return &Service{db: db, jwt: jwt}
}

// LoginResult es lo que devuelven los handlers tras login exitoso.
type LoginResult struct {
	AccessToken string         `json:"accessToken"`
	ExpiresAt   time.Time      `json:"expiresAt"`
	User        UserPayload    `json:"user"`
}

type UserPayload struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	AvatarURL string `json:"avatarUrl,omitempty"`
}

// LoginWithPassword — login estándar email + contraseña.
func (s *Service) LoginWithPassword(ctx context.Context, tenantSlug, email, password string) (*LoginResult, error) {
	tenant, err := s.findTenant(ctx, tenantSlug)
	if err != nil {
		return nil, err
	}

	var user domain.User
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND lower(email) = lower(?)", tenant.ID, strings.TrimSpace(email)).
		First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !user.Active {
		return nil, ErrInvalidCredentials
	}
	if err := s.assertNotLocked(&user); err != nil {
		return nil, err
	}
	if !CheckPassword(password, user.PasswordHash) {
		_ = s.registerFailure(ctx, &user)
		return nil, ErrInvalidCredentials
	}

	if err := s.registerSuccess(ctx, &user); err != nil {
		return nil, err
	}
	return s.issueToken(&user, tenant.Slug)
}

// LoginWithPIN — login rápido para empleados ya identificados (por userId).
func (s *Service) LoginWithPIN(ctx context.Context, tenantSlug, userID, pin string) (*LoginResult, error) {
	tenant, err := s.findTenant(ctx, tenantSlug)
	if err != nil {
		return nil, err
	}

	var user domain.User
	if err := s.db.WithContext(ctx).First(&user, "id = ? AND tenant_id = ?", userID, tenant.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !user.Active {
		return nil, ErrInvalidCredentials
	}
	if err := s.assertNotLocked(&user); err != nil {
		return nil, err
	}
	if !CheckPassword(pin, user.PINHash) {
		_ = s.registerFailure(ctx, &user)
		return nil, ErrInvalidCredentials
	}

	if err := s.registerSuccess(ctx, &user); err != nil {
		return nil, err
	}
	return s.issueToken(&user, tenant.Slug)
}

// LoginableUsers — usados por la pantalla de selección de rol del frontend.
func (s *Service) LoginableUsers(ctx context.Context, tenantSlug string) ([]UserPayload, error) {
	tenant, err := s.findTenant(ctx, tenantSlug)
	if err != nil {
		return nil, err
	}
	var users []domain.User
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND active = true", tenant.ID).
		Order("name asc").
		Find(&users).Error; err != nil {
		return nil, err
	}
	out := make([]UserPayload, len(users))
	for i, u := range users {
		out[i] = UserPayload{ID: u.ID, Name: u.Name, Email: u.Email, Role: string(u.Role), AvatarURL: u.AvatarURL}
	}
	return out, nil
}

// ChangePassword cambia la contraseña validando la anterior.
func (s *Service) ChangePassword(ctx context.Context, userID, current, next string) error {
	var user domain.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return err
	}
	if !CheckPassword(current, user.PasswordHash) {
		return ErrCurrentPasswordBad
	}
	hash, err := HashPassword(next)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Model(&user).Update("password_hash", hash).Error
}

// ChangePIN cambia el PIN, validando con la contraseña.
func (s *Service) ChangePIN(ctx context.Context, userID, currentPassword, newPIN string) error {
	var user domain.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return err
	}
	if !CheckPassword(currentPassword, user.PasswordHash) {
		return ErrCurrentPasswordBad
	}
	hash, err := HashPassword(newPIN)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Model(&user).
		Updates(map[string]any{"pin_hash": hash, "failed_attempts": 0, "locked_until": nil}).Error
}

// ─── Helpers internos ─────────────────────────────────────────

func (s *Service) findTenant(ctx context.Context, slug string) (*domain.Tenant, error) {
	var t domain.Tenant
	if err := s.db.WithContext(ctx).First(&t, "slug = ? AND active = true", slug).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTenantInvalid
		}
		return nil, err
	}
	return &t, nil
}

func (s *Service) assertNotLocked(u *domain.User) error {
	if u.LockedUntil != nil && u.LockedUntil.After(time.Now()) {
		return ErrAccountLocked
	}
	return nil
}

func (s *Service) registerFailure(ctx context.Context, u *domain.User) error {
	next := u.FailedAttempts + 1
	updates := map[string]any{"failed_attempts": next}
	if next >= MaxFailedAttempts {
		t := time.Now().Add(LockDuration)
		updates["locked_until"] = &t
	}
	return s.db.WithContext(ctx).Model(u).Updates(updates).Error
}

func (s *Service) registerSuccess(ctx context.Context, u *domain.User) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(u).Updates(map[string]any{
		"failed_attempts": 0,
		"locked_until":    nil,
		"last_login_at":   &now,
	}).Error
}

func (s *Service) issueToken(u *domain.User, tenantSlug string) (*LoginResult, error) {
	token, exp, err := s.jwt.Sign(u.ID, u.TenantID, tenantSlug, string(u.Role), u.Name, u.Email)
	if err != nil {
		return nil, err
	}
	return &LoginResult{
		AccessToken: token,
		ExpiresAt:   exp,
		User: UserPayload{
			ID:        u.ID,
			Name:      u.Name,
			Email:     u.Email,
			Role:      string(u.Role),
			AvatarURL: u.AvatarURL,
		},
	}, nil
}

// ClockInOut registra un evento de entrada o salida de asistencia con foto, geolocalización e IP.
func (s *Service) ClockInOut(
	ctx context.Context,
	tenantID, branchID, userID, eventType string,
	photoBytes []byte,
	photoExt string,
	lat, lon *float64,
	ip, ua string,
) (*domain.StaffAttendance, error) {
	// 1. Validar doble marcación consecutiva del mismo tipo para evitar duplicados
	var lastAttendance domain.StaffAttendance
	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("timestamp DESC").
		First(&lastAttendance).Error
	if err == nil {
		if lastAttendance.EventType == eventType {
			if eventType == "CLOCK_IN" {
				return nil, errors.New("operación bloqueada: ya registraste una ENTRADA. Debes registrar una SALIDA antes de marcar otra entrada")
			}
			return nil, errors.New("operación bloqueada: ya registraste una SALIDA. Debes registrar una ENTRADA antes de marcar otra salida")
		}
	}

	var photoURL string
	if len(photoBytes) > 0 {
		// Asegurar la carpeta física
		uploadDir := "./uploads/attendance"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			return nil, err
		}

		// Crear un nombre único de archivo
		fileName := fmt.Sprintf("att_%s_%d.%s", userID, time.Now().Unix(), photoExt)
		fullPath := filepath.Join(uploadDir, fileName)

		// Escribir los bytes físicamente
		if err := os.WriteFile(fullPath, photoBytes, 0644); err != nil {
			return nil, err
		}

		// URL pública servida por el POS
		photoURL = "/uploads/attendance/" + fileName
	}

	// 2. Geofencing y Auditoría de Coordenadas GPS
	metadata := domain.JSONB{}
	if lat != nil && lon != nil {
		branchLat := 0.0
		branchLon := 0.0
		geofenceRadius := 100.0
		hasCoords := false

		var branch struct {
			Settings domain.JSONB
		}
		if err := s.db.WithContext(ctx).Table("branches").Select("settings").Where("id = ?", branchID).First(&branch).Error; err == nil {
			if sLat, ok := branch.Settings["latitude"].(float64); ok {
				branchLat = sLat
				hasCoords = true
			}
			if sLon, ok := branch.Settings["longitude"].(float64); ok {
				branchLon = sLon
			}
			if sRad, ok := branch.Settings["geofenceRadiusMeters"].(float64); ok {
				geofenceRadius = sRad
			}
		}

		if hasCoords {
			dist := haversine(*lat, *lon, branchLat, branchLon)
			inside := dist <= geofenceRadius

			metadata["distance_meters"] = dist
			metadata["inside_geofence"] = inside
			metadata["geofence_radius_meters"] = geofenceRadius
		} else {
			metadata["geofence_skipped"] = true
			metadata["geofence_reason"] = "branch has no coordinates configured"
		}
	}

	attendance := &domain.StaffAttendance{
		ID:        domain.NewID(),
		TenantID:  tenantID,
		BranchID:  branchID,
		UserID:    userID,
		EventType: eventType,
		Timestamp: time.Now(),
		PhotoURL:  photoURL,
		Latitude:  lat,
		Longitude: lon,
		IPAddress: ip,
		UserAgent: ua,
		Metadata:  metadata,
	}

	if err := s.db.WithContext(ctx).Create(attendance).Error; err != nil {
		return nil, err
	}

	return attendance, nil
}

// GetAttendanceHistory obtiene el historial cronológico de marcaciones del empleado.
func (s *Service) GetAttendanceHistory(ctx context.Context, tenantID, userID string) ([]domain.StaffAttendance, error) {
	var history []domain.StaffAttendance
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("timestamp DESC").
		Limit(30).
		Find(&history).Error; err != nil {
		return nil, err
	}
	return history, nil
}
