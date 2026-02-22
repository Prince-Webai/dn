import { useEffect, useState } from 'react';
import { Plus, Download, ArrowRight, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Quote } from '../types';
import { generateQuote } from '../lib/pdfGenerator';
import { useToast } from '../context/ToastContext';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

const Quotes = () => {
    const { showToast } = useToast();
    const [quotes, setQuotes] = useState<Quote[]>([]);

    // Modal State
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [activeQuote, setActiveQuote] = useState<Quote | null>(null);

    useEffect(() => {
        fetchQuotes();
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

    const handleGeneratePDF = (quote: Quote) => {
        if (!quote.customers) return;
        const items = quote.quote_items || [];
        const pdfData = generateQuote(quote, quote.customers, items, 'preview');

        if (pdfData) {
            setPreviewUrl(pdfData);
            setActiveQuote(quote);
            setPreviewModalOpen(true);
        }
    };

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

    const handleMarkAsSent = async () => {
        if (!activeQuote) return;
        const { error } = await supabase
            .from('quotes')
            .update({ status: 'pending' })
            .eq('id', activeQuote.id);

        if (!error) {
            showToast('Quote Sent', 'Quote has been marked as pending', 'success');
            fetchQuotes();
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
            <div>
                <h1 className="text-2xl font-bold font-display text-slate-900">Quotes & Estimates</h1>
                <p className="text-slate-500">Manage and track customer quotes</p>
            </div>
            <Link
                to="/documents/new?type=quote"
                className="btn btn-primary shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
                <Plus size={20} /> Create Quote
            </Link>

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
                                                    <Link
                                                        to={`/documents/new?type=quote&id=${quote.id}`}
                                                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Edit Quote"
                                                    >
                                                        <Pencil size={18} />
                                                    </Link>
                                                )}
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

            {activeQuote && activeQuote.customers && (
                <DocumentPreviewModal
                    isOpen={previewModalOpen}
                    onClose={() => setPreviewModalOpen(false)}
                    pdfDataUrl={previewUrl}
                    documentType="Quote"
                    documentNumber={activeQuote.quote_number}
                    customerName={activeQuote.customers.name}
                    customerEmail={activeQuote.customers.email || undefined}
                    amount={`€${activeQuote.total_amount.toLocaleString()}`}
                    onMarkAsSent={activeQuote.status === 'draft' ? handleMarkAsSent : undefined}
                />
            )}
        </div>
    );
};

export default Quotes;
