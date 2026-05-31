package crm

import (
	"testing"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

func TestNormalizePhone_Colombia10Digits(t *testing.T) {
	assert.Equal(t, "+573102345678", normalizePhone("3102345678"))
	assert.Equal(t, "+573102345678", normalizePhone("310 234 5678"))
	assert.Equal(t, "+573102345678", normalizePhone("(310) 234-5678"))
}

func TestNormalizePhone_PreservesInternational(t *testing.T) {
	assert.Equal(t, "+573102345678", normalizePhone("+57 310 234 5678"))
}

func TestEvalLevel(t *testing.T) {
	cases := []struct {
		spent float64
		want  domain.LoyaltyLevel
	}{
		{0, domain.LoyaltyClassic},
		{100_000, domain.LoyaltyClassic},
		{500_000, domain.LoyaltySilver},
		{1_500_000, domain.LoyaltySilver},
		{2_000_000, domain.LoyaltyGold},
		{4_999_999, domain.LoyaltyGold},
		{5_000_000, domain.LoyaltyPlatinum},
	}
	for _, c := range cases {
		got := evalLevel(decimal.NewFromFloat(c.spent))
		assert.Equal(t, c.want, got, "para %v", c.spent)
	}
}
