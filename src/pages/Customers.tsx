
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, ArrowLeft, Package, Briefcase, Euro, Upload, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';

const Customers = () => {
    const { showToast } = useToast();
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [activeTab, setActiveTab] = useState('service-history');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        address: '',
        contact_person: '',
        email: '',
        phone: '',
        payment_terms: 'Net 30'
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk delete state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [importing, setImporting] = useState(false);

    const handleDeleteClick = () => {
        if (selectedCustomer) {
            setDeleteId(selectedCustomer.id);
            setIsDeleteModalOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const { error } = await dataService.deleteCustomer(deleteId);
            if (!error) {
                setCustomers(customers.filter(c => c.id !== deleteId));
                setSelectedCustomer(null);
                setIsDeleteModalOpen(false);
                setDeleteId(null);
            } else {
                alert('Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Failed to delete customer');
        } finally {
            setIsDeleting(false);
        }
    };

    // Toggle bulk select
    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filteredCustomers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
        }
    };

    const confirmBulkDelete = async () => {
        setIsDeleting(true);
        try {
            for (const id of selectedIds) {
                await dataService.deleteCustomer(id);
            }
            setCustomers(customers.filter(c => !selectedIds.has(c.id)));
            showToast('Deleted', `${selectedIds.size} customer(s) deleted`, 'success');
            setSelectedIds(new Set());
            setIsBulkDeleteOpen(false);
        } catch (error) {
            console.error('Error bulk deleting:', error);
            showToast('Error', 'Failed to delete some customers', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // CSV Import
    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                showToast('Error', 'CSV must have a header row and at least one data row', 'error');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('company') || h.includes('farm'));
            const emailIdx = headers.findIndex(h => h.includes('email'));
            const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel'));
            const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('location'));
            const contactIdx = headers.findIndex(h => h.includes('contact'));

            if (nameIdx === -1) {
                showToast('Error', 'CSV must have a "Name" column', 'error');
                return;
            }

            const newCustomers = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (!cols[nameIdx]) continue;
                newCustomers.push({
                    name: cols[nameIdx],
                    email: emailIdx >= 0 ? cols[emailIdx] || '' : '',
                    phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
                    address: addressIdx >= 0 ? cols[addressIdx] || '' : '',
                    contact_person: contactIdx >= 0 ? cols[contactIdx] || '' : '',
                    payment_terms: 'Net 30'
                });
            }

            if (newCustomers.length === 0) {
                showToast('Error', 'No valid customers found in CSV', 'error');
                return;
            }

            const { error } = await supabase.from('customers').insert(newCustomers);
            if (error) throw error;

            showToast('Imported!', `${newCustomers.length} customer(s) imported from CSV`, 'success');
            fetchCustomers();
        } catch (error) {
            console.error('CSV import error:', error);
            showToast('Error', 'Failed to import CSV', 'error');
        } finally {
            setImporting(false);
            if (csvInputRef.current) csvInputRef.current.value = '';
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const data = await dataService.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('customers')
                    .update(newCustomer)
                    .eq('id', editingId);

                if (error) throw error;

                const updatedCustomers = customers.map(c => c.id === editingId ? { ...c, ...newCustomer } : c);
                setCustomers(updatedCustomers);
                // Also update selectedCustomer if it's the one being edited
                if (selectedCustomer && selectedCustomer.id === editingId) {
                    setSelectedCustomer({ ...selectedCustomer, ...newCustomer });
                }
            } else {
                // Create
                const { data, error } = await supabase.from('customers').insert([newCustomer]).select();
                if (error) throw error;
                if (data) {
                    setCustomers([...customers, data[0]]);
                }
            }
            setIsModalOpen(false);
            setEditingId(null);
            setNewCustomer({ name: '', address: '', contact_person: '', email: '', phone: '', payment_terms: 'Net 30' });
        } catch (error: any) {
            console.error('Error saving customer:', error);
            alert(`Failed to save customer: ${error.message || JSON.stringify(error)}`);
        }
    };

    const handleEditClick = () => {
        if (!selectedCustomer) return;
        setNewCustomer({
            name: selectedCustomer.name,
            address: selectedCustomer.address || '',
            contact_person: selectedCustomer.contact_person || '',
            email: selectedCustomer.email || '',
            phone: selectedCustomer.phone || '',
            payment_terms: selectedCustomer.payment_terms
        });
        setEditingId(selectedCustomer.id);
        setIsModalOpen(true);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [customerJobs, setCustomerJobs] = useState<any[]>([]);
    const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
    const [customerQuotes, setCustomerQuotes] = useState<any[]>([]);
    const [customerStatements, setCustomerStatements] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalJobs: 0,
        totalRevenue: 0,
        partsPurchased: 0
    });

    useEffect(() => {
        if (selectedCustomer) {
            fetchCustomerDetails(selectedCustomer.id);
        }
    }, [selectedCustomer]);

    const fetchCustomerDetails = async (customerId: string) => {
        try {
            const [jobsRes, invoicesRes, quotesRes, statementsRes] = await Promise.all([
                supabase
                    .from('jobs')
                    .select('*, job_items(total, type, description, quantity, unit_price)')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('invoices')
                    .select('*')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('quotes')
                    .select('*')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('statements')
                    .select('*')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false })
            ]);

            if (jobsRes.error) throw jobsRes.error;

            const jobs = jobsRes.data?.map(job => {
                const total = job.job_items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
                return { ...job, total };
            }) || [];

            setCustomerJobs(jobs);
            setCustomerInvoices(invoicesRes.data || []);
            setCustomerQuotes(quotesRes.data || []);
            setCustomerStatements(statementsRes.data || []);

            // Calculate Stats
            const completedJobs = jobs.filter(j => j.status === 'completed');
            const totalRevenue = completedJobs.reduce((sum, job) => sum + job.total, 0);

            // Calculate parts purchased (from all completed jobs)
            const partsPurchased = completedJobs.reduce((sum, job) => {
                const partsCost = job.job_items
                    ?.filter((item: any) => item.type === 'part')
                    .reduce((itemSum: number, item: any) => itemSum + (item.total || 0), 0) || 0;
                return sum + partsCost;
            }, 0);

            setStats({
                totalJobs: completedJobs.length,
                totalRevenue,
                partsPurchased
            });

        } catch (error) {
            console.error('Error fetching customer details:', error);
        }
    };


    return (
        <div className="space-y-6">
            {selectedCustomer ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
                    <button
                        onClick={() => setSelectedCustomer(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-delaval-blue transition-colors font-medium"
                    >
                        <ArrowLeft size={20} />
                        Back to Customers
                    </button>

                    {/* Customer Header Card */}
                    <div className="section-card p-8">
                        <div className="flex flex-wrap items-start gap-8">
                            <div className="w-20 h-20 bg-[#E6F0FF] text-[#0051A5] rounded-full flex items-center justify-center font-bold text-3xl shadow-inner">
                                {selectedCustomer.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-[250px]">
                                <h2 className="text-3xl font-bold font-display text-slate-900 mb-2">{selectedCustomer.name}</h2>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 mb-4">
                                    {selectedCustomer.address && (
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                            {selectedCustomer.address}
                                        </div>
                                    )}
                                    {selectedCustomer.contact_person && (
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                                            {selectedCustomer.contact_person}
                                        </div>
                                    )}
                                    {selectedCustomer.email && (
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                                            {selectedCustomer.email}
                                        </div>
                                    )}
                                    {selectedCustomer.phone && (
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                                            {selectedCustomer.phone}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active Account</span>
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Terms: {selectedCustomer.payment_terms}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <div>
                                    <div className="text-sm text-slate-500 mb-1">Account Balance</div>
                                    <div className={`text-4xl font-extrabold mb-4 ${selectedCustomer.account_balance > 0 ? 'text-delaval-blue' : 'text-green-600'}`}>
                                        €{selectedCustomer.account_balance.toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link to="/invoices" className="btn btn-primary shadow-lg shadow-blue-900/10">
                                        Generate Invoice
                                    </Link>
                                    <button
                                        onClick={handleEditClick}
                                        className="btn border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                    >
                                        Edit Profile
                                    </button>


                                    <button
                                        onClick={handleDeleteClick}
                                        className="btn border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="stat-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-3xl font-bold font-display text-slate-900 mb-1">{stats.totalJobs}</div>
                                    <div className="text-sm font-medium text-slate-500">Total Jobs Completed</div>
                                </div>
                                <div className="w-12 h-12 bg-[#E6F9F3] text-[#00A862] rounded-xl flex items-center justify-center">
                                    <Briefcase size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-3xl font-bold font-display text-slate-900 mb-1">€{stats.totalRevenue.toLocaleString()}</div>
                                    <div className="text-sm font-medium text-slate-500">Total Revenue</div>
                                </div>
                                <div className="w-12 h-12 bg-[#E6F0FF] text-[#0051A5] rounded-xl flex items-center justify-center">
                                    <Euro size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-3xl font-bold font-display text-slate-900 mb-1">€{stats.partsPurchased.toLocaleString()}</div>
                                    <div className="text-sm font-medium text-slate-500">Parts Purchased</div>
                                </div>
                                <div className="w-12 h-12 bg-[#FFF3E6] text-[#FF6B00] rounded-xl flex items-center justify-center">
                                    <Package size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History Tabs */}
                    <div className="section-card">
                        <div className="border-b border-slate-200 px-6">
                            <div className="flex gap-8 overflow-x-auto">
                                {['service-history', 'parts-history', 'invoices', 'quotes', 'documents'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap capitalize
                                            ${activeTab === tab ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {tab.replace('-', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6">
                            {activeTab === 'service-history' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job ID</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Engineer</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customerJobs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                                                        No service history found for this customer.
                                                    </td>
                                                </tr>
                                            ) : (
                                                customerJobs.map((job) => (
                                                    <tr key={job.id} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                                            {new Date(job.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-slate-900">#JOB-{job.job_number || '---'}</td>
                                                        <td className="px-6 py-4 text-slate-600">{job.service_type || job.description || 'General Service'}</td>
                                                        <td className="px-6 py-4 text-slate-600">{job.engineer_name || 'Unassigned'}</td>
                                                        <td className="px-6 py-4 font-bold text-slate-900">€{job.total.toLocaleString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                                ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                    job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                                        job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                            'bg-slate-100 text-slate-600'}`}>
                                                                {job.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {activeTab === 'parts-history' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Part</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customerJobs.flatMap(j =>
                                                (j.job_items || [])
                                                    .filter((item: any) => item.type === 'part')
                                                    .map((item: any) => (
                                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-4 text-slate-600">{new Date(j.created_at).toLocaleDateString()}</td>
                                                            <td className="px-6 py-4 font-bold text-slate-900">{item.description} {item.inventory?.sku ? `[${item.inventory.sku}]` : ''}</td>
                                                            <td className="px-6 py-4 text-slate-600">#JOB-{j.job_number}</td>
                                                            <td className="px-6 py-4 text-slate-600">{item.quantity}</td>
                                                            <td className="px-6 py-4 font-bold text-slate-900">€{item.total.toLocaleString()}</td>
                                                        </tr>
                                                    )))}
                                            {customerJobs.flatMap(j => (j.job_items || []).filter((i: any) => i.type === 'part')).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                                        No parts history found for this customer.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'invoices' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customerInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No invoices found.</td>
                                                </tr>
                                            ) : customerInvoices.map(inv => (
                                                <tr key={inv.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4 text-slate-600">{new Date(inv.date_issued).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">{inv.invoice_number}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">€{inv.total_amount.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : inv.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>{inv.status}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {inv.pdf_url && <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-delaval-blue hover:underline text-sm font-medium">View PDF</a>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'quotes' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quote #</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customerQuotes.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No quotes found.</td>
                                                </tr>
                                            ) : customerQuotes.map(quote => (
                                                <tr key={quote.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4 text-slate-600">{new Date(quote.date_issued).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">{quote.quote_number}</td>
                                                    <td className="px-6 py-4 text-slate-600 min-w-[200px] truncate max-w-[200px]">{quote.description}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">€{quote.total_amount.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${quote.status === 'accepted' ? 'bg-green-100 text-green-800' : quote.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>{quote.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'documents' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statement #</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customerStatements.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No statements found.</td>
                                                </tr>
                                            ) : customerStatements.map(stmt => (
                                                <tr key={stmt.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4 text-slate-600">{new Date(stmt.date_generated).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">{stmt.statement_number}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">€{stmt.total_amount.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {stmt.pdf_url && <a href={stmt.pdf_url} target="_blank" rel="noopener noreferrer" className="text-delaval-blue hover:underline text-sm font-medium">View PDF</a>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold font-display text-slate-900">Customer Accounts</h1>
                            <p className="text-slate-500">Manage farm accounts and contact details</p>
                        </div>
                        <div className="flex gap-2">
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={() => setIsBulkDeleteOpen(true)}
                                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-red-900/20 active:scale-95"
                                >
                                    <Trash2 size={18} />
                                    Delete ({selectedIds.size})
                                </button>
                            )}
                            <input
                                ref={csvInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleCSVImport}
                            />
                            <button
                                onClick={() => csvInputRef.current?.click()}
                                disabled={importing}
                                className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Upload size={18} />
                                {importing ? 'Importing...' : 'CSV Import'}
                            </button>
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setNewCustomer({ name: '', address: '', contact_person: '', email: '', phone: '', payment_terms: 'Net 30' });
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 bg-delaval-blue hover:bg-delaval-dark-blue text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                            >
                                <Plus size={20} />
                                Add Customer
                            </button>
                        </div>
                    </div>

                    <div className="section-card p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search customers by name, location, or account number..."
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={selectAll}
                                className="text-xs font-bold text-slate-500 hover:text-delaval-blue whitespace-nowrap transition-colors"
                            >
                                {selectedIds.size === filteredCustomers.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {loading ? (
                                <div className="col-span-full text-center py-12 text-slate-500">Loading customers...</div>
                            ) : filteredCustomers.map((customer) => (
                                <div
                                    key={customer.id}
                                    onClick={() => setSelectedCustomer(customer)}
                                    className={`stat-card group cursor-pointer border-2 p-6 transition-all relative ${selectedIds.has(customer.id) ? 'border-red-300 bg-red-50/30' : 'border-transparent hover:border-delaval-blue'}`}
                                >
                                    {/* Checkbox */}
                                    <div
                                        onClick={(e) => toggleSelect(customer.id, e)}
                                        className={`absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${selectedIds.has(customer.id) ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 hover:border-delaval-blue'}`}
                                    >
                                        {selectedIds.has(customer.id) && (
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6L5 8L9 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        )}
                                    </div>
                                    <div className="w-16 h-16 bg-[#E6F0FF] text-[#0051A5] rounded-full flex items-center justify-center font-bold text-2xl mb-4 group-hover:scale-110 transition-transform">
                                        {customer.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{customer.name}</h3>

                                    {/* Contact Details */}
                                    <div className="space-y-1.5 text-sm">
                                        {customer.address && (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                                <span className="truncate">{customer.address}</span>
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                                                <span className="truncate">{customer.email}</span>
                                            </div>
                                        )}
                                        {customer.phone && (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                                                <span>{customer.phone}</span>
                                            </div>
                                        )}
                                        {!customer.address && !customer.email && !customer.phone && (
                                            <div className="text-slate-400 italic text-xs">No contact info</div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Outstanding</div>
                                            <div className={`text-xl font-extrabold ${customer.account_balance > 0 ? 'text-delaval-blue' : 'text-green-600'}`}>
                                                €{customer.account_balance.toLocaleString()}
                                            </div>
                                        </div>
                                        <button className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-delaval-blue group-hover:text-white transition-colors">
                                            <ArrowLeft size={20} className="rotate-180" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Customer" : "Add New Customer"}>
                <form onSubmit={handleSaveCustomer} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company / Farm Name</label>
                            <input required type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                            <textarea className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20" rows={3} value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                            <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20" value={newCustomer.contact_person} onChange={e => setNewCustomer({ ...newCustomer, contact_person: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input type="email" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                            <select className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20 mb-2" value={newCustomer.payment_terms} onChange={e => setNewCustomer({ ...newCustomer, payment_terms: e.target.value })}>
                                <option>Net 30</option>
                                <option>Net 60</option>
                                <option>Immediate</option>
                            </select>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-delaval-blue text-white rounded-lg font-bold hover:bg-delaval-dark-blue">Save Customer</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Customer"
                message="Are you sure you want to delete this customer? This action cannot be undone."
                isDestructive={true}
                isLoading={isDeleting}
                confirmText="Delete Customer"
            />

            <ConfirmModal
                isOpen={isBulkDeleteOpen}
                onClose={() => setIsBulkDeleteOpen(false)}
                onConfirm={confirmBulkDelete}
                title="Delete Selected Customers"
                message={`Are you sure you want to delete ${selectedIds.size} selected customer(s)? This action cannot be undone.`}
                isDestructive={true}
                isLoading={isDeleting}
                confirmText={`Delete ${selectedIds.size} Customer(s)`}
            />
        </div>
    );

};

export default Customers;
