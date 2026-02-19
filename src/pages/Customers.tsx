
import React, { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Phone, Users, ArrowLeft, FileText, Package, Briefcase, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';
import Modal from '../components/Modal';

const Customers = () => {
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

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('customers').select('*').order('name');
            if (error) throw error;
            setCustomers(data || []);
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
            const { data, error } = await supabase
                .from('jobs')
                .select('*, job_items(total, type)')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const jobs = data?.map(job => {
                const total = job.job_items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
                return { ...job, total };
            }) || [];

            setCustomerJobs(jobs);

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

    if (selectedCustomer) {
        return (
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
                            <div className="text-slate-500 space-y-1 mb-4">
                                <div>{selectedCustomer.address}</div>
                                <div>Contact: {selectedCustomer.contact_person}</div>
                                <div>Email: {selectedCustomer.email || 'N/A'} | Phone: {selectedCustomer.phone || 'N/A'}</div>
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
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to delete this customer?')) {
                                            const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
                                            if (!error) {
                                                setCustomers(customers.filter(c => c.id !== selectedCustomer.id));
                                                setSelectedCustomer(null);
                                            }
                                        }
                                    }}
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
                                <DollarSign size={24} />
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
                        {activeTab !== 'service-history' && (
                            <div className="py-12 text-center text-slate-400 italic">
                                Feature coming soon...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Customer Accounts</h1>
                    <p className="text-slate-500">Manage farm accounts and contact details</p>
                </div>
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

            <div className="section-card p-6">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search customers by name, location, or account number..."
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {loading ? (
                        <div className="col-span-full text-center py-12 text-slate-500">Loading customers...</div>
                    ) : filteredCustomers.map((customer) => (
                        <div
                            key={customer.id}
                            onClick={() => setSelectedCustomer(customer)}
                            className="stat-card group cursor-pointer border-2 border-transparent hover:border-delaval-blue p-6"
                        >
                            <div className="w-16 h-16 bg-[#E6F0FF] text-[#0051A5] rounded-full flex items-center justify-center font-bold text-2xl mb-4 group-hover:scale-110 transition-transform">
                                {customer.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="mb-2">
                                <h3 className="text-lg font-bold text-slate-900">{customer.name}</h3>
                                <div className="text-slate-500 text-sm">{customer.address || 'No address'}</div>
                            </div>

                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
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
        </div>
    );
};

export default Customers;
