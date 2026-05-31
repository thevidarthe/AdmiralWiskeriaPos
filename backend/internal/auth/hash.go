package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword aplica bcrypt con coste 12 (~250 ms en hardware moderno).
func HashPassword(pwd string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pwd), 12)
	return string(b), err
}

// CheckPassword compara una contraseña en texto plano contra un hash.
// Es constant-time (no es vulnerable a timing attacks).
func CheckPassword(pwd, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pwd)) == nil
}
