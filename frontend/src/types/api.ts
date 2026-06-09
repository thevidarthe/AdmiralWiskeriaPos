export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  basePrice: number;
  costPrice?: number;
  unit: string;
  available: boolean;
  trackInventory: boolean;
  imageUrl?: string;
  categoryId: string;
  category?: Category;
  taxRate: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface Sale {
  id: string;
  tenantId: string;
  branchId: string;
  status: 'OPEN' | 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  source: 'POS' | 'QR' | 'WAITER';
  items: SaleItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  tipAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
  promoApplied?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyLevel: 'CLASSIC' | 'SILVER' | 'GOLD' | 'PLATINUM';
  pointsBalance: number;
  totalSpent: number;
  visitCount: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'BARISTA' | 'WAITER' | 'CASHIER';
  active: boolean;
  lastLoginAt?: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  timezone: string;
  active: boolean;
}

export interface QrOrder {
  saleId: string;
  status: string;
  items: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string>;
}

export interface SplitInfo {
  saleId: string;
  grandTotal: number;
  status: string;
  shares: SplitShare[];
}

export interface SplitShare {
  id: string;
  name: string;
  phone: string;
  shareAmount: number;
  status: 'PENDING' | 'PAID';
  paymentMethod?: string;
}

export interface QrMenuInfo {
  tenantId: string;
  branchId: string;
  table: { id: string; number: string };
  zone?: { name: string; type: string };
  categories: Category[];
  products: Product[];
}
