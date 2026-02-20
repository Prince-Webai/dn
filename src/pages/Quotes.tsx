
import React, { useEffect, useState } from 'react';
import { Plus, FileText, ArrowRight, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Quote, Customer } from '../types';
import Modal from '../components/Modal';
import { generateQuote } from '../lib/pdfGenerator';
import { useToast } from '../context/ToastContext';
import DatePicker from '../components/DatePicker';

const Quotes = () => {
    const { showToast } = useToast();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);

    // New Quote Form State
    const [newQuoteData, setNewQuoteData] = useState({
        customerId: '',
        description: '',
        validUntil: '',
        items: [] as { description: string; quantity: number; unitPrice: number }[],
        notes: ''
    });

    useEffect(() => {
        fetchQuotes();
        fetchCustomers();
    }, []);

    const fetchQuotes = async () => {
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select('*, customers(*), quote_items(*)')
                .order('created_at', { ascending: false });

            if (error) {
                // If the error is regarding the table not existing, we just show empty
                if (error.code === '42P01') {
                    console.warn('Quotes table does not exist yet.');
                    setQuotes([]);
                    return;
                }
                throw error;
            }
            setQuotes(data || []);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        }
    };

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('*');
        setCustomers(data || []);
    };

    const handleCreateQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // 1. Create Quote Recrod
            const subtotal = newQuoteData.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const vatRate = 13.5;
            const vatAmount = subtotal * (vatRate / 100);
            const totalAmount = subtotal + vatAmount;

            const { data: quoteData, error: quoteError } = await supabase
                .from('quotes')
                .insert([{
                    quote_number: `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                    customer_id: newQuoteData.customerId,
                    description: newQuoteData.description,
                    valid_until: newQuoteData.validUntil,
                    subtotal,
                    vat_amount: vatAmount,
                    total_amount: totalAmount,
                    notes: newQuoteData.notes,
                    status: 'draft'
                }])
                .select()
                .single();

            if (quoteError) throw quoteError;

            // 2. Create Quote Items
            if (newQuoteData.items.length > 0 && quoteData) {
                const itemsToInsert = newQuoteData.items.map(item => ({
                    quote_id: quoteData.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unitPrice
                }));

                const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
                if (itemsError) throw itemsError;
            }

            showToast('Quote Created', 'New quote has been generated successfully.', 'success');
            setIsNewQuoteOpen(false);
            setNewQuoteData({ customerId: '', description: '', validUntil: '', items: [], notes: '' });
            fetchQuotes(); // Refresh list

        } catch (error) {
            console.error('Error creating quote:', error);
            showToast('Error', 'Failed to create quote.', 'error');
        }
    };

    const handleGeneratePDF = (quote: Quote) => {
        if (!quote.customers) return;
        // Map quote_items (if any) to schema expected by generator
        const items = quote.quote_items || [];
        generateQuote(quote, quote.customers, items, 'preview');
    };

    // Helper to add a dummy item for now since UI doesn't have complex item builder yet
    const addLineItem = () => {
        const items = [...newQuoteData.items, { description: '', quantity: 1, unitPrice: 0 }];
        setNewQuoteData({ ...newQuoteData, items });
    };

    const updateLineItem = (index: number, field: string, value: string | number) => {
        const items = [...newQuoteData.items];
        items[index] = { ...items[index], [field]: value };
        setNewQuoteData({ ...newQuoteData, items });
    };

    const removeLineItem = (index: number) => {
        const items = newQuoteData.items.filter((_, i) => i !== index);
        setNewQuoteData({ ...newQuoteData, items });
    };

    const quoteSubtotal = newQuoteData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const quoteVat = quoteSubtotal * 0.135;
    const quoteTotal = quoteSubtotal + quoteVat;

    const convertToInvoice = async (quote: Quote) => {
        try {
            const { error } = await supabase.from('invoices').insert([{
                invoice_number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(3, '0')}`,
                customer_id: quote.customer_id,
                date_issued: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                subtotal: quote.subtotal,
                vat_rate: quote.vat_rate || 13.5,
                vat_amount: quote.vat_amount,
                total_amount: quote.total_amount,
                custom_description: quote.description,
                status: 'sent'
            }]);
            if (error) throw error;
            // Update quote status to accepted
            await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quote.id);
            showToast('Converted!', `Quote ${quote.quote_number} converted to invoice`, 'success');
            fetchQuotes();
        } catch (error) {
            console.error('Error converting quote:', error);
            showToast('Error', 'Failed to convert quote to invoice', 'error');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-amber-100 text-amber-800';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Quotes & Estimates</h1>
                    <p className="text-slate-500">Manage and track customer quotes</p>
                </div>
                <button
                    onClick={() => setIsNewQuoteOpen(true)}
                    className="btn btn-primary shadow-lg shadow-blue-900/20"
                >
                    <Plus size={20} className="mr-2" /> Create Quote
                </button>
            </div>

            <div className="section-card">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">Recent Quotes</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quote No.</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valid Until</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {quotes.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                                        No quotes found. Click "Create Quote" to start.
                                    </td>
                                </tr>
                            ) : (
                                quotes.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{quote.quote_number}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{quote.customers?.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{quote.description}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(quote.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">€{quote.total_amount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusStyle(quote.status)}`}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleGeneratePDF(quote)}
                                                    className="p-1 text-slate-400 hover:text-delaval-blue transition-colors"
                                                    title="Preview PDF"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                {quote.status !== 'accepted' && (
                                                    <button
                                                        onClick={() => convertToInvoice(quote)}
                                                        className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                                                        title="Convert to Invoice"
                                                    >
                                                        <ArrowRight size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Quote Modal */}
            <Modal isOpen={isNewQuoteOpen} onClose={() => setIsNewQuoteOpen(false)} title="Create Quote">
                <form onSubmit={handleCreateQuote} className="space-y-4">
                    <div className="form-group">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Customer *</label>
                        <select
                            className="form-select w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                            value={newQuoteData.customerId}
                            onChange={(e) => setNewQuoteData({ ...newQuoteData, customerId: e.target.value })}
                            required
                        >
                            <option value="">Select customer...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Valid Until *</label>
                            <DatePicker
                                value={newQuoteData.validUntil}
                                onChange={(v) => setNewQuoteData({ ...newQuoteData, validUntil: v })}
                                required
                                placeholder="Select valid until date..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Description *</label>
                            <input
                                type="text"
                                className="form-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                placeholder="e.g. System Upgrade"
                                value={newQuoteData.description}
                                onChange={(e) => setNewQuoteData({ ...newQuoteData, description: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Line Items</label>
                            <button type="button" onClick={addLineItem} className="text-xs text-delaval-blue font-bold hover:underline">+ Add Item</button>
                        </div>
                        <div className="space-y-2 max-h-52 overflow-y-auto">
                            {newQuoteData.items.length === 0 && (
                                <div className="flex flex-col items-center py-6 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                                        <FileText size={20} className="text-slate-300" />
                                    </div>
                                    <div className="text-xs text-slate-400">No items yet. Click "+ Add Item" above.</div>
                                </div>
                            )}
                            {newQuoteData.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg p-2">
                                    <input placeholder="Description" className="col-span-5 text-sm border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} required />
                                    <input type="number" placeholder="Qty" className="col-span-2 text-sm border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)} required />
                                    <input type="number" placeholder="Unit €" className="col-span-3 text-sm border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" value={item.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} required />
                                    <div className="col-span-2 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">€{(item.quantity * item.unitPrice).toFixed(2)}</span>
                                        <button type="button" onClick={() => removeLineItem(idx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {newQuoteData.items.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-right">
                                <div className="text-xs text-slate-500">Subtotal: <span className="font-bold text-slate-700">€{quoteSubtotal.toFixed(2)}</span></div>
                                <div className="text-xs text-slate-500">VAT (13.5%): <span className="font-bold text-slate-700">€{quoteVat.toFixed(2)}</span></div>
                                <div className="text-sm font-bold text-slate-900">Total: €{quoteTotal.toFixed(2)}</div>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
                        <textarea
                            className="form-textarea w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none h-20"
                            placeholder="Additional notes..."
                            value={newQuoteData.notes}
                            onChange={(e) => setNewQuoteData({ ...newQuoteData, notes: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsNewQuoteOpen(false)} className="btn btn-secondary px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="btn btn-primary px-4 py-2 bg-delaval-blue text-white rounded-lg hover:bg-delaval-dark-blue">Create Quote</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Quotes;
