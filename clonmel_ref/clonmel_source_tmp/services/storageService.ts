
import { createClient } from '@supabase/supabase-js';
import { Product, Invoice, User, Customer } from '../types';

const SUPABASE_URL = 'https://azyeptjbktvkqiigotbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWVwdGpia3R2a3FpaWdvdGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODc0MjYsImV4cCI6MjA4MzQ2MzQyNn0.XHc7sOAgRW9AQJvOFVQ25R0ovsIr8Bxnv_hukDag2LY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isTableMissingError = (error: any) => {
  return error?.message?.includes('Could not find the table') || error?.code === 'PGRST116' || error?.code === '42P01';
};

const isColumnMissingError = (error: any) => {
  const msg = error?.message || '';
  return (
    error?.code === 'PGRST107' ||
    error?.code === '42703' ||
    msg.includes('Could not find the') ||
    msg.includes('column') ||
    msg.includes('schema cache')
  );
};

export const storageService = {
  // --- Products ---
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return data || [];
  },

  async addProduct(product: Product): Promise<void> {
    const { error } = await supabase.from('products').insert([product]);
    if (error) throw error;
  },

  async updateProduct(product: Product): Promise<void> {
    const { error } = await supabase.from('products').update(product).eq('id', String(product.id));
    if (error) throw error;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', String(id));
    if (error) throw error;
  },

  // --- Invoices ---
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*').order('date_issued', { ascending: false });
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return (data || []).map(inv => ({
      ...inv,
      invoiceNumber: String(inv.invoice_number || ''),
      customerId: String(inv.customer_id || ''),
      customerName: String(inv.customer_name || ''),
      customerEmail: String(inv.customer_email || ''),
      customerPhone: String(inv.customer_phone || ''),
      customerAddress: String(inv.customer_address || ''),
      taxRate: Number(inv.tax_rate || 0),
      taxAmount: Number(inv.tax_amount || 0),
      amountPaid: Number(inv.amount_paid || 0),
      balanceDue: Number(inv.balance_due || 0),
      dateIssued: String(inv.date_issued || ''),
      dueDate: String(inv.due_date || ''),
      createdBy: String(inv.created_by || ''),
      lastReminderSent: inv.last_reminder_sent ? String(inv.last_reminder_sent) : undefined
    }));
  },

  async addInvoice(invoice: any): Promise<void> {
    const dbInvoice = {
      id: String(invoice.id),
      invoice_number: String(invoice.invoiceNumber),
      customer_id: String(invoice.customerId),
      customer_name: String(invoice.customerName),
      customer_email: String(invoice.customerEmail),
      customer_phone: String(invoice.customerPhone || ''),
      customer_address: String(invoice.customerAddress),
      company: String(invoice.company || 'clonmel'),
      items: invoice.items,
      subtotal: Number(invoice.subtotal),
      tax_rate: Number(invoice.taxRate),
      tax_amount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      amount_paid: Number(invoice.amountPaid),
      balance_due: Number(invoice.balanceDue),
      status: String(invoice.status),
      date_issued: String(invoice.dateIssued),
      due_date: String(invoice.dueDate),
      notes: String(invoice.notes || ''),
      created_by: String(invoice.createdBy),
      last_reminder_sent: invoice.lastReminderSent ? String(invoice.lastReminderSent) : null
    };
    const { error } = await supabase.from('invoices').insert([dbInvoice]);
    if (error) throw error;
  },

  async updateInvoice(invoice: any): Promise<void> {
    const updatePayload: any = {};
    if (invoice.amountPaid !== undefined) updatePayload.amount_paid = Number(invoice.amountPaid);
    if (invoice.balanceDue !== undefined) updatePayload.balance_due = Number(invoice.balanceDue);
    if (invoice.status !== undefined) updatePayload.status = String(invoice.status);
    if (invoice.lastReminderSent !== undefined) updatePayload.last_reminder_sent = invoice.lastReminderSent ? String(invoice.lastReminderSent) : null;

    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await supabase.from('invoices').update(updatePayload).eq('id', String(invoice.id));

    if (error) {
      if (isColumnMissingError(error)) {
        if (updatePayload.last_reminder_sent !== undefined) {
          const schemaError = new Error('COLUMN_MISSING_REMINDER');
          (schemaError as any).originalError = error;
          throw schemaError;
        }
      }
      throw error;
    }
  },

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', String(id));
    if (error) throw error;
  },

  // --- Users ---
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return data || [];
  },

  async addUser(user: User): Promise<void> {
    const { error } = await supabase.from('users').insert([user]);
    if (error) throw error;
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Logo ---
  async getLogo(): Promise<string> {
    try {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'company_logo').maybeSingle();
      if (error && isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return data?.value || '';
    } catch (e) {
      if (e instanceof Error && e.message === 'DATABASE_MISSING') throw e;
      return '';
    }
  },

  async saveLogo(logo: string): Promise<void> {
    const { error } = await supabase.from('app_settings').upsert({ key: 'company_logo', value: logo });
    if (error) throw error;
  },

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return (data || []).map(cust => ({
      ...cust,
      createdAt: String(cust.created_at || ''),
      updatedAt: String(cust.updated_at || ''),
      createdBy: String(cust.created_by || ''),
      postalCode: cust.postal_code
    }));
  },

  async addCustomer(customer: Customer): Promise<void> {
    const dbCustomer = {
      id: String(customer.id),
      name: String(customer.name),
      email: String(customer.email),
      phone: String(customer.phone),
      gender: customer.gender,
      address: customer.address,
      city: customer.city,
      postal_code: customer.postalCode,
      country: customer.country,
      company: customer.company,
      notes: customer.notes,
      tags: customer.tags || [],
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
      created_by: customer.createdBy
    };
    const { error } = await supabase.from('customers').insert([dbCustomer]);
    if (error) throw error;
  },

  async updateCustomer(customer: Customer): Promise<void> {
    const dbCustomer = {
      name: String(customer.name),
      email: String(customer.email),
      phone: String(customer.phone),
      gender: customer.gender,
      address: customer.address,
      city: customer.city,
      postal_code: customer.postalCode,
      country: customer.country,
      company: customer.company,
      notes: customer.notes,
      tags: customer.tags || [],
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('customers').update(dbCustomer).eq('id', String(customer.id));
    if (error) throw error;
  },

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', String(id));
    if (error) throw error;
  },

  async exportFullBackup(): Promise<string> {
    const [products, invoices, users, logo] = await Promise.all([
      this.getProducts(),
      this.getInvoices(),
      this.getUsers(),
      this.getLogo()
    ]);
    return JSON.stringify({ products, invoices, users, logo, exportedAt: new Date().toISOString() }, null, 2);
  },

  async seedData(products: Product[], users: User[]): Promise<void> {
    const { error: pError } = await supabase.from('products').upsert(products, { onConflict: 'id' });
    if (pError) console.error("Error seeding products:", pError);
    const { error: uError } = await supabase.from('users').upsert(users, { onConflict: 'id' });
    if (uError) console.error("Error seeding users:", uError);
  }
};
