
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
    notes?: string;
    status: 'active' | 'inactive' | 'lead';
    machine_model?: string;
    plant_type?: 'DTL' | 'Recorder' | 'Delpro' | 'Rotary' | string;
    last_service_date?: string;
    service_interval_months?: number;
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
    low_stock_threshold?: number;
    location?: string;
}

export interface Job {
    id: string;
    created_at: string;
    job_number: number;
    customer_id: string;
    engineer_name?: string;
    service_type?: string;
    status: 'scheduled' | 'in_progress' | 'awaiting_parts' | 'completed' | 'cancelled';
    date_scheduled?: string;
    date_completed?: string;
    notes?: string;
    // Joins
    customers?: Customer;
    job_items?: JobItem[];
    attachments?: JobAttachment[];
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
    status: 'draft' | 'sent' | 'paid' | 'void' | 'partial' | 'overdue';
    pdf_url?: string;
    sent_count?: number;
    guest_name?: string; // For one-time invoices
    amount_paid?: number;
    payment_date?: string;
    customers?: Customer;
    invoice_items?: InvoiceItem[];
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    inventory_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    type: 'part' | 'labor' | 'service';
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
export interface Settings {
    id: string;
    company_name: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    contact_name: string;
    bank_name: string;
    account_name: string;
    iban: string;
    bic: string;
    vat_reg_number: string;
    default_vat_rate: number;
    webhook_url: string;
    updated_at: string;
}

export interface ServiceReport {
    id: string;
    created_at: string;
    job_id: string;
    customer_id?: string;
    report_data: any; // ReportState JSON blob
    tester?: string;
    test_date?: string;
    machine_make?: string;
    // Joins
    jobs?: Job;
    customers?: Customer;
}

export interface WarrantyReport {
    id: string;
    created_at: string;
    customer_id: string;
    job_id?: string;
    form_type: string;
    machine_model?: string;
    serial_number?: string;
    install_date?: string;
    report_data: any;
    technician_name?: string;
    customers?: Customer;
    jobs?: { 
        job_number: string;
    };
}

export * from './report';
export interface JobAttachment {
    id: string;
    created_at: string;
    job_id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
    uploaded_by?: string;
}
