// Package auth — emisión y verificación de JWTs + manejo de PIN/password.
//
// 📚 JWT (JSON Web Token):
//   - Token firmado HS256 con un secret compartido
//   - El servidor genera el token y el cliente lo manda en cada request
//     como `Authorization: Bearer <token>`
//   - El servidor lo verifica con el mismo secret; si la firma no cuadra,
//     rechaza la petición.
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims es lo que va dentro del JWT. Hereda jwt.RegisteredClaims para
// tener `exp`, `iat`, etc. y añade los campos propios del dominio.
type Claims struct {
	jwt.RegisteredClaims
	TenantID   string `json:"tid"`
	TenantSlug string `json:"tslug"`
	Role       string `json:"role"`
	Name       string `json:"name"`
	Email      string `json:"email"`
}

// JWTService firma y verifica tokens.
type JWTService struct {
	secret     []byte
	expiration time.Duration
	issuer     string
}

// NewJWTService crea el servicio. Falla si el secret no es seguro.
func NewJWTService(secret string, expiresHours int, issuer string) (*JWTService, error) {
	if len(secret) < 32 {
		return nil, errors.New("JWT secret debe tener al menos 32 caracteres")
	}
	if expiresHours <= 0 {
		expiresHours = 8
	}
	if issuer == "" {
		issuer = "admiral-pro"
	}
	return &JWTService{
		secret:     []byte(secret),
		expiration: time.Duration(expiresHours) * time.Hour,
		issuer:     issuer,
	}, nil
}

// Sign genera un token firmado con los claims dados.
func (s *JWTService) Sign(userID, tenantID, tenantSlug, role, name, email string) (string, time.Time, error) {
	now := time.Now()
	exp := now.Add(s.expiration)

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    s.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
		TenantID:   tenantID,
		TenantSlug: tenantSlug,
		Role:       role,
		Name:       name,
		Email:      email,
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("auth: firmando token: %w", err)
	}
	return signed, exp, nil
}

// Verify valida la firma y la expiración; devuelve los claims.
func (s *JWTService) Verify(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de firma inesperado: %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("token inválido")
	}
	return claims, nil
}
