import React, { useEffect, useState } from 'react';
import { Search, Calendar, User, FileText, Trash2, Pencil } from 'lucide-react';
import { Job, Customer } from '../types';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { dataService } from '../services/dataService';

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

    useEffect(() => {
        loadData();
    }, [activeTab]); // Reload when tab changes (server-side filter)

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchJobs(), fetchCustomers(), fetchEngineers()]);
        setLoading(false);
    };

    const fetchJobs = async () => {
        const data = await dataService.getJobs(activeTab);
        setJobs(data);
    };

    const fetchCustomers = async () => {
        const data = await dataService.getCustomers();
        setCustomers(data);
    };

    const [engineers, setEngineers] = useState<any[]>([]);
    const fetchEngineers = async () => {
        const data = await dataService.getEngineers();
        setEngineers(data);
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEditClick = (job: Job) => {
        setNewJob({
            customer_id: job.customer_id,
            engineer_name: job.engineer_name || '',
            service_type: job.service_type,
            status: job.status,
            date_scheduled: job.date_scheduled,
            notes: job.notes || ''
        });
        setEditingId(job.id);
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
            if (editingId) {
                // Update
                const { error } = await dataService.updateJob(editingId, newJob);

                if (error) throw error;

                fetchJobs();
            } else {
                // Create
                const { error } = await dataService.createJob(newJob);

                if (error) throw error;
                fetchJobs();
            }

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
        const matchesSearch =
            job.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.engineer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.job_number?.toString().toLowerCase().includes(searchTerm.toLowerCase());

        // Status filter is now handled by loadData/useEffect
        return matchesSearch;
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
                                                {job.date_scheduled}
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
            >
                <form onSubmit={handleAddJob} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                        <select
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                            value={newJob.customer_id}
                            onChange={e => setNewJob({ ...newJob, customer_id: e.target.value })}
                        >
                            <option value="">Select a customer...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Milking Machine Service"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                value={newJob.service_type}
                                onChange={e => setNewJob({ ...newJob, service_type: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assign Engineer</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                value={newJob.engineer_name}
                                onChange={e => setNewJob({ ...newJob, engineer_name: e.target.value })}
                            >
                                <option value="">Select an engineer...</option>
                                {engineers.map(eng => (
                                    <option key={eng.id} value={eng.name}>{eng.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date</label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                value={newJob.date_scheduled}
                                onChange={e => setNewJob({ ...newJob, date_scheduled: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                required
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                value={newJob.status}
                                onChange={e => setNewJob({ ...newJob, status: e.target.value as Job['status'] })}
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                            <textarea
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                rows={3}
                                value={newJob.notes}
                                onChange={e => setNewJob({ ...newJob, notes: e.target.value })}
                            />
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
