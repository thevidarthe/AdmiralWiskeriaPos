// Package domain — tipos auxiliares para columnas JSONB y arrays nativos.
package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// JSONB representa una columna jsonb de PostgreSQL. Sirve para campos
// flexibles tipo config{} o metadata{}.
type JSONB map[string]any

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(src any) error {
	if src == nil {
		*j = JSONB{}
		return nil
	}
	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.New("JSONB: tipo no soportado en Scan")
	}
	return json.Unmarshal(data, j)
}

// IntArray mapea int[] de PostgreSQL.
type IntArray []int

func (a IntArray) Value() (driver.Value, error) {
	if a == nil {
		return "{}", nil
	}
	strs := make([]string, len(a))
	for i, v := range a {
		strs[i] = strconv.Itoa(v)
	}
	return "{" + strings.Join(strs, ",") + "}", nil
}

func (a *IntArray) Scan(src any) error {
	if src == nil {
		*a = IntArray{}
		return nil
	}
	var s string
	switch v := src.(type) {
	case []byte:
		s = string(v)
	case string:
		s = v
	default:
		return fmt.Errorf("IntArray: tipo no soportado: %T", src)
	}
	s = strings.Trim(s, "{}")
	if s == "" {
		*a = IntArray{}
		return nil
	}
	parts := strings.Split(s, ",")
	out := make(IntArray, 0, len(parts))
	for _, p := range parts {
		n, err := strconv.Atoi(strings.TrimSpace(p))
		if err != nil {
			return err
		}
		out = append(out, n)
	}
	*a = out
	return nil
}

// StringArray mapea text[] de PostgreSQL.
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return []byte{'{', '}'}, nil
	}
	escaped := make([]string, len(a))
	for i, v := range a {
		escaped[i] = `"` + strings.ReplaceAll(v, `"`, `\"`) + `"`
	}
	return "{" + strings.Join(escaped, ",") + "}", nil
}

func (a *StringArray) Scan(src any) error {
	if src == nil {
		*a = StringArray{}
		return nil
	}
	var s string
	switch v := src.(type) {
	case []byte:
		s = string(v)
	case string:
		s = v
	default:
		return fmt.Errorf("StringArray: tipo no soportado: %T", src)
	}
	s = strings.Trim(s, "{}")
	if s == "" {
		*a = StringArray{}
		return nil
	}
	parts := strings.Split(s, ",")
	out := make(StringArray, 0, len(parts))
	for _, p := range parts {
		out = append(out, strings.Trim(strings.TrimSpace(p), `"`))
	}
	*a = out
	return nil
}
