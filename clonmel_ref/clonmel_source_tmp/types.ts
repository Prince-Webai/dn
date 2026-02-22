
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string; // e.g., 'sqm', 'pcs', 'hour'
  category: string;
}

export interface InvoiceItem {
  id: string;
  productId: string; // link to Product
  description: string; // Allow override or custom
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  company?: 'clonmel' | 'mirrorzone'; // Company selection
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: PaymentStatus;
  dateIssued: string;
  dueDate: string;
  notes?: string;
  createdBy: string;
  lastReminderSent?: string; // ISO Date of last reminder
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'INVOICES' | 'CREATE_INVOICE' | 'PRODUCTS' | 'USERS' | 'CALENDAR' | 'CUSTOMERS';
