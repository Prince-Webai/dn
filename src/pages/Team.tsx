import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Mail, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';

interface Engineer {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: 'active' | 'inactive';
}

const Team = () => {
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchEngineers();
    }, []);

    const fetchEngineers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('engineers')
                .select('*')
                .order('name');

            if (error) throw error;
            setEngineers(data || []);
        } catch (error) {
            console.error('Error fetching engineers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEngineer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('engineers')
                    .update(newEngineer)
                    .eq('id', editingId);

                if (error) throw error;

                setEngineers(engineers.map(eng => eng.id === editingId ? { ...eng, ...newEngineer } : eng));
            } else {
                // Create new
                const { data, error } = await supabase
                    .from('engineers')
                    .insert([newEngineer])
                    .select();

                if (error) throw error;
                if (data) setEngineers([...engineers, data[0]]);
            }

            setIsModalOpen(false);
            setEditingId(null);
            setNewEngineer({ name: '', email: '', phone: '', role: 'Engineer', status: 'active' });

        } catch (error: any) {
            console.error('Error saving engineer:', error);
            alert(`Failed to save: ${error.message}`);
        }
    };

    const handleEditClick = (eng: Engineer) => {
        setNewEngineer({
            name: eng.name,
            email: eng.email,
            phone: eng.phone,
            role: eng.role,
            status: eng.status
        });
        setEditingId(eng.id);
        setIsModalOpen(true);
    };

    const handleDeleteEngineer = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this team member?')) return;

        try {
            const { error } = await supabase.from('engineers').delete().eq('id', id);
            if (error) throw error;
            setEngineers(engineers.filter(eng => eng.id !== id));
        } catch (error: any) {
            console.error('Error deleting engineer:', error);
            alert(`Failed to delete: ${error.message}`);
        }
    };

    const filteredEngineers = engineers.filter(eng =>
        eng.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eng.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Team Management</h1>
                    <p className="text-slate-500">Manage engineers and staff members</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setNewEngineer({ name: '', email: '', phone: '', role: 'Engineer', status: 'active' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-delaval-blue hover:bg-delaval-dark-blue text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20"
                >
                    <Plus size={20} /> Add Member
                </button>
            </div>

            <div className="section-card p-6">
                <div className="relative mb-6 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search team members..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-12 text-center text-slate-500">Loading team...</div>
                    ) : filteredEngineers.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400 italic">No team members found. Add one to get started.</div>
                    ) : (
                        filteredEngineers.map(eng => (
                            <div key={eng.id} className="stat-card group relative hover:border-delaval-blue transition-colors">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-blue-50 text-delaval-blue rounded-full flex items-center justify-center font-bold text-xl">
                                        {eng.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${eng.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {eng.role}
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">{eng.name}</h3>
                                <div className="space-y-2 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} /> {eng.email || 'No email'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} /> {eng.phone || 'No phone'}
                                    </div>
                                </div>

                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(eng); }}
                                        className="p-2 text-slate-300 hover:text-delaval-blue transition-colors"
                                        title="Edit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteEngineer(eng.id); }}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Team Member" : "Add Team Member"}>
                <form onSubmit={handleSaveEngineer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input required type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                            value={newEngineer.name} onChange={e => setNewEngineer({ ...newEngineer, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <select className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                            value={newEngineer.role} onChange={e => setNewEngineer({ ...newEngineer, role: e.target.value })}>
                            <option value="Engineer">Engineer</option>
                            <option value="Senior Engineer">Senior Engineer</option>
                            <option value="Admin">Admin</option>
                            <option value="Office Staff">Office Staff</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                            value={newEngineer.email} onChange={e => setNewEngineer({ ...newEngineer, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 outline-none"
                            value={newEngineer.phone} onChange={e => setNewEngineer({ ...newEngineer, phone: e.target.value })} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-delaval-blue text-white rounded-lg font-bold hover:bg-delaval-dark-blue">Save Member</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Team;
