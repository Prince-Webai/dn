
export interface Customer {
    id: string;
    created_at: string;
    name: string;
    address?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    account_balance: number;
    payment_terms: string;
}

export interface InventoryItem {
    id: string;
    created_at: string;
    sku: string;
    name: string;
    category?: string;
    description?: string;
    cost_price: number;
    sell_price: number;
    stock_level: number;
    location?: string;
}

export interface Job {
    id: string;
    created_at: string;
    job_number: number;
    customer_id: string;
    engineer_name?: string;
    service_type?: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    date_scheduled?: string;
    date_completed?: string;
    notes?: string;
    // Joins
    customers?: Customer;
}

export interface JobItem {
    id: string;
    job_id: string;
    inventory_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    type: 'part' | 'labor' | 'service';
    // Joins
    inventory?: InventoryItem;
    jobs?: Job;
}

export interface Invoice {
    id: string;
    created_at: string;
    invoice_number: string;
    customer_id: string;
    job_id?: string;
    date_issued: string;
    due_date?: string;
    subtotal: number;
    vat_rate?: number;
    vat_amount: number;
    total_amount: number;
    custom_description?: string;
    status: 'draft' | 'sent' | 'paid' | 'void';
    pdf_url?: string;
    guest_name?: string; // For one-time invoices
    customers?: Customer;
}

export interface Statement {
    id: string;
    created_at: string;
    statement_number: string;
    customer_id: string;
    job_id?: string;
    date_generated: string;
    total_amount: number;
    pdf_url?: string;
    // Joins
    customers?: Customer;
    jobs?: Job;
}

export interface Quote {
    id: string;
    created_at: string;
    quote_number: string;
    customer_id: string;
    description: string;
    date_issued: string;
    valid_until?: string;
    subtotal: number;
    vat_rate?: number;
    vat_amount: number;
    total_amount: number;
    status: 'draft' | 'pending' | 'accepted' | 'rejected';
    notes?: string;
    // Joins
    customers?: Customer;
    quote_items?: QuoteItem[];
}

export interface QuoteItem {
    id: string;
    quote_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}
