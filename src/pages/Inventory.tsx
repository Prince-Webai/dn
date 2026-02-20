
import React, { useEffect, useState } from 'react';
import { Plus, Search, Package, CheckCircle, Clock, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { InventoryItem } from '../types';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const Inventory = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'inventory' | 'allocation'>('inventory');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        sku: '',
        name: '',
        category: '',
        cost_price: 0,
        sell_price: 0,
        stock_level: 0,
        location: ''
    });
    const [allocations, setAllocations] = useState<any[]>([]);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isNewCategory, setIsNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('inventory').delete().eq('id', deleteId);
            if (!error) {
                setItems(items.filter(i => i.id !== deleteId));
                setIsDeleteModalOpen(false);
                setDeleteId(null);
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditClick = (item: InventoryItem) => {
        setNewItem({
            sku: item.sku,
            name: item.name,
            category: item.category || '',
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            stock_level: item.stock_level,
            location: item.location || ''
        });
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchInventory();
        fetchAllocations();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('name');

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllocations = async () => {
        const { data, error } = await supabase
            .from('job_items')
            .select(`
                *,
                inventory(*),
                jobs (
                    *,
                    customers (name)
                )
            `)
            .eq('type', 'part')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching allocations:', error);
        else setAllocations(data || []);
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('inventory')
                    .update(newItem)
                    .eq('id', editingId);

                if (error) throw error;

                setItems(items.map(item => item.id === editingId ? { ...item, ...newItem, id: editingId } : item));
            } else {
                // Create
                const { data, error } = await supabase
                    .from('inventory')
                    .insert([newItem])
                    .select();

                if (error) throw error;

                if (data) {
                    setItems([...items, data[0]]);
                }
            }

            setIsModalOpen(false);
            setEditingId(null);
            setNewItem({
                sku: '',
                name: '',
                category: '',
                cost_price: 0,
                sell_price: 0,
                stock_level: 0,
                location: ''
            });
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Failed to save item');
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Extract unique categories from items
    const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean))) as string[];

    // Calculate Real Stats
    const totalAllocated = allocations.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = allocations.reduce((sum, item) => sum + (item.total || 0), 0);
    const activeJobsCount = new Set(allocations.filter(a => a.jobs?.status !== 'completed').map(a => a.job_id)).size;


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">
                        {activeTab === 'inventory' ? 'Parts Inventory' : 'Parts Allocation'}
                    </h1>
                    <p className="text-slate-500">
                        {activeTab === 'inventory' ? 'Manage stock levels and pricing' : 'Track parts assigned to jobs'}
                    </p>
                </div>
                {activeTab === 'inventory' ? (
                    <div className="flex gap-2">
                        <button className="btn btn-secondary">Import CSV</button>
                        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary shadow-lg shadow-blue-900/20">
                            <Plus size={20} className="mr-2" /> Add Part
                        </button>
                    </div>
                ) : (
                    <button className="btn btn-primary shadow-lg shadow-blue-900/20">
                        <span>🎯</span> <span className="ml-2">Allocate Parts</span>
                    </button>
                )}
            </div>

            {/* Category Filter + Inventory/Allocation Toggle */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="bg-white rounded-xl border border-slate-200 p-1 inline-flex">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'inventory' ? 'bg-delaval-light-blue text-delaval-blue' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Parts Inventory
                    </button>
                    <button
                        onClick={() => setActiveTab('allocation')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'allocation' ? 'bg-delaval-light-blue text-delaval-blue' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Parts Allocation
                    </button>
                </div>

                {activeTab === 'inventory' && categories.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Tag size={16} className="text-slate-400" />
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {activeTab === 'allocation' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="stat-card">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-3xl font-bold text-slate-900 mb-1">{totalAllocated}</div>
                                <div className="text-sm font-medium text-slate-500">Parts Allocated</div>
                            </div>
                            <div className="w-12 h-12 bg-[#FFF3E6] text-[#FF6B00] rounded-xl flex items-center justify-center">
                                <Package size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-3xl font-bold text-slate-900 mb-1">{activeJobsCount}</div>
                                <div className="text-sm font-medium text-slate-500">Active Jobs</div>
                            </div>
                            <div className="w-12 h-12 bg-[#E6F0FF] text-[#0051A5] rounded-xl flex items-center justify-center">
                                <Clock size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-3xl font-bold text-slate-900 mb-1">€{totalValue.toFixed(2)}</div>
                                <div className="text-sm font-medium text-slate-500">Parts Value</div>
                            </div>
                            <div className="w-12 h-12 bg-[#E6F9F3] text-[#00A862] rounded-xl flex items-center justify-center">
                                <CheckCircle size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="section-card">
                {activeTab === 'inventory' && (
                    <>
                        <div className="p-6 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search parts by name, SKU, or category..."
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU / Part No.</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Part Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cost Price</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sell Price</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Level</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Loading inventory...</td></tr>
                                    ) : filteredItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900">{item.sku}</td>
                                            <td className="px-6 py-4 font-medium text-slate-700">{item.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{item.category}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">€{item.cost_price.toFixed(2)}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">€{item.sell_price.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium mb-1">{item.stock_level} units</div>
                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${item.stock_level < 5 ? 'bg-red-500' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min(item.stock_level * 10, 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{item.location || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                {item.stock_level > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Available
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded-full">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Out of Stock
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(item);
                                                        }}
                                                        className="text-xs font-medium text-delaval-blue hover:text-delaval-dark-blue hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(item.id);
                                                        }}
                                                        className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'allocation' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F8FAFB] border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Part Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Allocated To</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Value</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allocations.length === 0 ? (
                                    <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No parts allocated yet.</td></tr>
                                ) : (
                                    allocations.map((alloc) => (
                                        <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{alloc.inventory?.sku || 'N/A'}</div>
                                                <div className="text-xs text-slate-500">{alloc.inventory?.name || alloc.description}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                                {alloc.jobs?.customers?.name || 'Unknown Customer'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                                {alloc.jobs?.job_number ? `#JOB-${alloc.jobs.job_number}` : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{alloc.quantity} units</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">€{(alloc.total || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {alloc.jobs?.date_completed
                                                    ? new Date(alloc.jobs.date_completed).toLocaleDateString()
                                                    : (alloc.jobs?.date_scheduled ? new Date(alloc.jobs.date_scheduled).toLocaleDateString() : 'N/A')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    ${alloc.jobs?.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                    {alloc.jobs?.status === 'completed' ? 'Used' : 'Reserved'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="text-slate-400 hover:text-delaval-blue transition-colors text-sm font-medium">View</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Inventory Item" : "Add Inventory Item"}>
                <form onSubmit={handleAddItem} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Part Name</label>
                            <input required type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                            <input required type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            {isNewCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="New category name"
                                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newCategoryName.trim()) {
                                                setNewItem({ ...newItem, category: newCategoryName.trim() });
                                            }
                                            setIsNewCategory(false);
                                            setNewCategoryName('');
                                        }}
                                        className="px-3 py-2 bg-delaval-blue text-white rounded-lg text-sm font-bold"
                                    >Add</button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsNewCategory(false); setNewCategoryName(''); }}
                                        className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm"
                                    >Cancel</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                        value={newItem.category}
                                        onChange={e => {
                                            if (e.target.value === '__new__') {
                                                setIsNewCategory(true);
                                            } else {
                                                setNewItem({ ...newItem, category: e.target.value });
                                            }
                                        }}
                                    >
                                        <option value="">Select category...</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__new__">➕ Create New Category</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price (€)</label>
                            <input type="number" step="0.01" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                value={newItem.cost_price} onChange={e => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sell Price (€)</label>
                            <input type="number" step="0.01" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                value={newItem.sell_price} onChange={e => setNewItem({ ...newItem, sell_price: parseFloat(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Stock Level</label>
                            <input type="number" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                value={newItem.stock_level} onChange={e => setNewItem({ ...newItem, stock_level: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                            <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                value={newItem.location} onChange={e => setNewItem({ ...newItem, location: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-delaval-blue text-white rounded-lg font-bold hover:bg-delaval-dark-blue">Save Item</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Item"
                message="Are you sure you want to delete this inventory item? This action cannot be undone."
                isDestructive={true}
                isLoading={isDeleting}
                confirmText="Delete Item"
            />
        </div>
    );
};

export default Inventory;
