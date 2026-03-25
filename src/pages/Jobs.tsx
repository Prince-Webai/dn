import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, User, FileText, Trash2, Pencil, Wrench, Activity, Plus, ArrowRight, Package } from 'lucide-react';
import { Job, Customer } from '../types';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import DatePicker from '../components/DatePicker';
import SearchableSelect from '../components/SearchableSelect';
import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Jobs = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newJob, setNewJob] = useState<Partial<Job>>({
        customer_id: '',
        engineer_name: '',
        service_type: '',
        status: 'scheduled',
        date_scheduled: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [modalItems, setModalItems] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ description: '', quantity: 1, unit_price: 0, type: 'part' as const });
    const [isAddingCustom, setIsAddingCustom] = useState(false);

    // Inline Customer Creation State
    const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', address: '' });

    const { user } = useAuth();
    const [engineers, setEngineers] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [activeTab]); // Reload when tab changes (server-side filter)

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchJobs(), fetchCustomers(), fetchEngineers(), fetchInventory()]);
        setLoading(false);
    };

    const fetchInventory = async () => {
        const data = await dataService.getInventory();
        setInventory(data);
    };

    const fetchJobs = async () => {
        const userRole = user?.user_metadata?.role;
        const engineerToFetch = userRole === 'Engineer' ? (user?.user_metadata?.name || user?.email?.split('@')[0]) : undefined;
        // Fetch ALL jobs for this context (admin/engineer) to keep tab counts accurate
        const data = await dataService.getJobs(undefined, engineerToFetch);
        setJobs(data);
    };

    const fetchCustomers = async () => {
        const data = await dataService.getCustomers();
        setCustomers(data);
    };

    const fetchEngineers = async () => {
        const data = await dataService.getEngineers();
        setEngineers(data);
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEditClick = async (job: Job) => {
        setNewJob({
            customer_id: job.customer_id,
            engineer_name: job.engineer_name || '',
            service_type: job.service_type,
            status: job.status,
            date_scheduled: job.date_scheduled ? job.date_scheduled.split('T')[0] : '',
            notes: job.notes || ''
        });
        setEditingId(job.id);

        // Fetch items
        const items = await dataService.getJobItems(job.id);
        setModalItems(items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            type: i.type,
            inventory_id: i.inventory_id
        })));

        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const { error } = await dataService.deleteJob(deleteId);
            if (!error) {
                setJobs(jobs.filter(j => j.id !== deleteId));
                setIsDeleteModalOpen(false);
                setDeleteId(null);
            } else {
                alert('Failed to delete job');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalCustomerId = newJob.customer_id;

            // Handle inline customer creation
            if (isAddingNewCustomer && newCustomerData.name) {
                const { data: custData, error: custError } = await supabase
                    .from('customers')
                    .insert([{
                        name: newCustomerData.name,
                        phone: newCustomerData.phone || null,
                        email: newCustomerData.email || null,
                        address: newCustomerData.address || null
                    }])
                    .select()
                    .single();

                if (custError) throw custError;
                if (!custData) throw new Error("Failed to create customer");

                finalCustomerId = custData.id;
            }

            const jobToSave = { ...newJob, customer_id: finalCustomerId };

            let jobId = editingId;
            if (editingId) {
                // Update
                const { error } = await dataService.updateJob(editingId, jobToSave);
                if (error) throw error;

                // For updates, we'll keep it simple: delete old items and add new ones
                // (In a real app we might do a diff)
                await supabase.from('job_items').delete().eq('job_id', editingId);
            } else {
                // Create
                const { data, error } = await dataService.createJob(jobToSave);
                if (error) throw error;
                if (!data) throw new Error("Failed to create job");
                jobId = data.id;
            }

            // Save items if we have a jobId
            if (jobId && modalItems.length > 0) {
                const itemsToSave = modalItems.map(item => {
                    const { total, ...rest } = item; // Remove total as it's a generated column
                    return {
                        ...rest,
                        job_id: jobId
                    };
                });
                const { error: itemsError } = await dataService.addJobItems(itemsToSave);
                if (itemsError) throw itemsError;
            }

            fetchJobs();
            setIsModalOpen(false);
            setEditingId(null);
            setNewJob({
                customer_id: '',
                engineer_name: '',
                service_type: '',
                status: 'scheduled',
                date_scheduled: new Date().toISOString().split('T')[0],
                notes: ''
            });
            setModalItems([]);

        } catch (error) {
            console.error('Error saving job:', error);
            alert('Failed to save job.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>;
            case 'in_progress':
                return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">In Progress</span>;
            case 'scheduled':
                return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Scheduled</span>;
            default:
                return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const filteredJobs = jobs.filter(job => {
        // Tab (Status) filtering
        let matchesTab = activeTab === 'all' || job.status === activeTab;

        if (activeTab === 'unbilled') {
            matchesTab = job.status === 'completed' && !(job as any).is_invoiced;
        }

        // Search filtering
        const matchesSearch =
            job.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.engineer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.job_number?.toString().toLowerCase().includes(searchTerm.toLowerCase());

        return matchesTab && matchesSearch;
    });

    const getTabCount = (tab: string) => {
        if (tab === 'all') return jobs.length;
        if (tab === 'unbilled') return jobs.filter(j => j.status === 'completed' && !(j as any).is_invoiced).length;
        return jobs.filter(j => j.status === tab).length;
    };

    return (
        <>
            {/* DESKTOP VIEW */}
            <div className="hidden md:block space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Jobs & Services</h1>
                        <p className="text-slate-500">Manage and schedule service calls</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setNewJob({
                                customer_id: '',
                                engineer_name: '',
                                service_type: '',
                                status: 'scheduled',
                                date_scheduled: new Date().toISOString().split('T')[0],
                                notes: ''
                            });
                            setModalItems([]);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/10 active:scale-95"
                    >
                        <Plus size={20} />
                        New Job
                    </button>
                </motion.div>

                {/* Status Tabs */}
                <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-sm">
                    {['all', 'scheduled', 'in_progress', 'completed', 'unbilled'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                                ${activeTab === tab
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {tab === 'all' ? 'All' : tab === 'unbilled' ? 'Unbilled' : tab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            <span className="ml-2 px-1.5 py-0.5 bg-black/10 rounded text-xs">
                                {getTabCount(tab)}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Jobs Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="font-bold text-slate-900">Job List</h2>
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search jobs, customers..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-600 focus:bg-white transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Engineer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading jobs...</td></tr>
                                ) : filteredJobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">#{job.job_number}</div>
                                            <div className="text-xs text-slate-500">ID</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{job.customers?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{job.service_type}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                {job.engineer_name || 'Unassigned'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {job.date_scheduled ? new Date(job.date_scheduled).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(job.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <Link to={`/jobs/${job.id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block" title="View Details">
                                                    <FileText size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleEditClick(job)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Job"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(job.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Job"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredJobs.length === 0 && !loading && (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No jobs found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="block md:hidden pb-24 bg-[#F8FAFB] min-h-screen text-[#1a1a1a]">
                {/* Modern Mobile Header without extra pt-12, reduced to pt-6 for tighter look */}
                <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 px-5 pb-4 border-b border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] pt-6">
                    <div className="flex justify-between items-center mb-5">
                        <h1 className="text-[26px] font-black text-slate-900 tracking-tight">Jobs</h1>
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setNewJob({
                                    customer_id: '',
                                    engineer_name: '',
                                    service_type: '',
                                    status: 'scheduled',
                                    date_scheduled: new Date().toISOString().split('T')[0],
                                    notes: ''
                                });
                                setModalItems([]);
                                setIsModalOpen(true);
                            }}
                            className="w-10 h-10 bg-[#0051A5] hover:bg-[#003875] rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-all"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Integrated Search Bar */}
                    <div className="bg-[#F8FAFB] rounded-2xl flex items-center px-4 py-3 border border-slate-200/60 focus-within:border-slate-300 focus-within:bg-white transition-all shadow-inner">
                        <Search size={18} className="text-slate-400 mr-3 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search jobs, farms, engineers..."
                            className="w-full bg-transparent border-none outline-none text-[15px] font-medium text-slate-900 placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Status Tabs Slider - Sticky below header */}
                <div className="sticky top-[118px] z-10 bg-[#F8FAFB]/95 backdrop-blur-sm pt-4 pb-3 border-b border-slate-100/50">
                    <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar px-5">
                        {['all', 'scheduled', 'in_progress', 'completed', 'unbilled'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-[1rem] text-[13px] font-bold whitespace-nowrap transition-all shadow-sm
                                    ${activeTab === tab
                                        ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {tab === 'all' ? 'All' : tab === 'unbilled' ? 'Unbilled' : tab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} <span className="opacity-60 ml-1">({getTabCount(tab)})</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Job Cards List */}
                <div className="px-5 space-y-3 pt-4">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400 font-medium text-sm">Loading jobs...</div>
                    ) : (
                        filteredJobs.map((job) => (
                            <Link key={job.id} to={`/jobs/${job.id}`} className="block bg-white border border-slate-100 rounded-[1.25rem] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-transform">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-[11px] font-bold text-slate-400 tracking-wider">#{job.job_number}</div>
                                    <div className="flex items-center gap-1.5">
                                        {job.status === 'completed' && <><div className="w-1.5 h-1.5 rounded-full bg-[#00A862]"></div><span className="text-[10px] font-bold uppercase tracking-wider text-[#00A862]">COMPLETED</span></>}
                                        {job.status === 'in_progress' && <><div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]"></div><span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00]">IN PROGRESS</span></>}
                                        {job.status === 'scheduled' && <><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div><span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">SCHEDULED</span></>}
                                        {job.status === 'cancelled' && <><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CANCELLED</span></>}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-900 text-[17px] leading-tight mb-1">{job.customers?.name || 'Unknown Site'}</h3>
                                    <p className="text-[13px] text-slate-500">{job.customers?.address || 'No address provided'}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-50 text-orange-600 text-[11px] font-bold tracking-wide">
                                        Dairy Service
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold tracking-wide">
                                        {job.service_type}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-50 text-[#64748B] text-[12px] font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-slate-400" />
                                        <span>{job.date_scheduled ? new Date(job.date_scheduled).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <User size={13} className="text-slate-400" />
                                        <span>{job.engineer_name?.split(' ')[0] || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                    {filteredJobs.length === 0 && !loading && (
                        <div className="text-center py-10 text-slate-400 italic">No jobs found matching your criteria.</div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Job" : "Create New Job"}
                size="wide"
                backdropClassName="hidden md:flex"
            >
                <form onSubmit={handleAddJob} className="space-y-4 md:space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Customer Details</h3>
                            <button
                                type="button"
                                onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                {isAddingNewCustomer ? 'Select Existing Site' : '+ Add New Site'}
                            </button>
                        </div>

                        {isAddingNewCustomer ? (
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Installation Site Name / Customer *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600/20 outline-none"
                                        value={newCustomerData.name}
                                        onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600/20 outline-none"
                                        value={newCustomerData.phone || ''}
                                        onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600/20 outline-none"
                                        value={newCustomerData.address || ''}
                                        onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        ) : (
                            <SearchableSelect
                                label="Select Existing Site *"
                                options={customers.map(c => ({ value: c.id, label: c.name }))}
                                value={newJob.customer_id || ''}
                                onChange={val => setNewJob({ ...newJob, customer_id: val })}
                                placeholder="Search and select..."
                                icon={<User size={16} />}
                            />
                        )}
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <h3 className="font-bold text-slate-900 mb-4">Job Details</h3>
                            <SearchableSelect
                                label="Service Type"
                                options={[
                                    { value: 'Milking Machine Service', label: 'Milking Machine Service' },
                                    { value: 'Plant Installation', label: 'Plant Installation' },
                                    { value: 'Maintenance Check', label: 'Maintenance Check' },
                                    { value: 'Emergency Repair', label: 'Emergency Repair' },
                                    { value: 'System Audit', label: 'System Audit' }
                                ]}
                                allowCustom={true}
                                value={newJob.service_type || ''}
                                onChange={val => setNewJob({ ...newJob, service_type: val })}
                                icon={<FileText size={16} />}
                            />
                        </div>

                        <div className="col-span-1">
                            <SearchableSelect
                                label="Assign Engineer"
                                options={engineers.map(eng => ({ value: eng.name, label: eng.name }))}
                                value={newJob.engineer_name || ''}
                                onChange={val => setNewJob({ ...newJob, engineer_name: val })}
                                icon={<Wrench size={16} />}
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <DatePicker
                                required
                                value={newJob.date_scheduled || ''}
                                onChange={(date) => setNewJob({ ...newJob, date_scheduled: date })}
                            />
                        </div>

                        <div className="col-span-2">
                            <SearchableSelect
                                label="Status"
                                searchable={false}
                                options={[
                                    { value: 'scheduled', label: 'Scheduled' },
                                    { value: 'in_progress', label: 'In Progress' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'cancelled', label: 'Cancelled' }
                                ]}
                                value={newJob.status || 'scheduled'}
                                onChange={val => setNewJob({ ...newJob, status: val as Job['status'] })}
                                icon={<Activity size={16} />}
                            />
                        </div>

                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900">Parts & Labor</h3>
                            <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                Total: €{modalItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toFixed(2)}
                            </div>
                        </div>

                        <div className="space-y-3 mb-4">
                            {modalItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg">
                                    <div>
                                        <div className="font-medium text-slate-900">{item.description}</div>
                                        <div className="text-sm text-slate-500">Qty: {item.quantity} × €{item.unit_price.toFixed(2)}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-slate-900">€{(item.quantity * item.unit_price).toFixed(2)}</div>
                                        <button
                                            type="button"
                                            onClick={() => setModalItems(modalItems.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {modalItems.length === 0 && (
                                <div className="text-center py-6 text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg">
                                    No items added yet. Search inventory below or add custom labor.
                                </div>
                            )}
                        </div>

                        {isAddingCustom ? (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                                <div className="font-bold text-sm text-slate-700">Add Custom Item / Labor</div>
                                <input
                                    type="text"
                                    placeholder="Description (e.g. Installation Labor)"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-600"
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="0.5"
                                            step="0.5"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-600"
                                            value={newItem.quantity}
                                            onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Unit Price (€)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-600"
                                            value={newItem.unit_price}
                                            onChange={e => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCustom(false)}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newItem.description) {
                                                setModalItems([...modalItems, { ...newItem, type: 'labor' }]);
                                                setNewItem({ description: '', quantity: 1, unit_price: 0, type: 'part' });
                                                setIsAddingCustom(false);
                                            }
                                        }}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                    >
                                        Add Custom Line
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-2">
                                    <SearchableSelect
                                        label=""
                                        options={inventory.map(i => ({ value: i.id, label: `${i.name} (€${i.sell_price})` }))}
                                        value={newItem.description ? '__selected__' : ''}
                                        onChange={(id) => {
                                            const invItem = inventory.find(i => i.id === id);
                                            if (invItem) {
                                                setNewItem({
                                                    description: invItem.name,
                                                    quantity: 1,
                                                    unit_price: invItem.sell_price,
                                                    type: 'part' as const,
                                                    // @ts-ignore
                                                    inventory_id: invItem.id
                                                });
                                            }
                                        }}
                                        placeholder="Search inventory parts..."
                                        icon={<Package size={16} />}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <select
                                        className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm font-medium outline-none focus:border-delaval-blue bg-white"
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                                    >
                                        {[...Array(20)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>Qty: {i + 1}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newItem.description) {
                                                setModalItems([...modalItems, { ...newItem }]);
                                                setNewItem({ description: '', quantity: 1, unit_price: 0, type: 'part' });
                                            }
                                        }}
                                        disabled={!newItem.description}
                                        className="w-full h-[42px] bg-blue-600 text-white rounded-lg text-sm font-bold flex justify-center gap-2 items-center hover:bg-blue-700 disabled:opacity-50 transition-all"
                                    >
                                        <Plus size={18} /> Add Part
                                    </button>
                                </div>
                                <div className="md:col-span-4 text-center mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCustom(true)}
                                        className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                                    >
                                        + Add Custom Item / Labor
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-2">Job Description</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-600/20 outline-none text-slate-700 bg-slate-50 focus:bg-white transition-colors min-h-[100px]"
                            placeholder="Enter detailed job description or internal notes here..."
                            rows={3}
                            value={newJob.notes}
                            onChange={e => setNewJob({ ...newJob, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-900/10">
                            {editingId ? 'Save Changes' : 'Create Job'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* FULL SCREEN MOBILE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-[#F8FAFB] z-[3000] md:hidden flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-slate-100 shrink-0">
                        <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 bg-slate-50 rounded-full hover:text-slate-600 transition-colors">
                            <Plus size={24} className="rotate-45" />
                        </button>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{editingId ? "Edit Job" : "New Job"}</h2>
                        <div className="w-10"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">
                        <form onSubmit={handleAddJob} id="mobile-job-form" className="space-y-6">
                            {/* Mobile Form content from original if needed, or simplified versions */}
                             <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900">Site Information</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                                        className="text-xs font-bold text-blue-600"
                                    >
                                        {isAddingNewCustomer ? 'Select Existing' : '+ New Site'}
                                    </button>
                                </div>

                                {isAddingNewCustomer ? (
                                    <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100">
                                        <input
                                            placeholder="Site Name *"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none text-[15px]"
                                            value={newCustomerData.name}
                                            onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                        />
                                        <input
                                            placeholder="Phone"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none text-[15px]"
                                            value={newCustomerData.phone || ''}
                                            onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                        />
                                        <textarea
                                            placeholder="Address"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none text-[15px]"
                                            value={newCustomerData.address || ''}
                                            onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <SearchableSelect
                                        label=""
                                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                                        value={newJob.customer_id || ''}
                                        onChange={val => setNewJob({ ...newJob, customer_id: val })}
                                        placeholder="Choose a site..."
                                    />
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900">Service Type</h3>
                                <SearchableSelect
                                    label=""
                                    options={[
                                        { value: 'Milking Machine Service', label: 'Milking Machine Service' },
                                        { value: 'Plant Installation', label: 'Plant Installation' },
                                        { value: 'Maintenance Check', label: 'Maintenance Check' },
                                        { value: 'Emergency Repair', label: 'Emergency Repair' }
                                    ]}
                                    allowCustom={true}
                                    value={newJob.service_type || ''}
                                    onChange={val => setNewJob({ ...newJob, service_type: val })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h3 className="font-bold text-slate-900">Date</h3>
                                    <DatePicker
                                        value={newJob.date_scheduled || ''}
                                        onChange={(date) => setNewJob({ ...newJob, date_scheduled: date })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-slate-900">Engineer</h3>
                                    <SearchableSelect
                                        label=""
                                        options={engineers.map(eng => ({ value: eng.name, label: eng.name }))}
                                        value={newJob.engineer_name || ''}
                                        onChange={val => setNewJob({ ...newJob, engineer_name: val })}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Mobile Footer */}
                    <div className="p-5 bg-white border-t border-slate-100 shrink-0">
                        <button
                            form="mobile-job-form"
                            type="submit"
                            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200"
                        >
                            {editingId ? 'Update Job' : 'Create Job'}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Job"
                message="Are you sure you want to delete this job? This action cannot be undone."
                isDestructive={true}
                isLoading={isDeleting}
                confirmText="Delete Job"
            />
        </>
    );
};

export default Jobs;

