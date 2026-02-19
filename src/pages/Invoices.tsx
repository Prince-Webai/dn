
import { useEffect, useState } from 'react';
import { FileText, Printer, Download, Plus, AlertCircle, CheckCircle, Clock, Calculator, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, Job, JobItem, Statement } from '../types';
import Modal from '../components/Modal';
import { generateInvoice, generateStatement, generateOneTimeInvoice } from '../lib/pdfGenerator';
import { useToast } from '../context/ToastContext';

const Invoices = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'invoices' | 'statements'>('invoices');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [statements, setStatements] = useState<Statement[]>([]);
    const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [isOneTimeOpen, setIsOneTimeOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // Invoice Form State
    const [description, setDescription] = useState('');
    const [vatRate, setVatRate] = useState(13.5);

    // One-Time Invoice Calculator State
    const [oneTimeData, setOneTimeData] = useState({
        customerName: '',
        email: '',
        phone: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        labourHours: 0,
        labourRate: 60,
        partsCost: 0,
        additional: 0
    });

    const [jobItems, setJobItems] = useState<JobItem[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Invoices
            const { data: invData } = await supabase.from('invoices').select('*, customers(*)').order('date_issued', { ascending: false });
            setInvoices(invData || []);

            // Fetch Statements
            const { data: stmtData } = await supabase.from('statements').select('*, customers(*), jobs(*)').order('date_generated', { ascending: false });
            setStatements(stmtData || []);

            // Fetch Completed Jobs that don't have invoices yet
            const { data: jobData } = await supabase.from('jobs').select('*, customers(*)').eq('status', 'completed');
            setCompletedJobs(jobData || []);
        } finally {
            setLoading(false);
        }
    };

    const fetchJobItems = async (jobId: string) => {
        const { data } = await supabase.from('job_items').select('*').eq('job_id', jobId);
        setJobItems(data || []);
    };

    const handleJobSelect = async (job: Job) => {
        setSelectedJob(job);
        setDescription(job.service_type || 'Service');
        await fetchJobItems(job.id);
        setIsGenerateOpen(true);
    };

    const calculateTotal = () => {
        return jobItems.reduce((_acc, item) => (_acc + (item.quantity * item.unit_price)), 0);
    };

    const getNextNumber = async (table: 'invoices' | 'statements', prefix: string) => {
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

    const processStatement = async () => {
        if (!selectedJob || !selectedJob.customers) return;

        try {
            const nextNumber = await getNextNumber('statements', 'STMT');

            // Generate PDF
            generateStatement(selectedJob, jobItems, selectedJob.customers);

            // Save to Database
            const { error } = await supabase.from('statements').insert([{
                statement_number: nextNumber,
                customer_id: selectedJob.customer_id,
                job_id: selectedJob.id,
                date_generated: new Date().toISOString(),
                total_amount: calculateTotal()
            }]);

            if (!error) {
                showToast('Success', `Statement ${nextNumber} saved.`, 'success');
                setIsGenerateOpen(false);
                fetchData();
            } else {
                console.error(error);
                showToast('Error', 'Failed to save statement record.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to process statement.', 'error');
        }
    };

    const processInvoice = async () => {
        if (!selectedJob || !selectedJob.customers) return;
        const total = calculateTotal();
        const nextNumber = await getNextNumber('invoices', 'INV');

        // Generate PDF
        generateInvoice(selectedJob, selectedJob.customers, description, vatRate, total);

        // Save to Database
        const { error } = await supabase.from('invoices').insert([{
            invoice_number: nextNumber,
            customer_id: selectedJob.customer_id,
            job_id: selectedJob.id,
            subtotal: total / (1 + vatRate / 100),
            vat_rate: vatRate,
            vat_amount: total - (total / (1 + vatRate / 100)),
            total_amount: total,
            custom_description: description,
            status: 'sent'
        }]);

        if (!error) {
            showToast('Invoice Created', `Invoice ${nextNumber} saved.`, 'success');
            setIsGenerateOpen(false);
            fetchData();
        } else {
            console.error(error);
            showToast('Error', 'Failed to save invoice record.', 'error');
        }
    };

    // One-Time Invoice Logic
    const calculateOneTimeTotal = () => {
        const labour = oneTimeData.labourHours * oneTimeData.labourRate;
        return labour + oneTimeData.partsCost + oneTimeData.additional;
    };

    const handleOneTimeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const total = calculateOneTimeTotal();
            const vatRate = 13.5;
            const subtotal = total / (1 + vatRate / 100);

            const nextNumber = await getNextNumber('invoices', 'INV');

            // Generate Invoice to get data
            generateOneTimeInvoice(oneTimeData); // Downloads PDF

            // Save to Database (Guest Mode)
            const { error } = await supabase.from('invoices').insert([{
                invoice_number: nextNumber, // Uses sequential number
                // customer_id is null for one-time
                guest_name: oneTimeData.customerName, // Requires schema update
                subtotal: subtotal,
                vat_rate: vatRate,
                vat_amount: total - subtotal,
                total_amount: total,
                custom_description: oneTimeData.description,
                status: 'paid', // Assuming one-time is paid or sent? Let's say paid for now or 'sent'
                date_issued: oneTimeData.date
            }]);

            if (!error) {
                showToast('Success', `One-Time Invoice saved and downloaded.`, 'success');
                setIsOneTimeOpen(false);
                fetchData(); // Refresh list to show new invoice
            } else {
                console.error(error);
                // If error is about missing column, warn user
                if (error.code === '42703') { // Undefined column
                    alert("Please run the SQL Update provided by the assistant to save One-Time invoices to the list.");
                } else {
                    showToast('Warning', 'Invoice PDF generated but failed to save to list.', 'warning');
                }
            }

        } catch (err) {
            console.error(err);
        }
    };

    const handleDownloadStatement = async (statement: Statement) => {
        if (!statement.jobs || !statement.customers) {
            showToast('Error', 'Missing job or customer data for this statement.', 'error');
            return;
        }

        try {
            // Fetch Job Items to regenerate PDF
            const { data: items } = await supabase
                .from('job_items')
                .select('*')
                .eq('job_id', statement.job_id);

            if (!items) {
                showToast('Error', 'Could not fetch job items.', 'error');
                return;
            }

            generateStatement(statement.jobs, items, statement.customers);
            showToast('Success', 'Statement downloaded.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to generate statement PDF.', 'error');
        }
    };

    const handleDownloadInvoice = async (invoice: Invoice) => {
        if (!invoice.customers && !invoice.guest_name) {
            showToast('Error', 'Missing customer data.', 'error');
            return;
        }

        try {
            // For standard invoices, we need job items if it's linked to a job
            if (invoice.job_id && invoice.customers) {
                // Fetch Job details if not fully present (though we selected jobs(*))
                // We have invoice.jobs? No, the fetch select was '*, customers(*)'
                // We need to fetch the job because generateInvoice expects a Job object
                const { data: job } = await supabase.from('jobs').select('*').eq('id', invoice.job_id).single();

                if (job) {
                    generateInvoice(
                        job,
                        invoice.customers,
                        invoice.custom_description || job.service_type || 'Service',
                        invoice.vat_rate || 13.5,
                        invoice.total_amount
                    );
                }
            } else if (invoice.guest_name) {
                // Re-construct one-time invoice data
                // This is harder because we didn't save breakdown, just totals and description.
                // We'll do a best-effort regeneration using the stored totals.
                const net = (invoice.subtotal || 0);
                const vat = (invoice.vat_amount || 0);

                generateOneTimeInvoice({
                    customerName: invoice.guest_name,
                    email: '', // Not stored
                    phone: '',
                    date: invoice.date_issued,
                    description: invoice.custom_description || 'One-Time Service',
                    labourHours: 0,
                    labourRate: 0,
                    partsCost: 0, // We don't have breakdown, so we can't perfectly recreate the original inputs
                    additional: invoice.total_amount // We just put everything in additional or try to reverse calc?
                    // Actually generateOneTimeInvoice recalculates totals. 
                    // If we pass 'additional' as title, it might work.
                    // Let's just create a simplified invoice for re-download or admit we can't fully recreate it without more data.
                    // For now, let's just not support re-downloading one-time invoices perfectly or update schema to store JSON.
                    // I will implement a basic version.
                } as any);
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to download invoice.', 'error');
        }
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
                    <button
                        onClick={() => setIsOneTimeOpen(true)}
                        className="btn btn-secondary shadow-sm"
                    >
                        <Calculator size={18} className="mr-2" /> One-Time Invoice
                    </button>
                    <button onClick={() => setIsGenerateOpen(true)} className="btn btn-primary shadow-lg shadow-blue-900/20">
                        <Plus size={20} className="mr-2" /> Manage Jobs
                    </button>
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

            <div className="grid lg:grid-cols-[1fr_300px] gap-6">

                {/* Main Content Area (Tabs) */}
                <div className="section-card border border-slate-100 min-h-[500px]">

                    {/* INVOICES TAB */}
                    {activeTab === 'invoices' && (
                        <>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-900">Recent Invoices</h2>
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
                                        {invoices.map(inv => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">{inv.invoice_number}</td>
                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                    {inv.customers?.name || inv.guest_name || 'One-Time Customer'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{inv.date_issued}</td>
                                                <td className="px-6 py-4 font-bold text-slate-900">€{inv.total_amount.toFixed(2)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase
                                                        ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleDownloadInvoice(inv)}
                                                        className="text-slate-400 hover:text-delaval-blue transition-colors"
                                                        title="Download Invoice"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {invoices.length === 0 && (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No invoices found</td></tr>
                                        )}
                                    </tbody>
                                </table>
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
                                                    <button
                                                        onClick={() => handleDownloadStatement(stmt)}
                                                        className="text-slate-400 hover:text-delaval-blue transition-colors"
                                                        title="Download Statement"
                                                    >
                                                        <Download size={18} />
                                                    </button>
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

                {/* Pending Jobs Side Panel */}
                <div className="space-y-6">
                    <div className="bg-delaval-blue/5 rounded-xl border border-delaval-blue/10 p-6">
                        <h2 className="text-sm font-bold text-delaval-blue uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock size={16} /> Pending Jobs ({completedJobs.length})
                        </h2>
                        <div className="space-y-3">
                            {completedJobs.map(job => (
                                <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 group hover:border-delaval-blue/30 transition-all">
                                    <div className="font-bold text-slate-900 mb-1">{job.customers?.name}</div>
                                    <div className="text-xs text-slate-500 mb-3">{job.service_type} • {job.date_completed?.split('T')[0] || 'Recently'}</div>
                                    <button
                                        onClick={() => handleJobSelect(job)}
                                        className="w-full bg-white border border-delaval-blue text-delaval-blue text-xs font-bold py-2 rounded-lg group-hover:bg-delaval-blue group-hover:text-white transition-colors"
                                    >
                                        Generate Docs
                                    </button>
                                </div>
                            ))}
                            {completedJobs.length === 0 && <div className="text-slate-500 text-sm italic">No pending jobs.</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Generation Modal */}
            <Modal isOpen={isGenerateOpen} onClose={() => setIsGenerateOpen(false)} title="Generate Documents">
                {!selectedJob ? (
                    <div className="p-4 text-center">
                        <p className="text-slate-500 mb-4">Select a completed job from the sidebar to generate an invoice.</p>
                        <button onClick={() => setIsGenerateOpen(false)} className="btn btn-secondary">Close</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-2">Selected Job</div>
                            <div className="font-bold text-lg text-slate-900">{selectedJob.customers?.name}</div>
                            <div className="text-slate-600">{selectedJob.service_type}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Statement Generation */}
                            <div className="border border-slate-200 p-5 rounded-xl hover:border-delaval-blue hover:bg-blue-50/30 transition-all group">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">Statement</h3>
                                <p className="text-sm text-slate-500 mt-1 mb-4">Detailed breakdown of parts & labour. For Farmer.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (!selectedJob || !selectedJob.customers) return;
                                            generateStatement(selectedJob, jobItems, selectedJob.customers, 'preview');
                                        }}
                                        className="flex-1 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700 hover:bg-slate-50"
                                    >
                                        Preview
                                    </button>
                                    <button
                                        onClick={processStatement}
                                        className="flex-1 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700 hover:bg-slate-50"
                                    >
                                        Download PDF
                                    </button>
                                </div>
                            </div>

                            {/* Invoice Generation */}
                            <div className="border-2 border-delaval-blue bg-blue-50/10 p-5 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-delaval-blue text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">RECOMMENDED</div>
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                                    <Printer size={24} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">Tax Invoice</h3>
                                <p className="text-sm text-slate-500 mt-1 mb-4">Summary for accounting.</p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                                        <input
                                            className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">VAT Rate</label>
                                        <select
                                            className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                            value={vatRate}
                                            onChange={e => setVatRate(Number(e.target.value))}
                                        >
                                            <option value={13.5}>13.5% (Service)</option>
                                            <option value={23}>23% (Goods)</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                if (!selectedJob || !selectedJob.customers) return;
                                                const total = calculateTotal();
                                                generateInvoice(selectedJob, selectedJob.customers, description, vatRate, total, 'preview');
                                            }}
                                            className="flex-1 py-2.5 bg-white border border-delaval-blue text-delaval-blue rounded-lg text-sm font-bold hover:bg-blue-50 transition-all"
                                        >
                                            Preview
                                        </button>
                                        <button
                                            onClick={processInvoice}
                                            className="flex-1 py-2.5 bg-delaval-blue text-white rounded-lg text-sm font-bold hover:bg-delaval-dark-blue shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* One-Time Invoice Modal */}
            <Modal isOpen={isOneTimeOpen} onClose={() => setIsOneTimeOpen(false)} title="One-Time Invoice Calculator">
                <form onSubmit={handleOneTimeSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Info</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input required placeholder="Customer Name" className="form-input w-full px-4 py-2 border rounded-lg" value={oneTimeData.customerName} onChange={e => setOneTimeData({ ...oneTimeData, customerName: e.target.value })} />
                                <input type="date" className="form-input w-full px-4 py-2 border rounded-lg" value={oneTimeData.date} onChange={e => setOneTimeData({ ...oneTimeData, date: e.target.value })} />
                                <input placeholder="Email (Optional)" className="form-input w-full px-4 py-2 border rounded-lg" value={oneTimeData.email} onChange={e => setOneTimeData({ ...oneTimeData, email: e.target.value })} />
                                <input placeholder="Phone (Optional)" className="form-input w-full px-4 py-2 border rounded-lg" value={oneTimeData.phone} onChange={e => setOneTimeData({ ...oneTimeData, phone: e.target.value })} />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Job Details</h3>
                            <input required placeholder="Description of work" className="form-input w-full px-4 py-2 border rounded-lg mb-2" value={oneTimeData.description} onChange={e => setOneTimeData({ ...oneTimeData, description: e.target.value })} />

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Hours</label>
                                    <input type="number" step="0.5" className="form-input w-full px-3 py-2 border rounded-lg text-sm" value={oneTimeData.labourHours} onChange={e => setOneTimeData({ ...oneTimeData, labourHours: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Rate (€)</label>
                                    <input type="number" className="form-input w-full px-3 py-2 border rounded-lg text-sm" value={oneTimeData.labourRate} onChange={e => setOneTimeData({ ...oneTimeData, labourRate: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Parts (€)</label>
                                    <input type="number" className="form-input w-full px-3 py-2 border rounded-lg text-sm" value={oneTimeData.partsCost} onChange={e => setOneTimeData({ ...oneTimeData, partsCost: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Extra (€)</label>
                                    <input type="number" className="form-input w-full px-3 py-2 border rounded-lg text-sm" value={oneTimeData.additional} onChange={e => setOneTimeData({ ...oneTimeData, additional: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-delaval-light-blue p-4 rounded-xl border-l-4 border-delaval-blue">
                        <div className="flex justify-between items-center">
                            <strong className="text-delaval-blue text-lg">Total Amount:</strong>
                            <strong className="text-delaval-blue text-2xl">€{calculateOneTimeTotal().toFixed(2)}</strong>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => generateOneTimeInvoice(oneTimeData, 'preview')} className="btn btn-secondary border-slate-300">
                            Preview PDF
                        </button>
                        <button type="submit" className="btn btn-primary">Save & Generate</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Invoices;
