import React, { useEffect, useState } from 'react';
import { Search, Calendar, User, FileText, Trash2, Pencil, Wrench, Activity } from 'lucide-react';
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
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>;
            case 'in_progress':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">In Progress</span>;
            case 'scheduled':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Scheduled</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const filteredJobs = jobs.filter(job => {
        // Tab (Status) filtering
        const matchesTab = activeTab === 'all' || job.status === activeTab;

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
        return jobs.filter(j => j.status === tab).length;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Jobs & Services</h1>
                    <p className="text-slate-500">Track service calls and maintenance schedules</p>
                </div>
            </div>

            <div className="section-card">
                <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4">
                    <h2 className="text-lg font-bold text-slate-900">Job List</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button className="btn btn-secondary text-sm">Export</button>
                        <button onClick={() => {
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
                        }} className="btn btn-primary text-sm shadow-md shadow-blue-900/10">
                            + New Job
                        </button>
                    </div>
                </div>

                <div className="border-b border-slate-200 px-6">
                    <div className="flex gap-6 overflow-x-auto">
                        {['all', 'scheduled', 'in_progress', 'completed'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap capitalize
                                    ${activeTab === tab
                                        ? 'border-delaval-blue text-delaval-blue'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.replace('_', ' ')} ({getTabCount(tab)})
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search jobs by customer, engineer, or job ID..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                                <Link to={`/jobs/${job.id}`} className="p-2 text-slate-400 hover:text-delaval-blue hover:bg-blue-50 rounded-lg transition-colors inline-block" title="View Details">
                                                    <FileText size={18} />
                                                </Link>


                                                <button
                                                    onClick={() => handleEditClick(job)}
                                                    className="p-2 text-slate-400 hover:text-delaval-blue hover:bg-blue-50 rounded-lg transition-colors"
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Job" : "Create New Job"}
                size="wide"
            >
                <form onSubmit={handleAddJob} className="space-y-4 md:space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Customer Details</h3>
                            <button
                                type="button"
                                onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                                className="text-sm font-bold text-delaval-blue hover:text-blue-800 transition-colors"
                            >
                                {isAddingNewCustomer ? 'Select Existing Customer' : '+ Add New Customer'}
                            </button>
                        </div>

                        {isAddingNewCustomer ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name / Farm *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                        value={newCustomerData.name}
                                        onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                        placeholder="e.g. John Doe Farm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                        value={newCustomerData.phone || ''}
                                        onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                        placeholder="e.g. +353 87 123 4567"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                        value={newCustomerData.address || ''}
                                        onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                        placeholder="Full address..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <SearchableSelect
                                label="Select Existing Customer *"
                                options={customers.map(c => ({ value: c.id, label: c.name }))}
                                value={newJob.customer_id || ''}
                                onChange={val => setNewJob({ ...newJob, customer_id: val })}
                                placeholder="Search and select a customer..."
                                icon={<User size={16} />}
                            />
                        )}
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <h3 className="font-bold text-slate-900 mb-4">Job Details</h3>
                            <SearchableSelect
                                label="Service Type"
                                options={[
                                    { value: 'Machine Service', label: 'Machine Service' },
                                    { value: 'Breakdown', label: 'Breakdown' },
                                    { value: 'Emergency Call Out', label: 'Emergency Call Out' }
                                ]}
                                allowCustom={true}
                                value={newJob.service_type || ''}
                                onChange={val => setNewJob({ ...newJob, service_type: val })}
                                placeholder="Choose or type service type..."
                                icon={<FileText size={16} />}
                            />
                        </div>

                        <div>
                            <SearchableSelect
                                label="Assign Engineer"
                                options={engineers.map(eng => ({ value: eng.name, label: eng.name }))}
                                value={newJob.engineer_name || ''}
                                onChange={val => setNewJob({ ...newJob, engineer_name: val })}
                                placeholder="Select an engineer..."
                                icon={<Wrench size={16} />}
                            />
                        </div>

                        <div className="md:col-span-1">
                            {/* DatePicker is already here, no change needed for label/layout consistency */}
                            <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date</label>
                            <DatePicker
                                required
                                value={newJob.date_scheduled || ''}
                                onChange={(date) => setNewJob({ ...newJob, date_scheduled: date })}
                                placeholder="Pick a date..."
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

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                            <textarea
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                rows={2}
                                value={newJob.notes}
                                onChange={e => setNewJob({ ...newJob, notes: e.target.value })}
                            />
                        </div>

                        {/* Line Items Editor */}
                        <div className="col-span-2 mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest">Parts & Labor</label>
                                <div className="text-xs font-bold text-delaval-blue">
                                    Total: €{modalItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toFixed(2)}
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[200px] overflow-y-auto mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {modalItems.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-slate-400 italic">No parts or labor added yet</div>
                                ) : (
                                    modalItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-slate-200 shadow-sm group">
                                            <div className="flex-1 text-xs font-medium text-slate-700 truncate">{item.description}</div>
                                            <div className="w-12 text-[10px] text-slate-500 text-center">x{item.quantity}</div>
                                            <div className="w-16 text-xs font-bold text-slate-900">€{(item.quantity * item.unit_price).toFixed(2)}</div>
                                            <button
                                                type="button"
                                                onClick={() => setModalItems(modalItems.filter((_, i) => i !== idx))}
                                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                {isAddingCustom ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-12 gap-2">
                                            <div className="col-span-12 sm:col-span-6">
                                                <input
                                                    type="text"
                                                    placeholder="Item description (e.g. Labor, Mileage, Oil)..."
                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                                    value={newItem.description}
                                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-6 sm:col-span-2">
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                                    value={newItem.quantity}
                                                    onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="col-span-6 sm:col-span-4">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Rate"
                                                        className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                                                        value={newItem.unit_price}
                                                        onChange={e => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingCustom(false)}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
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
                                                className="px-4 py-1.5 text-xs font-bold bg-delaval-blue text-white rounded-lg hover:bg-delaval-dark-blue transition-colors shadow-sm"
                                            >
                                                Add Item
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-12 gap-3 items-center">
                                        <div className="col-span-7">
                                            <SearchableSelect
                                                placeholder="Search products..."
                                                options={inventory.map(i => ({ value: i.id, label: `${i.name} (€${i.sell_price})` }))}
                                                value=""
                                                onChange={(id) => {
                                                    const invItem = inventory.find(i => i.id === id);
                                                    if (invItem) {
                                                        setModalItems([...modalItems, {
                                                            description: invItem.name,
                                                            quantity: 1,
                                                            unit_price: invItem.sell_price,
                                                            type: 'part',
                                                            inventory_id: invItem.id
                                                        }]);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-5 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingCustom(true)}
                                                className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                                            >
                                                + Custom / Labor
                                            </button>
                                            <div className="flex flex-col items-center justify-center text-[9px] text-slate-400 font-black uppercase leading-tight tracking-tighter shrink-0">
                                                Add<br />Item
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-delaval-blue hover:bg-delaval-dark-blue text-white rounded-lg font-bold shadow-lg shadow-blue-900/10"
                        >
                            {editingId ? 'Save Changes' : 'Create Job'}
                        </button>
                    </div>
                </form>
            </Modal>

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
        </div >
    );
};

export default Jobs;
