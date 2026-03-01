import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Printer, Download, Plus, Clock, Trash2, Edit, CreditCard, Mail, CheckCircle2, Eye, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, Job, Statement } from '../types';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { generateInvoice, generateStatement, generateOneTimeInvoice } from '../lib/pdfGenerator';
import { useToast } from '../context/ToastContext';
import { dataService } from '../services/dataService';
import SearchableSelect from '../components/SearchableSelect';
import { Percent } from 'lucide-react';

const Invoices = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'invoices' | 'statements'>('invoices');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [statements, setStatements] = useState<Statement[]>([]);
    const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit & Payment States
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number | string>('');

    // Delete confirmation state
    const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
    const [deleteStatementId, setDeleteStatementId] = useState<string | null>(null);

    // Edit Invoice Form State
    const [description, setDescription] = useState('');
    const [vatRate, setVatRate] = useState(13.5);
    const [dueDate, setDueDate] = useState('');
    const [editItems, setEditItems] = useState<any[]>([]);

    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredInvoices = useMemo(() => {
        if (statusFilter === 'all') return invoices;
        if (statusFilter === 'overdue') {
            return invoices.filter(inv => {
                const s = inv.status as string;
                if (s === 'overdue') return true;
                if (s !== 'paid' && s !== 'void' && inv.due_date && new Date(inv.due_date) < new Date()) return true;
                return false;
            });
        }
        return invoices.filter(inv => inv.status === statusFilter);
    }, [invoices, statusFilter]);

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredInvoices, currentPage, itemsPerPage]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Invoices via DataService
            const invData = await dataService.getInvoices();
            setInvoices(invData);

            // Fetch Statements
            const { data: stmtData } = await supabase.from('statements').select('*, customers(*), jobs(*)').order('date_generated', { ascending: false });
            setStatements(stmtData || []);

            // Fetch Completed Jobs via DataService
            const jobData = await dataService.getJobs('completed');

            // Filter out jobs that already have an invoice or statement
            const invoicedJobIds = new Set(invData.map(inv => inv.job_id).filter(Boolean));
            const statementJobIds = new Set((stmtData || []).map(stmt => stmt.job_id).filter(Boolean));
            const pendingJobs = jobData.filter(job => !invoicedJobIds.has(job.id) && !statementJobIds.has(job.id));

            setCompletedJobs(pendingJobs);

            // Fetch Inventory for Edit Invoice Modal
            const { data: invItems } = await supabase.from('inventory').select('*').order('name');
            setInventory(invItems || []);
        } finally {
            setLoading(false);
        }
    };


    const handlePreviewStatement = async (statement: Statement) => {
        await handleDownloadStatement(statement, 'preview');
    };

    const handleDownloadStatement = async (statement: Statement, action: 'download' | 'preview' = 'download') => {
        if (!statement.customers) {
            console.error('Statement missing customer data:', statement);
            showToast('Error', 'Missing customer reference for this statement.', 'error');
            return;
        }

        try {
            let items: any[] = [];

            // Only try to fetch if job_id exists
            if (statement.job_id) {
                const { data: jobItems } = await supabase
                    .from('job_items')
                    .select('*')
                    .eq('job_id', statement.job_id);

                if (jobItems) items = jobItems;
            }

            const finalJob = Array.isArray(statement.jobs) ? statement.jobs[0] : statement.jobs;
            const finalCustomer = Array.isArray(statement.customers) ? statement.customers[0] : statement.customers;

            const pdfData = await generateStatement(finalJob as any, items, finalCustomer as any, statement, action) as any;
            if (pdfData && action === 'preview') {
                const newWindow = window.open(pdfData.url, '_blank');
                if (newWindow) {
                    newWindow.document.title = pdfData.filename;
                }
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to generate statement PDF.', 'error');
        }
    };

    const handlePreviewInvoice = async (invoice: Invoice) => {
        await handleDownloadInvoice(invoice, 'preview');
    };

    const handleDownloadInvoice = async (invoice: Invoice, action: 'download' | 'preview' = 'download') => {
        if (!invoice.customers && !invoice.guest_name) {
            showToast('Error', 'Missing customer data.', 'error');
            return;
        }

        try {
            // For standard invoices, we need items
            if (invoice.customers || invoice.guest_name) {
                let items: any[] = [];
                let engineerName = 'Prince Gaur';

                if (invoice.job_id) {
                    // Fetch Job items
                    const { data: jobData } = await supabase.from('jobs').select('engineer_name').eq('id', invoice.job_id).single();
                    if (jobData) engineerName = jobData.engineer_name;

                    const { data: jobItems } = await supabase.from('job_items').select('*').eq('job_id', invoice.job_id);
                    items = jobItems || [];
                } else {
                    // Fetch Standalone Invoice items
                    const { data: invItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id);
                    items = invItems || [];
                }

                if (invoice.guest_name) {
                    // Re-construct one-time invoice data
                    const pdfData = await generateOneTimeInvoice({
                        customerName: invoice.guest_name,
                        totalAmount: invoice.total_amount,
                        customerAddress: invoice.customers?.address || ''
                    }, items.map(i => ({
                        description: i.description,
                        quantity: i.quantity,
                        unitPrice: i.unit_price
                    })), action) as any;

                    if (pdfData && action === 'preview') {
                        const newWindow = window.open(pdfData.url, '_blank');
                        if (newWindow) {
                            newWindow.document.title = pdfData.filename;
                        }
                    }
                } else if (invoice.customers) {
                    const pdfData = await generateInvoice(
                        invoice.invoice_number,
                        invoice.customers,
                        items,
                        invoice.vat_rate || 13.5,
                        invoice.total_amount,
                        action,
                        invoice.status.toUpperCase(),
                        engineerName
                    ) as any;

                    if (pdfData && action === 'preview') {
                        const newWindow = window.open(pdfData.url, '_blank');
                        if (newWindow) {
                            newWindow.document.title = pdfData.filename;
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to generate invoice preview.', 'error');
        }
    };

    // --- Payment Handlers ---
    const openPaymentPopup = (invoice: Invoice) => {
        setPaymentInvoice(invoice);
        setPaymentAmount((invoice.total_amount - (invoice.amount_paid || 0)).toFixed(2));
    };

    const handlePaymentSubmit = async () => {
        if (!paymentInvoice) return;

        const parsedAmount = typeof paymentAmount === 'string' ? parseFloat(paymentAmount) : paymentAmount;
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            showToast('Error', 'Please enter a valid payment amount', 'error');
            return;
        }

        const newAmountPaid = (paymentInvoice.amount_paid || 0) + parsedAmount;
        let newStatus: Invoice['status'] = paymentInvoice.status;

        if (newAmountPaid >= paymentInvoice.total_amount) {
            newStatus = 'paid';
        } else if (newAmountPaid > 0) {
            newStatus = 'partial';
        }

        const { error } = await dataService.updateInvoice(paymentInvoice.id, {
            amount_paid: newAmountPaid,
            status: newStatus,
            payment_date: new Date().toISOString()
        });

        if (!error) {
            if (paymentInvoice.customer_id) {
                await dataService.recalculateCustomerBalance(paymentInvoice.customer_id);
            }
            showToast('Success', 'Payment recorded successfully', 'success');
            setPaymentInvoice(null);
            fetchData();
        } else {
            showToast('Error', 'Failed to record payment', 'error');
        }
    };

    // --- Edit Handlers ---
    const openEditModal = async (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setDescription(invoice.custom_description || '');
        setVatRate(invoice.vat_rate || 13.5);
        setDueDate(invoice.due_date || '');

        // Fetch existing items
        const items = await dataService.getInvoiceItems(invoice.id);
        setEditItems(items || []);

        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingInvoice) return;

        // Recalculate totals
        const subtotal = editItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const vatAmount = subtotal * (vatRate / 100);
        const totalAmount = subtotal + vatAmount;

        // 1. Update Invoice Header
        const { error: invError } = await dataService.updateInvoice(editingInvoice.id, {
            custom_description: description,
            vat_rate: vatRate,
            due_date: dueDate,
            subtotal,
            vat_amount: vatAmount,
            total_amount: totalAmount
        });

        if (invError) {
            showToast('Error', 'Failed to update invoice header', 'error');
            return;
        }

        // 2. Update Items (Delete and Re-insert)
        const { error: delError } = await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoice.id);
        if (delError) {
            showToast('Error', 'Failed to update items', 'error');
            return;
        }

        if (editItems.length > 0) {
            const itemsToInsert = editItems.map(item => ({
                invoice_id: editingInvoice.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                type: item.type || 'service'
            }));
            const { error: insError } = await dataService.addInvoiceItems(itemsToInsert);
            if (insError) {
                showToast('Error', 'Failed to re-insert items', 'error');
                return;
            }
        }

        showToast('Success', 'Invoice updated successfully', 'success');
        setIsEditOpen(false);
        fetchData();
    };

    // --- Reminder Handler ---
    const handleSendReminder = async (invoice: Invoice) => {
        const settings = await dataService.getSettings();
        const currentSentCount = invoice.sent_count || 0;
        const isFirstMail = currentSentCount === 0;

        if (settings?.webhook_url) {
            try {
                const response = await fetch(settings.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: isFirstMail ? 'invoice_sent' : 'invoice_reminder',
                        invoice_id: invoice.id,
                        invoice_number: invoice.invoice_number,
                        customer_email: invoice.customers?.email,
                        customer_name: invoice.customers?.name,
                        amount_due: invoice.total_amount - (invoice.amount_paid || 0),
                        due_date: invoice.due_date,
                        sent_count: currentSentCount + 1
                    })
                });

                if (response.ok) {
                    showToast('Success', isFirstMail ? 'Invoice sent via webhook' : 'Reminder triggered via webhook', 'success');

                    // Update sent_count and status in DB
                    const updates: Partial<Invoice> = {
                        sent_count: currentSentCount + 1
                    };
                    if (isFirstMail && invoice.status === 'draft') {
                        updates.status = 'sent';
                    }

                    await dataService.updateInvoice(invoice.id, updates);
                    fetchData();
                    return;
                }
            } catch (error) {
                console.error('Webhook error:', error);
            }
        }

        // Update sent_count for mailto fallback too
        const updates: Partial<Invoice> = {
            sent_count: currentSentCount + 1
        };
        if (isFirstMail && invoice.status === 'draft') {
            updates.status = 'sent';
        }
        await dataService.updateInvoice(invoice.id, updates);
        fetchData();

        // Fallback to mailto
        if (!invoice.customers?.email) {
            alert('Customer does not have an email address.');
            return;
        }

        const subject = `Invoice Reminder: #${invoice.invoice_number}`;
        const body = `Dear ${invoice.customers.name},\n\nThis is a reminder for Invoice #${invoice.invoice_number} due for €${(invoice.total_amount - (invoice.amount_paid || 0)).toFixed(2)}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n${settings?.company_name || 'Condon Dairy'}`;

        window.location.href = `mailto:${invoice.customers.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };


    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading documents...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Invoices & Statements</h1>
                    <p className="text-slate-500">Manage invoicing and customer statements</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/documents/new?type=invoice"
                        className="btn btn-primary shadow-lg shadow-blue-900/20"
                    >
                        <Plus size={20} className="mr-2" /> Create Invoice
                    </Link>
                </div>
            </div>

            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Printer size={18} /> Invoices
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('statements')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'statements' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <FileText size={18} /> Statements
                    </div>
                </button>
            </div>

            {/* Main Content Area (Full Width) */}
            <div className="section-card border border-slate-100 min-h-[500px]">

                {/* INVOICES TAB */}
                {activeTab === 'invoices' && (
                    <>
                        <div className="p-4 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
                                <span className="text-xs font-bold text-slate-400">{filteredInvoices.length} results</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {[
                                    { key: 'all', label: 'All', count: invoices.length },
                                    { key: 'draft', label: 'Draft', count: invoices.filter(i => i.status === 'draft').length },
                                    { key: 'sent', label: 'Sent', count: invoices.filter(i => i.status === 'sent').length },
                                    { key: 'paid', label: 'Paid', count: invoices.filter(i => i.status === 'paid').length },
                                    { key: 'overdue', label: 'Overdue', count: invoices.filter(i => { const s = i.status as string; return s === 'overdue' || (s !== 'paid' && s !== 'void' && i.due_date && new Date(i.due_date) < new Date()); }).length },
                                    { key: 'partial', label: 'Partial', count: invoices.filter(i => i.status === 'partial').length },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            setStatusFilter(tab.key);
                                            setCurrentPage(1);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                                                ${statusFilter === tab.key
                                                ? 'bg-delaval-blue text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedInvoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-900">{inv.invoice_number}</td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {inv.customers?.name || inv.guest_name || 'One-Time Customer'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{inv.date_issued}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                <div>
                                                    <span>€{inv.total_amount.toFixed(2)}</span>
                                                    {/* Payment progress */}
                                                    <div className="mt-1">
                                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all ${inv.amount_paid && inv.amount_paid >= inv.total_amount ? 'bg-green-500' : inv.amount_paid && inv.amount_paid > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
                                                                style={{ width: `${Math.min(100, ((inv.amount_paid || 0) / inv.total_amount) * 100)}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between mt-0.5">
                                                            <span className="text-[10px] text-green-600 font-medium">€{(inv.amount_paid || 0).toFixed(2)} paid</span>
                                                            {(inv.amount_paid || 0) < inv.total_amount && (
                                                                <span className="text-[10px] text-red-500 font-medium">€{(inv.total_amount - (inv.amount_paid || 0)).toFixed(2)} due</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium uppercase
                                                        ${inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                        inv.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                                                            inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                                'bg-orange-100 text-orange-800'}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {inv.status !== 'paid' && (
                                                        <div className="relative z-10">
                                                            <button
                                                                onClick={() => paymentInvoice?.id === inv.id ? setPaymentInvoice(null) : openPaymentPopup(inv)}
                                                                className={`p-1.5 rounded-md transition-colors ${paymentInvoice?.id === inv.id ? 'text-white bg-green-500' : 'text-green-600 bg-green-50 hover:bg-green-100'} outline-none`}
                                                                title="Record Payment"
                                                            >
                                                                <CreditCard size={16} />
                                                            </button>

                                                            {paymentInvoice?.id === inv.id && (
                                                                <div className="absolute right-0 top-[120%] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-slate-100 p-1.5 z-[100] flex items-center gap-1.5 w-max animate-in fade-in zoom-in-95 duration-200">
                                                                    <button type="button" onClick={() => setPaymentAmount((inv.total_amount - (inv.amount_paid || 0)).toFixed(2))} className="px-3 py-1.5 bg-violet-50 text-violet-600 font-bold rounded-lg text-xs hover:bg-violet-100 transition-colors tracking-wide h-[34px]">FULL</button>
                                                                    <button type="button" onClick={() => setPaymentAmount(((inv.total_amount - (inv.amount_paid || 0)) * 0.5).toFixed(2))} className="px-3 py-1.5 bg-slate-50 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-100 transition-colors tracking-wide h-[34px]">50%</button>
                                                                    <div className="relative flex items-center ml-1">
                                                                        <span className="absolute left-3 text-slate-400 font-bold text-sm">€</span>
                                                                        <input
                                                                            type="number"
                                                                            value={paymentAmount}
                                                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                                                            className="w-[90px] pl-7 pr-1 py-1 border-[2px] border-violet-500 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-violet-100 h-[34px]"
                                                                            step="0.01"
                                                                        />
                                                                    </div>
                                                                    <button onClick={() => handlePaymentSubmit()} className="w-[34px] h-[34px] flex items-center justify-center bg-[#22C55E] text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm ml-1">
                                                                        <Check size={18} strokeWidth={3} />
                                                                    </button>
                                                                    <button onClick={() => setPaymentInvoice(null)} className="w-[34px] h-[34px] flex items-center justify-center bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">
                                                                        <X size={18} strokeWidth={2.5} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => handlePreviewInvoice(inv)}
                                                        className="p-1.5 rounded-md text-delaval-blue bg-blue-50 hover:bg-blue-100 transition-colors"
                                                        title="Preview Invoice"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadInvoice(inv, 'download')}
                                                        className="p-1.5 rounded-md text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                        title="Download Invoice"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendReminder(inv)}
                                                        className="p-1.5 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                                        title="Send Reminder Email"
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(inv)}
                                                        className="p-1.5 rounded-md text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                        title="Edit Invoice"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteInvoiceId(inv.id)}
                                                        className="p-1.5 rounded-md text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                                        title="Delete Invoice"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                                        <FileText size={24} className="text-slate-300" />
                                                    </div>
                                                    <div className="font-bold text-slate-400">No {statusFilter === 'all' ? '' : statusFilter} invoices found</div>
                                                    <div className="text-xs text-slate-300">Try a different filter or create a new invoice</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {/* Pagination Controls */}
                            {filteredInvoices.length > 0 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-slate-500">Rows per page:</span>
                                        <select
                                            className="text-sm border-slate-200 rounded-lg outline-none font-medium text-slate-700 bg-slate-50 px-2 py-1.5 focus:ring-2 focus:ring-delaval-blue/20"
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-sm font-medium text-slate-500">
                                            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* STATEMENTS TAB */}
                {activeTab === 'statements' && (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" /> Statements of Work
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statement #</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Ref</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Value</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {statements.map(stmt => (
                                        <tr key={stmt.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900">{stmt.statement_number}</td>
                                            <td className="px-6 py-4 font-medium text-slate-700">{stmt.customers?.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {new Date(stmt.date_generated).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {stmt.jobs ? `Job #${stmt.jobs.job_number}` : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">€{stmt.total_amount.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handlePreviewStatement(stmt)}
                                                        className="text-slate-400 hover:text-delaval-blue transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                                                        title="Preview Statement"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadStatement(stmt, 'download')}
                                                        className="text-slate-400 hover:text-delaval-blue transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                                                        title="Download Statement"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteStatementId(stmt.id)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                                        title="Delete Statement"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {statements.length === 0 && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No statements found. Generate one from a job.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Pending Jobs - Glassmorphic / Modernized UI */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-white/40 mt-6 bg-gradient-to-br from-[#f8fafc] to-[#e6f0ff] backdrop-blur-md">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-delaval-light-blue rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative p-6 sm:p-8 z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-2">
                                <Clock size={22} className="text-delaval-blue" />
                                Action Required: Pending Jobs
                            </h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">Jobs that have been completed but not yet billed.</p>
                        </div>
                        <div className="px-4 py-2 rounded-full bg-white/60 shadow-sm border border-white flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                {completedJobs.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${completedJobs.length > 0 ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                            </span>
                            <span className="text-sm font-black text-slate-800">{completedJobs.length} To Process</span>
                        </div>
                    </div>

                    {completedJobs.length === 0 ? (
                        <div className="p-10 border-2 border-dashed border-slate-300/50 rounded-xl bg-white/40 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <CheckCircle2 size={32} className="text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">You're all caught up!</h3>
                            <p className="text-slate-500 mt-1">No pending jobs waiting to be invoiced.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {completedJobs.map(job => (
                                <div key={job.id} className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col h-full">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-delaval-blue to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="p-5 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#E6F0FF] text-delaval-blue flex items-center justify-center font-bold text-sm shrink-0">
                                                {job.customers?.name?.substring(0, 2).toUpperCase() || 'NA'}
                                            </div>
                                            <div className="text-xs font-bold text-slate-400 px-2 py-1 bg-slate-100 rounded-md">
                                                #{job.job_number}
                                            </div>
                                        </div>
                                        <div className="font-bold text-slate-900 text-lg mb-1 line-clamp-1" title={job.customers?.name}>{job.customers?.name}</div>
                                        <div className="text-sm font-medium text-slate-500 mb-4 line-clamp-2">{job.service_type}</div>

                                        <div className="mt-auto pt-4 border-t border-slate-100/60 flex items-center justify-between">
                                            <div className="text-xs text-slate-400 font-medium">
                                                {job.date_completed ? new Date(job.date_completed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}
                                            </div>
                                            <Link
                                                to={`/invoices/builder?jobId=${job.id}`}
                                                className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all text-xs font-black text-delaval-blue flex items-center gap-1 hover:text-delaval-dark-blue"
                                            >
                                                Invoice Now &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>



            {/* Edit Invoice Modal */}
            <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Invoice Details">
                <form onSubmit={handleEditSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                            <input
                                className="form-input w-full border border-slate-300 rounded-lg px-4 py-2"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                className="form-input w-full border border-slate-300 rounded-lg px-4 py-2"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <SearchableSelect
                            label="VAT Rate (%)"
                            searchable={false}
                            options={[
                                { value: '23', label: '23%' },
                                { value: '13.5', label: '13.5%' }
                            ]}
                            value={vatRate.toString()}
                            onChange={(val) => setVatRate(parseFloat(val))}
                            icon={<Percent size={16} />}
                        />
                    </div>

                    {/* Line Items Management */}
                    <div className="border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Products / Services</h3>
                            <button
                                type="button"
                                onClick={() => setEditItems([...editItems, { description: '', quantity: 1, unit_price: 0, type: 'service' }])}
                                className="text-xs font-bold text-delaval-blue flex items-center gap-1 hover:underline"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {editItems.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label>
                                        <input
                                            type="text"
                                            list="inventory-products"
                                            placeholder="Select product or type description..."
                                            className="w-full text-xs font-medium bg-transparent border-b border-slate-200 focus:border-delaval-blue outline-none py-1"
                                            value={item.description}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newItems = [...editItems];
                                                const selectedProduct = inventory.find(p => p.name === val);

                                                if (selectedProduct) {
                                                    newItems[idx].description = selectedProduct.name;
                                                    newItems[idx].unit_price = selectedProduct.sell_price;
                                                } else {
                                                    newItems[idx].description = val;
                                                }
                                                setEditItems(newItems);
                                            }}
                                        />
                                        <datalist id="inventory-products">
                                            {inventory.map(prod => (
                                                <option key={prod.name} value={prod.name}>
                                                    {prod.name} (€{prod.sell_price})
                                                </option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="w-16">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Qty</label>
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            className="w-full text-xs font-medium bg-transparent border-b border-slate-200 focus:border-delaval-blue outline-none py-1"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...editItems];
                                                newItems[idx].quantity = parseFloat(e.target.value) || 0;
                                                setEditItems(newItems);
                                            }}
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Price"
                                            className="w-full text-xs font-medium bg-transparent border-b border-slate-200 focus:border-delaval-blue outline-none py-1"
                                            value={item.unit_price}
                                            onChange={(e) => {
                                                const newItems = [...editItems];
                                                newItems[idx].unit_price = Number(e.target.value);
                                                setEditItems(newItems);
                                            }}
                                        />
                                    </div>
                                    <div className="pt-4 px-1">
                                        <button
                                            type="button"
                                            onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                                            className="text-red-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {editItems.length === 0 && (
                                <div className="text-center py-4 text-xs text-slate-400 italic">No items. Click "Add Item" to start.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div className="text-sm font-bold text-slate-600">Total Est.</div>
                        <div className="text-lg font-black text-delaval-blue">
                            €{(editItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * (1 + vatRate / 100)).toFixed(2)}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary px-6">Cancel</button>
                        <button type="submit" className="btn btn-primary px-8 shadow-lg shadow-blue-900/20">Save Changes</button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteInvoiceId}
                onClose={() => setDeleteInvoiceId(null)}
                onConfirm={async () => {
                    if (!deleteInvoiceId) return;
                    const { error } = await dataService.deleteInvoice(deleteInvoiceId);
                    if (!error) {
                        setInvoices(prev => prev.filter(i => i.id !== deleteInvoiceId));
                        showToast('Deleted', 'Invoice has been deleted', 'success');
                        fetchData();
                    } else {
                        showToast('Error', 'Failed to delete invoice. Check permissions.', 'error');
                    }
                    setDeleteInvoiceId(null);
                }}
                title="Delete Invoice"
                message="Are you sure you want to permanently delete this invoice? This action cannot be undone."
            />

            {/* Delete Statement Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteStatementId}
                onClose={() => setDeleteStatementId(null)}
                onConfirm={async () => {
                    if (!deleteStatementId) return;
                    const { error } = await dataService.deleteStatement(deleteStatementId);
                    if (!error) {
                        setStatements(prev => prev.filter(s => s.id !== deleteStatementId));
                        showToast('Deleted', 'Statement has been deleted', 'success');
                        fetchData();
                    } else {
                        showToast('Error', 'Failed to delete statement. Check permissions.', 'error');
                    }
                    setDeleteStatementId(null);
                }}
                title="Delete Statement"
                message="Are you sure you want to permanently delete this statement? This action cannot be undone."
            />
        </div>
    );
};

export default Invoices;
