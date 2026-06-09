package httpx

import (
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Pagination struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

type PaginatedResult[T any] struct {
	Data []T            `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

func ParsePagination(c *fiber.Ctx) Pagination {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 200 {
		pageSize = 200
	}
	return Pagination{Page: page, PageSize: pageSize}
}

func (p Pagination) Offset() int {
	return (p.Page - 1) * p.PageSize
}

func NewPaginatedResult[T any](data []T, total int, p Pagination) PaginatedResult[T] {
	totalPages := int(math.Ceil(float64(total) / float64(p.PageSize)))
	return PaginatedResult[T]{
		Data: data,
		Meta: PaginationMeta{
			Page:       p.Page,
			PageSize:   p.PageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}
}
