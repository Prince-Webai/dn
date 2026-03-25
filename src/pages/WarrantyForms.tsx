import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ClipboardCheck, Eye, Loader2, Plus, ShieldCheck, Save, FileText, CheckCircle2, Download } from 'lucide-react';
import { Customer, Job, WarrantyReport } from '../types';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../context/ToastContext';
import { generateWarrantyReport } from '../lib/pdfGenerator';
import logoImg from '../assets/logo_v2.png';


const WarrantyForms: React.FC = () => {
    const { showToast } = useToast();
    const [reports, setReports] = useState<WarrantyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState<WarrantyReport | null>(null);
    
    // Selection states for new report
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedFormType, setSelectedFormType] = useState<'Installation Certificate' | 'Commissioning Certificate'>('Installation Certificate');
    const [isCreating, setIsCreating] = useState(false);

    // Form Data States
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        fetchReports();
        fetchInitialData();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('warranty_reports')
            .select('*, customers(name), jobs(job_number)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setReports(data as any);
        }
        setLoading(false);
    };

    const fetchInitialData = async () => {
        const [customersRes, jobsRes] = await Promise.all([
            supabase.from('customers').select('*').order('name'),
            supabase.from('jobs').select('*, customers(name)').order('job_number', { ascending: false })
        ]);

        if (customersRes.data) setCustomers(customersRes.data);
        if (jobsRes.data) setJobs(jobsRes.data);
    };

    const handleStartForm = () => {
        const customer = customers.find(c => c.id === selectedCustomerId);
        
        // Initialize form data based on type and customer
        if (selectedFormType === 'Installation Certificate') {
            setFormData({
                installer_name: 'Tony Condon',
                equipment_type: '',
                client_info: `${customer?.name || ''}\n${customer?.address || ''}`,
                installer_address: 'Condon Dairy Services, Clonegogaile, Ballinamult',
                install_date: new Date().toISOString().split('T')[0],
                etci_cert: 'NO',
                supp_ag_cert: 'NO'
            });
        } else {
            setFormData({
                serial_no: '',
                client_name: customer?.name || '',
                install_address: customer?.address || '',
                equipment_details: '',
                declaration_name: 'Tony Condon',
                install_date: new Date().toISOString().split('T')[0],
                test_date: new Date().toISOString().split('T')[0],
                install_company: 'Condon Dairy Agri Services Ltd',
                install_company_address: 'Clonegogaile, Ballinamult, via Clonmel, Co. Waterford'
            });
        }
        
        setIsStartModalOpen(false);
        setIsCreating(true);
    };

    const handleSaveReport = async () => {
        if (!selectedCustomerId || !selectedFormType) return;

        try {
            // Check authentication OR developer bypass
            const { data: { session } } = await supabase.auth.getSession();
            const isDevBypass = localStorage.getItem('dev_bypass') === 'true';
            
            if (!session && !isDevBypass) {
                showToast('Authentication required: Please log in to save.', 'error');
                return;
            }

            const reportPayload = {
                customer_id: selectedCustomerId,
                job_id: selectedJobId || null,
                form_type: selectedFormType,
                machine_model: formData.equipment_type || formData.equipment_details || '',
                serial_number: formData.serial_no || '',
                install_date: formData.install_date,
                technician_name: formData.installer_name || formData.declaration_name || 'Tony Condon',
                report_data: formData
            };

            const { error } = await supabase
                .from('warranty_reports')
                .insert([reportPayload]);

            if (error) {
                if (error.code === '42501') {
                    throw new Error('Database Permission Error: Please ensure you have run the provided fix_reports_schema.sql script in your Supabase SQL editor.');
                }
                throw error;
            }

            showToast('Warranty report saved successfully!', 'success');
            setIsCreating(false);
            fetchReports();
            
            // Reset
            setSelectedCustomerId('');
            setSelectedJobId('');
            setFormData({});
        } catch (err: any) {
            showToast(err.message || 'Error saving report', 'error');
        }
    };

    const renderDynamicForm = () => {
        const isInstallCert = selectedFormType === 'Installation Certificate';
        
        return (
            <div className="bg-white w-full max-w-[210mm] print:shadow-none relative rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200 transition-all duration-300 print:transform-none print:block print:static"
                 style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: '9pt', color: '#000', minHeight: '297mm' }}>
                
                {/* Certificate Header */}
                <div style={{ borderBottom: '3px solid #003875', padding: '20px 30px 15px', background: '#f0f4ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '18pt', fontWeight: 900, color: '#003875', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                                {isInstallCert ? 'Installation Certificate' : 'Installation & Commissioning'}
                            </div>
                            <div style={{ fontSize: '8pt', color: '#555', marginTop: 2, fontWeight: 700, letterSpacing: '1px' }}>
                                OFFICIAL DIGITAL RECORD • CONDON DAIRY SERVICES
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <img src={logoImg} alt="DeLaval" style={{ height: 40, marginBottom: 4 }} />
                            <div style={{ fontWeight: 700, fontSize: '10pt', color: '#003875' }}>Tony Condon Services</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '25px 30px' }}>
                    {/* Header Info Section */}
                    <div style={{ background: '#003875', color: 'white', fontWeight: 700, fontSize: '8.5pt', padding: '4px 10px', marginBottom: 12, textTransform: 'uppercase' }}>
                        Client Information
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 15, marginBottom: 20 }}>
                        <div className="space-y-4">
                            <div>
                                <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Name & Address of Client</label>
                                <textarea 
                                    className="w-full bg-slate-50/50 border-0 border-b border-slate-300 focus:border-delaval-blue focus:ring-0 text-xs font-black p-2 min-h-[60px] resize-none transition-colors"
                                    value={isInstallCert ? formData.client_info : formData.client_name + '\n' + formData.install_address} 
                                    onChange={e => isInstallCert ? setFormData({...formData, client_info: e.target.value}) : setFormData({...formData, client_name: e.target.value})}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Serial Number</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent border-0 border-b border-slate-300 focus:border-delaval-blue focus:ring-0 text-xs font-black p-0 py-1"
                                    placeholder="REQUIRED"
                                    value={formData.serial_no || ''} 
                                    onChange={e => setFormData({...formData, serial_no: e.target.value})}
                                />
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Date of Installation</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-transparent border-0 border-b border-slate-300 focus:border-delaval-blue focus:ring-0 text-xs font-black p-0 py-1"
                                    value={formData.install_date} 
                                    onChange={e => setFormData({...formData, install_date: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {isInstallCert ? (
                        <>
                            <div style={{ background: '#003875', color: 'white', fontWeight: 700, fontSize: '8.5pt', padding: '4px 10px', marginBottom: 12, textTransform: 'uppercase' }}>
                                Equipment Specifications
                            </div>
                            <div className="space-y-6 mb-8">
                                <div>
                                    <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Type of Milking Parlour / Equipment (Make & Model)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent border-0 border-b-2 border-slate-100 focus:border-delaval-blue focus:ring-0 text-base font-bold text-slate-800 p-0 pb-2 transition-all"
                                        placeholder="Specify make and model..."
                                        value={formData.equipment_type} 
                                        onChange={e => setFormData({...formData, equipment_type: e.target.value})}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div style={{ padding: 15, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: '7.5pt', fontWeight: 900, color: '#334155', textTransform: 'uppercase' }}>ETCI Cert Done</span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {['YES', 'NO'].map(opt => (
                                                    <button 
                                                        key={opt}
                                                        onClick={() => setFormData({...formData, etci_cert: opt})}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${formData.etci_cert === opt ? 'bg-delaval-blue text-white shadow-lg shadow-blue-900/20 scale-105' : 'bg-white text-slate-400 border border-slate-200'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '7pt', color: '#64748b', fontStyle: 'italic' }}>Electrical Test Certificate for installation</p>
                                    </div>
                                    <div style={{ padding: 15, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: '7.5pt', fontWeight: 900, color: '#334155', textTransform: 'uppercase' }}>Supp. Ag Cert</span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {['YES', 'NO'].map(opt => (
                                                    <button 
                                                        key={opt}
                                                        onClick={() => setFormData({...formData, supp_ag_cert: opt})}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${formData.supp_ag_cert === opt ? 'bg-delaval-blue text-white shadow-lg shadow-blue-900/20 scale-105' : 'bg-white text-slate-400 border border-slate-200'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '7pt', color: '#64748b', fontStyle: 'italic' }}>Supplementary Ag Certificate for grants</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: '#003875', color: 'white', fontWeight: 700, fontSize: '8.5pt', padding: '4px 10px', marginBottom: 12, textTransform: 'uppercase' }}>
                                Installer Affirmation
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Trained Installer Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent border-0 border-b-2 border-slate-100 focus:border-delaval-blue focus:ring-0 text-sm font-bold p-0 pb-2"
                                        value={formData.installer_name} 
                                        onChange={e => setFormData({...formData, installer_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Installers Address</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent border-0 border-b-2 border-slate-100 focus:border-delaval-blue focus:ring-0 text-sm font-bold p-0 pb-2"
                                        value={formData.installer_address} 
                                        onChange={e => setFormData({...formData, installer_address: e.target.value})}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ background: '#003875', color: 'white', fontWeight: 700, fontSize: '8.5pt', padding: '4px 10px', marginBottom: 12, textTransform: 'uppercase' }}>
                                Testing & Commissioning Details
                            </div>
                            <div className="space-y-6 mb-8">
                                <div>
                                    <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Details of Equipment Installed (Make & Model)</label>
                                    <textarea 
                                        className="w-full bg-transparent border-0 border-b-2 border-slate-100 focus:border-delaval-blue focus:ring-0 text-base font-bold text-slate-800 p-0 pb-2 transition-all min-h-[80px] resize-none"
                                        placeholder="Provide full technical details..."
                                        value={formData.equipment_details} 
                                        onChange={e => setFormData({...formData, equipment_details: e.target.value})}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Date of Testing</label>
                                        <input 
                                            type="date" 
                                            className="w-full bg-transparent border-0 border-b-2 border-slate-100 focus:border-delaval-blue focus:ring-0 text-sm font-bold p-0 pb-2"
                                            value={formData.test_date} 
                                            onChange={e => setFormData({...formData, test_date: e.target.value})}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '8pt', color: '#64748b', fontStyle: 'italic', background: '#f0f9ff', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid #003875' }}>
                                        I confirm equipment matches DeLaval standards for commissioning.
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', borderLeft: '4px solid #003875', marginBottom: 30 }}>
                                <div style={{ fontSize: '7pt', fontWeight: 900, color: '#003875', textTransform: 'uppercase', marginBottom: 8 }}>Official Declaration</div>
                                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                                    I <span className="underline decoration-blue-200 underline-offset-4 decoration-2 font-black">{formData.declaration_name}</span> working on behalf of <span className="font-black text-delaval-blue">{formData.install_company}</span> confirm the above equipment is installed matching DeLaval Standards.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 15 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Person</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-transparent border-0 border-b border-blue-200 focus:border-delaval-blue focus:ring-0 text-xs font-black p-0 py-1"
                                            value={formData.declaration_name} 
                                            onChange={e => setFormData({...formData, declaration_name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Company</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-transparent border-0 border-b border-blue-200 focus:border-delaval-blue focus:ring-0 text-xs font-black p-0 py-1"
                                            value={formData.install_company} 
                                            onChange={e => setFormData({...formData, install_company: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Signature Area */}
                    <div style={{ borderTop: '2px solid #003875', paddingTop: 20, marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                        <div style={{ fontSize: '8pt' }}>
                            <div style={{ height: 60, borderBottom: '1px solid #000', marginBottom: 5, position: 'relative' }}>
                                <div style={{ position: 'absolute', bottom: 5, right: 0, fontSize: '6pt', color: '#ccc', fontWeight: 900 }}>DIGITAL SIGNATURE</div>
                            </div>
                            <div style={{ fontWeight: 800, color: '#003875', textTransform: 'uppercase', fontSize: '7pt' }}>Authorized Signature</div>
                            <div style={{ color: '#666', fontSize: '6.5pt' }}>INSTALLER REPRESENTATIVE</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                            <img src={logoImg} alt="" style={{ height: 20, opacity: 0.3, marginBottom: 10 }} />
                            <div style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700, letterSpacing: '1px' }}>CDS OFFICIAL STAMP</div>
                            <div style={{ width: 80, height: 40, border: '1px solid #e2e8f0', borderRadius: 4, marginTop: 4 }}></div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ borderTop: '1px solid #eee', marginTop: 30, paddingTop: 10, fontSize: '7pt', color: '#94a3b8', textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>
                        ISO 9001 CERTIFIED • DELAVAL OFFICIAL PARTNER • CONDON DAIRY SERVICES LTD.
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-black font-display text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-delaval-blue text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <ShieldCheck size={22} className="md:w-6 md:h-6" />
                        </div>
                        Warranty Forms
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Digital machine warranty & commissioning logs</p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                        onClick={() => setIsStartModalOpen(true)}
                        className="flex items-center gap-2 bg-delaval-blue hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={18} /> New Warranty Form
                    </button>
                </div>
            </motion.div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-delaval-blue animate-spin" />
                </div>
            ) : reports.length === 0 ? (
                <div className="section-card p-16 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardCheck className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No warranty forms yet</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto">
                        Digital warranty forms can be created for any customer or specific job to ensure machine coverage.
                    </p>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="section-card overflow-hidden shadow-2xl shadow-slate-200/50 border-slate-200"
                >
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-50/50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Equipment</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                                            {new Date(report.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black text-slate-900 whitespace-nowrap">{report.customers?.name || '---'}</div>
                                            {report.jobs && <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Job #{report.jobs.job_number}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${report.form_type.includes('Commissioning') ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-delaval-blue'}`}>
                                                {report.form_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700 font-medium truncate max-w-[200px]">{report.machine_model || '---'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">S/N: {report.serial_number || '---'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const cust = customers.find(c => c.id === report.customer_id);
                                                        generateWarrantyReport(report, cust || { name: report.customers?.name || 'Customer' } as any, 'download');
                                                    }}
                                                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                                                    title="Download PDF"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const cust = customers.find(c => c.id === report.customer_id);
                                                        generateWarrantyReport(report, cust || { name: report.customers?.name || 'Customer' } as any, 'preview');
                                                    }}
                                                    className="inline-flex items-center gap-2 bg-white border border-slate-200 text-delaval-blue shadow-sm hover:shadow-md hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 whitespace-nowrap"
                                                >
                                                    <Eye size={16} />
                                                    View PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Start Modal */}
            <Modal
                isOpen={isStartModalOpen}
                onClose={() => setIsStartModalOpen(false)}
                title="Create Digital Report"
                overflowVisible
            >
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Customer</label>
                        <SearchableSelect
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            value={selectedCustomerId}
                            onChange={setSelectedCustomerId}
                            placeholder="Select Customer..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Form Type</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { id: 'Installation Certificate', label: 'Installation Certificate (Mech/Elec)', desc: 'Full DeLaval installation certification' },
                                { id: 'Commissioning Certificate', label: 'Installation & Commissioning Form', desc: 'Milking equipment testing & sign-off' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedFormType(type.id as any)}
                                    className={`text-left p-3 rounded-xl border-2 transition-all ${selectedFormType === type.id ? 'border-delaval-blue bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="font-bold text-sm text-slate-900">{type.label}</div>
                                    <div className="text-xs text-slate-500">{type.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Associate with Job (Optional)</label>
                        <SearchableSelect
                            options={jobs.filter(j => j.customer_id === selectedCustomerId).map(j => ({ value: j.id, label: `Job #${j.job_number}` }))}
                            value={selectedJobId}
                            onChange={setSelectedJobId}
                            placeholder="Independent Report"
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button onClick={() => setIsStartModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                        <button
                            onClick={handleStartForm}
                            disabled={!selectedCustomerId || !selectedFormType}
                            className="px-6 py-2 bg-delaval-blue text-white font-bold rounded-lg shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-50"
                        >
                            Open Digital Form
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Form Creator Overlay */}
            {isCreating && createPortal(
                <AnimatePresence mode="wait">
                    <motion.div 
                        id="portal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ 
                            position: 'fixed', 
                            top: '0px', 
                            left: '0px', 
                            right: '0px', 
                            bottom: '0px', 
                            zIndex: 999999,
                            backgroundColor: 'rgba(241, 245, 249, 0.95)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            overflowY: 'auto',
                            padding: '0px',
                            margin: '0px'
                        }}
                    >
                        <div className="w-full flex flex-col items-center min-h-full pb-12 print:pb-0">
                            {/* Actions Toolbar */}
                            <div className="print:hidden"
                                style={{ 
                                    position: 'sticky', 
                                    top: 0, 
                                    width: '100%', 
                                    maxWidth: '21cm', 
                                    zIndex: 10,
                                    borderRadius: '0 0 16px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderTop: 'none',
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingLeft: '1.5rem',
                                    paddingRight: '1.5rem',
                                    paddingTop: '1rem',
                                    paddingBottom: '1rem',
                                    marginBottom: '3rem'
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-delaval-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm md:text-base font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">
                                            {selectedFormType}
                                        </h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Document Editor (Draft)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={async () => {
                                            const cust = customers.find(c => c.id === selectedCustomerId);
                                            // Mock a report object from current form data
                                            const mockReport: any = {
                                                form_type: selectedFormType,
                                                serial_number: formData.serial_no || 'TBD',
                                                install_date: formData.install_date || new Date().toISOString(),
                                                report_data: { ...formData }
                                            };
                                            await generateWarrantyReport(mockReport, cust || { name: 'Customer' } as any);
                                        }} 
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <Download size={16} /> Download PDF
                                    </button>
                                    <button 
                                        onClick={() => setIsCreating(false)} 
                                        className="px-4 py-2 text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button 
                                        onClick={handleSaveReport}
                                        className="px-6 py-2.5 bg-delaval-blue hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        <Save size={16} /> Finalize & Save
                                    </button>
                                </div>
                            </div>
                            
                            {/* The Document */}
                            {renderDynamicForm()}
                            
                            <style>{`
                                @media print {
                                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                                    #portal-overlay { background: white !important; padding: 0 !important; }
                                    .print\\:hidden { display: none !important; }
                                    .print\\:transform-none { transform: none !important; }
                                    .print\\:block { display: block !important; }
                                    .print\\:static { position: static !important; }
                                }
                            `}</style>

                            {/* Mobile Warning */}
                            <div className="mt-8 text-center md:hidden pb-12 print:hidden">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">A4 Scale Preview • Best viewed on Desktop</p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* View Details Modal Overlay */}
            {viewingReport && createPortal(
                <AnimatePresence mode="wait">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ 
                            position: 'fixed', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            zIndex: 99999,
                            backgroundColor: 'rgba(241, 245, 249, 0.95)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            overflowY: 'auto',
                            padding: 0
                        }}
                    >
                        <div className="w-full flex flex-col items-center min-h-full pb-12 !mt-0 !pt-0">
                            {/* View Toolbar */}
                            <div className="!mt-0 !pt-0 !rounded-none"
                                style={{ 
                                    position: 'sticky', 
                                    top: 0, 
                                    width: '100%', 
                                    maxWidth: '21cm', 
                                    zIndex: 10,
                                    borderRadius: '0 0 16px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderTop: 'none',
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingLeft: '1.5rem',
                                    paddingRight: '1.5rem',
                                    paddingTop: '0.5rem',
                                    paddingBottom: '0.5rem',
                                    marginBottom: '0'
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-delaval-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                                        <Eye size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm md:text-base font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">
                                            {viewingReport.form_type}
                                        </h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Document Viewer</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={async () => {
                                            const cust = customers.find(c => c.id === viewingReport.customer_id);
                                            generateWarrantyReport(viewingReport, cust || { name: viewingReport.customers?.name || 'Customer' } as any);
                                        }}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                                    >
                                        <Download size={16} /> Download PDF
                                    </button>
                                    <button 
                                        onClick={() => setViewingReport(null)} 
                                        className="px-6 py-2.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl active:scale-95 transition-all"
                                    >
                                        Close Viewer
                                    </button>
                                </div>
                            </div>

                            {/* Reuse form renderer for viewing if possible, or simple details */}
                            <div className="w-full max-w-[21cm] space-y-6">
                                <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Customer</div>
                                        <div className="text-sm font-bold text-slate-800">{viewingReport.customers?.name}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Technician</div>
                                        <div className="text-sm font-bold text-slate-800">{viewingReport.technician_name}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Submission Date</div>
                                        <div className="text-sm font-bold text-slate-800">{new Date(viewingReport.created_at).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Install Date</div>
                                        <div className="text-sm font-bold text-slate-800">{viewingReport.install_date}</div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-4">
                                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 className="text-green-500" size={18} />
                                        Data Points Captured
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(viewingReport.report_data || {}).map(([key, value]) => (
                                            <div key={key} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                                                    {key.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-sm font-bold text-slate-700 break-words">
                                                    {String(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default WarrantyForms;
