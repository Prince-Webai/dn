import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Job, JobItem, Customer } from '../types';
import { generateInvoice, generateStatement } from '../lib/pdfGenerator';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Printer, FileText, Activity, Eye, Download } from 'lucide-react';

const InvoiceBuilder = () => {
    const [searchParams] = useSearchParams();
    const jobId = searchParams.get('jobId');
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<Job | null>(null);
    const [jobItems, setJobItems] = useState<JobItem[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);

    const [description, setDescription] = useState('Service');
    const [vatRate, setVatRate] = useState<number>(13.5);

    useEffect(() => {
        if (!jobId) {
            navigate('/invoices');
            return;
        }
        fetchData();
    }, [jobId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: jobData } = await supabase.from('jobs').select('*, customers(*)').eq('id', jobId).single();
            if (jobData) {
                setJob(jobData);
                setCustomer(jobData.customers);
                setDescription(jobData.service_type || 'Service');
            }

            const { data: itemsData } = await supabase.from('job_items').select('*').eq('job_id', jobId);
            if (itemsData) {
                setJobItems(itemsData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        const subtotal = jobItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        return subtotal * (1 + vatRate / 100);
    };

    const getNextNumber = async (table: string, prefix: string) => {
        const column = table === 'invoices' ? 'invoice_number' : 'statement_number';
        const { data } = await supabase
            .from(table)
            .select(column)
            .order('created_at', { ascending: false })
            .limit(1);

        const lastNumber = (data?.[0] as any)?.[column] as string;
        const currentYear = new Date().getFullYear();

        if (lastNumber && lastNumber.includes(`${prefix}-${currentYear}-`)) {
            const sequence = parseInt(lastNumber.split('-').pop() || '0');
            return `${prefix}-${currentYear}-${String(sequence + 1).padStart(3, '0')}`;
        }
        return `${prefix}-${currentYear}-001`;
    };

    const processInvoice = async () => {
        if (!job || !customer) return;
        const total = calculateTotal();
        const nextNumber = await getNextNumber('invoices', 'INV');

        await generateInvoice(nextNumber, customer, jobItems, vatRate, total, 'download', 'sent', job.engineer_name);

        const { error } = await supabase.from('invoices').insert([{
            invoice_number: nextNumber,
            customer_id: job.customer_id,
            job_id: job.id,
            subtotal: total / (1 + vatRate / 100),
            vat_rate: vatRate,
            vat_amount: total - (total / (1 + vatRate / 100)),
            total_amount: total,
            custom_description: description,
            status: 'draft',
            date_issued: new Date().toISOString()
        }]);

        if (!error) {
            showToast('Invoice Created', `Invoice ${nextNumber} saved.`, 'success');
            navigate('/invoices');
        } else {
            console.error(error);
            showToast('Error', 'Failed to save invoice record.', 'error');
        }
    };

    const handlePreviewInvoice = async () => {
        if (!job || !customer) return;
        const total = calculateTotal();
        const pdfData = await generateInvoice('PREVIEW', customer, jobItems, vatRate, total, 'preview', 'DRAFT', job.engineer_name) as any;
        if (pdfData) {
            const newWindow = window.open(pdfData.url, '_blank');
            if (newWindow) newWindow.document.title = pdfData.filename;
        }
    };

    const handlePreviewStatement = async () => {
        if (!job || !customer) return;
        // The signature is (job, items, customer, statement, action)
        const dummyStatement = {
            statement_number: 'PREVIEW',
            total_amount: calculateTotal(),
            date_generated: new Date().toISOString()
        } as any;
        const pdfData = await generateStatement(job, jobItems, customer, dummyStatement, 'preview') as any;
        if (pdfData) {
            const newWindow = window.open(pdfData.url, '_blank');
            if (newWindow) newWindow.document.title = pdfData.filename;
        }
    };

    const processStatement = async () => {
        if (!job || !customer) return;
        const nextNumber = await getNextNumber('statements', 'STMT');

        const stmtDataToSave = {
            statement_number: nextNumber,
            customer_id: job.customer_id,
            job_id: job.id,
            date_generated: new Date().toISOString(),
            total_amount: calculateTotal()
        };

        await generateStatement(job, jobItems, customer, stmtDataToSave as any, 'download');

        const { error } = await supabase.from('statements').insert([stmtDataToSave]);

        if (!error) {
            showToast('Success', `Statement ${nextNumber} saved.`, 'success');
            navigate('/invoices');
        } else {
            console.error(error);
            showToast('Error', 'Failed to save statement record.', 'error');
        }
    };

    if (loading || !job) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <Activity className="animate-spin text-delaval-blue w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-delaval-blue flex items-center gap-2 text-sm font-bold mb-2">
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="text-3xl font-black font-display text-slate-900 tracking-tight">Invoice Builder</h1>
                    <p className="text-slate-500 mt-1">Generate documents for Job #{job.job_number}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Details & Job Items Preview */}
                <div className="space-y-6">
                    <div className="section-card p-6">
                        <h2 className="text-lg font-bold font-display text-slate-900 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-delaval-blue" />
                            Job Overview
                        </h2>
                        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</div>
                                <div className="font-medium text-slate-900">{customer?.name}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Type</div>
                                <div className="font-medium text-slate-900">{job.service_type}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</div>
                                <div className="font-medium text-slate-900">{jobItems.length} lines</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Generation Actions */}
                <div className="space-y-6">
                    {/* Invoice Generation */}
                    <div className="border-2 border-delaval-blue bg-blue-50/10 p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-blue-900/5">
                        <div className="absolute top-0 right-0 bg-delaval-blue text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                            <Printer size={24} />
                        </div>
                        <h3 className="font-black text-slate-900 text-xl font-display">Tax Invoice</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6">Summary summary for official accounting and tax purposes.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Description</label>
                                <input
                                    className="w-full text-sm font-medium border-2 border-slate-200 rounded-xl p-3 focus:border-delaval-blue transition-colors outline-none"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">VAT Rate</label>
                                <select
                                    className="w-full text-sm font-medium border-2 border-slate-200 rounded-xl p-3 focus:border-delaval-blue transition-colors outline-none bg-white"
                                    value={vatRate}
                                    onChange={e => setVatRate(Number(e.target.value))}
                                >
                                    <option value={23}>23% (Goods)</option>
                                    <option value={13.5}>13.5% (Service)</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-3 pt-2">
                                <div className="flex gap-3">
                                    <button
                                        onClick={handlePreviewInvoice}
                                        className="flex-1 py-3 bg-white border-2 border-delaval-blue text-delaval-blue rounded-xl text-sm font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={16} /> Preview
                                    </button>
                                    <button
                                        onClick={processInvoice}
                                        className="flex-1 py-3 bg-white border-2 border-delaval-blue text-delaval-blue rounded-xl text-sm font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={16} /> Download
                                    </button>
                                </div>
                                <button
                                    onClick={processInvoice}
                                    className="w-full py-4 bg-delaval-blue text-white rounded-xl text-md font-black hover:bg-delaval-dark-blue shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Printer size={18} /> Create & Mark as Sent
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Statement Generation */}
                    <div className="section-card p-6 border-2 border-slate-100 bg-white">
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4">
                            <FileText size={24} />
                        </div>
                        <h3 className="font-black text-slate-900 text-xl font-display">Detailed Statement</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6">Line-by-line breakdown of parts and labor for the farmer's records. Does not impact accounting.</p>

                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button
                                    onClick={handlePreviewStatement}
                                    className="flex-1 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Eye size={16} /> Preview
                                </button>
                                <button
                                    onClick={processInvoice}
                                    className="flex-1 py-3 bg-white border-2 border-delaval-blue text-delaval-blue rounded-xl text-sm font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={16} /> Download
                                </button>
                            </div>
                            <button
                                onClick={processInvoice}
                                className="w-full py-4 bg-delaval-blue text-white rounded-xl text-md font-black hover:bg-delaval-dark-blue shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Printer size={18} /> Create & Mark as Sent
                            </button>
                        </div>
                    </div>
                </div>

                {/* Statement Generation */}
                <div className="section-card p-6 border-2 border-slate-100 bg-white">
                    <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4">
                        <FileText size={24} />
                    </div>
                    <h3 className="font-black text-slate-900 text-xl font-display">Detailed Statement</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-6">Line-by-line breakdown of parts and labor for the farmer's records. Does not impact accounting.</p>

                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button
                                onClick={handlePreviewStatement}
                                className="flex-1 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Eye size={16} /> Preview
                            </button>
                            <button
                                onClick={processStatement}
                                className="flex-1 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={16} /> Download
                            </button>
                        </div>
                        <button
                            onClick={processStatement}
                            className="w-full py-4 bg-slate-800 text-white rounded-xl text-md font-black hover:bg-slate-900 shadow-lg shadow-slate-900/10 transition-all active:scale-95"
                        >
                            Save Statement
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div >
    );
};

export default InvoiceBuilder;
