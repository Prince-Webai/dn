
import React, { useEffect, useState } from 'react';
import { Plus, FileText, Download, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Quote, Customer } from '../types';
import Modal from '../components/Modal';
import { generateQuote } from '../lib/pdfGenerator';
import { useToast } from '../context/ToastContext';

const Quotes = () => {
    const { showToast } = useToast();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
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
            setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('id, name');
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase
                                                ${quote.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button
                                                onClick={() => handleGeneratePDF(quote)}
                                                className="text-slate-400 hover:text-delaval-blue transition-colors"
                                                title="Preview PDF"
                                            >
                                                <FileText size={18} />
                                            </button>
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
                            <input
                                type="date"
                                className="form-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                value={newQuoteData.validUntil}
                                onChange={(e) => setNewQuoteData({ ...newQuoteData, validUntil: e.target.value })}
                                required
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
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500">Line Items</label>
                            <button type="button" onClick={addLineItem} className="text-xs text-delaval-blue font-bold">+ Add Item</button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {newQuoteData.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-6 gap-2">
                                    <input placeholder="Desc" className="col-span-3 text-sm border p-1 rounded" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} required />
                                    <input type="number" placeholder="Qty" className="col-span-1 text-sm border p-1 rounded" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', parseFloat(e.target.value))} required />
                                    <input type="number" placeholder="Price" className="col-span-2 text-sm border p-1 rounded" value={item.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value))} required />
                                </div>
                            ))}
                            {newQuoteData.items.length === 0 && <div className="text-xs text-slate-400 italic">No items added. Click + Add Item.</div>}
                        </div>
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
