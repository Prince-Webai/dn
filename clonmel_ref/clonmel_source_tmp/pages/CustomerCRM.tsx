import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Customer } from '../types';
import { Plus, Search, Edit2, Trash2, X, Save, Users as UsersIcon, Mail, Phone, MapPin, Building2, Tag } from 'lucide-react';

const CustomerCRM = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer, user } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        gender: 'Male' as 'Male' | 'Female' | 'Other',
        address: '',
        city: '',
        postalCode: '',
        country: 'Ireland',
        company: '',
        notes: '',
        tags: [] as string[]
    });

    const [tagInput, setTagInput] = useState('');

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
    );

    const handleOpenModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                gender: customer.gender || 'Male',
                address: customer.address || '',
                city: customer.city || '',
                postalCode: customer.postalCode || '',
                country: customer.country || 'Ireland',
                company: customer.company || '',
                notes: customer.notes || '',
                tags: customer.tags || []
            });
        } else {
            setEditingCustomer(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                gender: 'Male',
                address: '',
                city: '',
                postalCode: '',
                country: 'Ireland',
                company: '',
                notes: '',
                tags: []
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCustomer(null);
        setTagInput('');
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const customerData: Customer = {
            id: editingCustomer?.id || Date.now().toString(),
            ...formData,
            createdAt: editingCustomer?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: editingCustomer?.createdBy || user?.id || 'unknown'
        };

        if (editingCustomer) {
            await updateCustomer(customerData);
        } else {
            await addCustomer(customerData);
        }

        handleCloseModal();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            await deleteCustomer(id);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/20">
                            <UsersIcon size={28} />
                        </div>
                        Customer CRM
                    </h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
                        Manage Your Client Database
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 font-black text-sm uppercase tracking-wider"
                >
                    <Plus size={20} />
                    Add New Customer
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search customers by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-sm font-semibold"
                />
            </div>

            {/* Customer List (Table View) */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-100">
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Customer</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Contact Info</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Location</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest hidden lg:table-cell">Tags</th>
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{customer.name}</div>
                                        {customer.company && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                                                <Building2 size={10} />
                                                {customer.company}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                            <Mail size={12} className="text-slate-400" />
                                            {customer.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                            <Phone size={12} className="text-slate-400" />
                                            {customer.phone}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell">
                                    {customer.address || customer.city ? (
                                        <div className="flex items-start gap-2 text-xs text-slate-600 max-w-[200px]">
                                            <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                            <span className="truncate">
                                                {[customer.address, customer.city].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-300 italic">No address</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 hidden lg:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                        {customer.tags && customer.tags.length > 0 ? (
                                            customer.tags.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">No tags</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(customer)}
                                            className="p-1.5 text-brand-600 bg-brand-50 rounded hover:bg-brand-600 hover:text-white transition-all"
                                            title="Edit"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(customer.id)}
                                            className="p-1.5 text-rose-600 bg-rose-50 rounded hover:bg-rose-600 hover:text-white transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredCustomers.length === 0 && (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                        <UsersIcon size={40} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-semibold">No customers found</p>
                    <p className="text-slate-400 text-sm mt-2">Add your first customer to get started</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b-2 border-slate-100 p-6 flex justify-between items-center rounded-t-3xl">
                            <h3 className="text-2xl font-black text-slate-900">
                                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Phone *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="+353 123 456 789"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Company</label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="Company Name"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="Street Address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">City</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="Clonmel"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Postal Code</label>
                                    <input
                                        type="text"
                                        value={formData.postalCode}
                                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="E91 X123"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Country</label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        placeholder="Ireland"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Tags</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                            placeholder="Add tag and press Enter"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
                                        >
                                            <Tag size={20} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-lg text-sm font-bold">
                                                {tag}
                                                <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-brand-900">
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-wider">Notes</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all resize-none"
                                        placeholder="Additional notes about this customer..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t-2 border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-black uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-black uppercase tracking-wider shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    {editingCustomer ? 'Update' : 'Create'} Customer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerCRM;
