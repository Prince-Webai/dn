import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileText, Wrench, Clock, Package } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { supabase } from '../lib/supabase';
import { Job, JobItem, InventoryItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const JobDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [items, setItems] = useState<JobItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [newItem, setNewItem] = useState({
        description: '',
        quantity: 1,
        unit_price: 0,
        type: 'part' as 'part' | 'labor'
    });

    useEffect(() => {
        if (id) {
            fetchJobDetails();
            fetchJobItems();
            fetchInventory();
        }
    }, [id]);

    const fetchJobDetails = async () => {
        const { data, error } = await supabase
            .from('jobs')
            .select('*, customers(*)')
            .eq('id', id)
            .single();

        if (error) console.error('Error fetching job:', error);
        else setJob(data);
    };

    const fetchJobItems = async () => {
        const { data, error } = await supabase
            .from('job_items')
            .select('*')
            .eq('job_id', id);

        if (error) console.error('Error fetching items:', error);
        else setItems(data || []);
    };

    const fetchInventory = async () => {
        const { data } = await supabase.from('inventory').select('*').order('name');
        setInventory(data || []);
    };

    const handleAddItem = async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('job_items')
                .insert([{ ...newItem, job_id: id }])
                .select();

            if (error) throw error;
            if (data) {
                setItems([...items, data[0]]);
                setNewItem({ description: '', quantity: 1, unit_price: 0, type: 'part' });
            }
        } catch (error: any) {
            alert('Error adding item: ' + error.message);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        const { error } = await supabase.from('job_items').delete().eq('id', itemId);
        if (!error) setItems(items.filter(i => i.id !== itemId));
    };

    const generatePDF = () => {
        if (!job) return;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.text('Condon Dairy Services', 14, 20);
        doc.setFontSize(12);
        doc.text('Job Service Report', 14, 30);

        doc.text(`Job #: ${job.job_number}`, 14, 45);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 52);
        doc.text(`Customer: ${job.customers?.name || 'N/A'}`, 14, 59);
        doc.text(`Engineer: ${job.engineer_name || 'N/A'}`, 14, 66);

        // Table
        const tableData = items.map(item => [
            item.description,
            item.quantity.toString(),
            item.type.toUpperCase()
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['Description', 'Qty', 'Type']],
            body: tableData,
        });

        // Footer / Signature
        const finalY = (doc as any).lastAutoTable.finalY || 75;
        doc.text('Engineer Signature:', 14, finalY + 30);
        doc.line(14, finalY + 45, 100, finalY + 45);

        doc.text('Customer Signature:', 120, finalY + 30);
        doc.line(120, finalY + 45, 200, finalY + 45);

        doc.save(`ServiceReport_Job_${job.job_number}.pdf`);
    };

    if (!job) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/jobs')} className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft />
                </button>
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Job #{job.job_number}</h1>
                    <p className="text-slate-500">{job.customers?.name}</p>
                </div>
                <div className="ml-auto">
                    <button onClick={generatePDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                        <FileText size={18} /> Generate Report PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="section-card p-6">
                        <h2 className="text-lg font-bold mb-4">Service Items</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2">Description</th>
                                        <th className="px-4 py-2">Qty</th>
                                        <th className="px-4 py-2">Cost</th>
                                        <th className="px-4 py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id} className="border-t border-slate-100">
                                            <td className="px-4 py-3">{item.description}</td>
                                            <td className="px-4 py-3">{item.quantity}</td>
                                            <td className="px-4 py-3">€{item.unit_price}</td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 bg-slate-50 p-4 rounded-lg space-y-3">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <SearchableSelect
                                        label="Add Code / Product"
                                        options={inventory.map(inv => ({ value: inv.id, label: `${inv.name} (€${inv.sell_price})` }))}
                                        value=""
                                        onChange={(val) => {
                                            const item = inventory.find(i => i.id === val);
                                            if (item) {
                                                setNewItem({
                                                    ...newItem,
                                                    description: item.name,
                                                    unit_price: item.sell_price,
                                                    type: 'part'
                                                });
                                            }
                                        }}
                                        placeholder="Select generic product..."
                                        icon={<Package size={16} />}
                                    />
                                </div>
                                <div className="w-1/3">
                                    <SearchableSelect
                                        label="Type"
                                        searchable={false}
                                        options={[
                                            { value: 'part', label: 'Part' },
                                            { value: 'labor', label: 'Labor' },
                                            { value: 'service', label: 'Service' }
                                        ]}
                                        value={newItem.type}
                                        onChange={(val) => setNewItem({ ...newItem, type: val as any })}
                                        icon={<Clock size={16} />}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                                    <input
                                        className="w-full p-2 border rounded"
                                        placeholder="Item description or service details..."
                                        value={newItem.description}
                                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Qty</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded"
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cost (€)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded"
                                        value={newItem.unit_price}
                                        onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                                    />
                                </div>
                                <button onClick={handleAddItem} className="bg-delaval-blue text-white p-2.5 rounded hover:bg-delaval-dark-blue">
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="section-card p-6">
                        <h2 className="text-lg font-bold mb-4">Job Details</h2>
                        <div className="space-y-4">
                            <div>
                                <SearchableSelect
                                    label="Status"
                                    searchable={false}
                                    options={[
                                        { value: 'scheduled', label: 'Scheduled' },
                                        { value: 'in_progress', label: 'In Progress' },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'cancelled', label: 'Cancelled' }
                                    ]}
                                    value={job.status}
                                    onChange={async (newStatus) => {
                                        const { error } = await supabase
                                            .from('jobs')
                                            .update({ status: newStatus })
                                            .eq('id', job.id);

                                        if (!error) {
                                            setJob({ ...job, status: newStatus as any });
                                        }
                                    }}
                                    icon={<Wrench size={16} />}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500">Engineer</label>
                                <div className="text-slate-900">{job.engineer_name || 'Unassigned'}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500">Scheduled Date</label>
                                <div className="text-slate-900">{job.date_scheduled}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500">Notes</label>
                                <div className="text-slate-900 text-sm bg-slate-50 p-3 rounded">{job.notes || 'No notes'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;
