import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, Package, Wrench, ArrowRight, Command } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Job, Customer, InventoryItem } from '../types';
import { supabase } from '../lib/supabase';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{
        jobs: Job[];
        customers: Customer[];
        inventory: InventoryItem[];
    }>({ jobs: [], customers: [], inventory: [] });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (isOpen) onClose();
                else onClose(); // This is handled by parent, but just to be safe
            }
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
        }
    }, [isOpen]);

    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults({ jobs: [], customers: [], inventory: [] });
                return;
            }

            const lowerQuery = query.toLowerCase();
            
            // In a real app, we might do this on the server
            const [jobs, customers, inventory] = await Promise.all([
                dataService.getJobs(),
                supabase.from('customers').select('*').ilike('name', `%${query}%`),
                dataService.getInventory()
            ]);

            const filteredJobs = (jobs || []).filter(j => 
                j.job_number.toString().includes(query) || 
                j.service_type?.toLowerCase().includes(lowerQuery) ||
                j.customers?.name?.toLowerCase().includes(lowerQuery)
            ).slice(0, 5);

            const filteredCustomers = (customers.data || []).slice(0, 5);

            const filteredInventory = (inventory || []).filter(i => 
                i.name.toLowerCase().includes(lowerQuery) || 
                i.sku?.toLowerCase().includes(lowerQuery)
            ).slice(0, 5);

            setResults({
                jobs: filteredJobs,
                customers: filteredCustomers,
                inventory: filteredInventory
            });
            setSelectedIndex(0);
        };

        const timer = setTimeout(search, 200);
        return () => clearTimeout(timer);
    }, [query]);

    const flattenedResults = [
        ...results.jobs.map(j => ({ type: 'job', id: j.id, label: `Job #${j.job_number}: ${j.service_type}`, icon: Wrench, path: `/jobs/${j.id}` })),
        ...results.customers.map(c => ({ type: 'customer', id: c.id, label: `Customer: ${c.name}`, icon: Users, path: `/customers` })), // Ideally Job link or specific customer view
        ...results.inventory.map(i => ({ type: 'inventory', id: i.id, label: `Part: ${i.name} (${i.sku})`, icon: Package, path: `/inventory` }))
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % flattenedResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + flattenedResults.length) % flattenedResults.length);
        } else if (e.key === 'Enter') {
            if (flattenedResults[selectedIndex]) {
                navigate(flattenedResults[selectedIndex].path);
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full pl-14 pr-20 py-5 text-lg border-b border-slate-100 focus:outline-none text-slate-800 placeholder-slate-400"
                        placeholder="Search jobs, customers, parts..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <Command size={10} /> K
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {query && flattenedResults.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            No results found for "{query}"
                        </div>
                    ) : !query ? (
                        <div className="p-4">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Quick Navigation</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Go to Dashboard', path: '/', icon: FileText },
                                    { label: 'View All Jobs', path: '/jobs', icon: Wrench },
                                    { label: 'Customer CRM', path: '/customers', icon: Users },
                                    { label: 'Parts Inventory', path: '/inventory', icon: Package },
                                ].map((nav, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { navigate(nav.path); onClose(); }}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-colors border border-slate-100"
                                    >
                                        <nav.icon size={18} className="text-delaval-blue" />
                                        {nav.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {flattenedResults.map((result, index) => {
                                const Icon = result.icon;
                                return (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => { navigate(result.path); onClose(); }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-150 ${selectedIndex === index ? 'bg-delaval-blue text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedIndex === index ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-sm leading-tight">{result.label}</div>
                                                <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${selectedIndex === index ? 'text-white/60' : 'text-slate-400'}`}>
                                                    {result.type}
                                                </div>
                                            </div>
                                        </div>
                                        {selectedIndex === index && <ArrowRight size={18} className="animate-in slide-in-from-left-2" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↵</span> Select</div>
                        <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑↓</span> Navigate</div>
                        <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">ESC</span> Close</div>
                    </div>
                    <div>Tony Condon Dairy Services</div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
