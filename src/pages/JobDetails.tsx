import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileText, Wrench, Clock, Package, Receipt, CheckCircle, Camera, X, Image as ImageIcon } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { supabase } from '../lib/supabase';
import { Job, JobItem, InventoryItem, ReportState } from '../types';
import { generateJobReport } from '../lib/pdfGenerator';
import { MilkingMachineTestReport } from '../components/forms/MilkingMachineTestReport';
import { dataService } from '../services/dataService';
const JobDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [items, setItems] = useState<JobItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newItem, setNewItem] = useState({
        description: '',
        quantity: 1,
        unit_price: 0,
        type: 'part' as 'part' | 'labor',
        inventory_id: undefined as string | undefined
    });

    useEffect(() => {
        if (id) {
            fetchJobDetails();
            fetchJobItems();
            fetchInventory();
            fetchAttachments();
        }
    }, [id]);

    const fetchAttachments = async () => {
        if (!id) return;
        const res = await dataService.getJobAttachments(id);
        setAttachments(res);
    };

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
            const { total, ...itemWithoutTotal } = newItem as any;
            const itemToInsert = { ...itemWithoutTotal, job_id: id };

            const { data, error } = await dataService.addJobItem(itemToInsert);

            if (error) throw error;
            if (data) {
                setItems([...items, data]);
                setNewItem({ description: '', quantity: 1, unit_price: 0, type: 'part', inventory_id: undefined });
            }
        } catch (error: any) {
            alert('Error adding item: ' + error.message);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        const { error } = await dataService.deleteJobItem(itemId);
        if (!error) setItems(items.filter(i => i.id !== itemId));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !id) return;
        
        setIsUploading(true);
        try {
            const file = e.target.files[0];
            const { data, error } = await dataService.uploadJobAttachment(id, file);
            if (error) throw error;
            if (data) setAttachments([data, ...attachments]);
        } catch (error: any) {
            alert('Upload failed: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId: string, url: string) => {
        if (!confirm('Are you sure you want to delete this photo?')) return;
        const { error } = await dataService.deleteJobAttachment(attachmentId, url);
        if (!error) setAttachments(attachments.filter(a => a.id !== attachmentId));
    };

    const generatePDF = async () => {
        if (!job) return;
        try {
            await generateJobReport(job, job.customers as any, items);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const [mobileTab, setMobileTab] = useState<'details' | 'parts' | 'labor' | 'reports' | 'photos'>('details');
    const [desktopTab, setDesktopTab] = useState<'items' | 'reports'>('items');

    if (!job) return <div className="p-8">Loading...</div>;

    const partsItems = items.filter(i => i.type === 'part');
    const laborItems = items.filter(i => i.type === 'labor' || i.type === 'service');
    const totalPartsCost = partsItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalLaborCost = laborItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    if (isGeneratingReport && job) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-y-auto">
                <MilkingMachineTestReport
                    job={job}
                    customer={job.customers}
                    onSubmit={async (reportData: ReportState) => {
                        const { error } = await supabase
                            .from('service_reports')
                            .insert({
                                job_id: job.id,
                                customer_id: job.customer_id,
                                report_data: reportData,
                                tester: reportData.tester,
                                test_date: reportData.date || null,
                                machine_make: reportData.machineMake || null,
                            });
                        if (error) {
                            alert('Error saving report: ' + error.message);
                        } else {
                            setIsGeneratingReport(false);
                        }
                    }}
                    onCancel={() => setIsGeneratingReport(false)}
                />
            </div>
        );
    }

    return (
        <>
            {/* Desktop View */}
            <div className="hidden md:block space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/jobs')} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold font-display text-slate-900">Job #{job.job_number}</h1>
                        <p className="text-slate-500">{job.customers?.name}</p>
                    </div>
                    <div className="ml-auto flex gap-3">
                        {job.status === 'completed' && (
                            <button onClick={() => navigate(`/invoices/builder?jobId=${job.id}`)} className="flex items-center gap-2 bg-delaval-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold shadow-sm">
                                <Receipt size={18} /> Convert to Invoice
                            </button>
                        )}
                        <button onClick={generatePDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold shadow-sm">
                            <FileText size={18} /> Generate PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="section-card p-6">
                            <div className="flex items-center gap-4 mb-4 border-b border-slate-200">
                                <button
                                    onClick={() => setDesktopTab('items')}
                                    className={`py-2 px-1 font-bold text-sm border-b-2 transition-colors ${desktopTab === 'items' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    Service Items
                                </button>
                                <button
                                    onClick={() => setDesktopTab('reports')}
                                    className={`py-2 px-1 font-bold text-sm border-b-2 transition-colors ${desktopTab === 'reports' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    Service Reports
                                </button>
                                <button
                                    onClick={() => setDesktopTab('photos' as any)}
                                    className={`py-2 px-1 font-bold text-sm border-b-2 transition-colors ${desktopTab === ('photos' as any) ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    Photos & Attachments
                                </button>
                            </div>

                            {desktopTab === 'items' && (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-2">Description</th>
                                                    <th className="px-4 py-2">Qty</th>
                                                    <th className="px-4 py-2">Cost</th>
                                                    {job.status !== 'completed' && <th className="px-4 py-2">Action</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map(item => (
                                                    <tr key={item.id} className="border-t border-slate-100">
                                                        <td className="px-4 py-3">{item.description}</td>
                                                        <td className="px-4 py-3">{item.quantity}</td>
                                                        <td className="px-4 py-3">€{item.unit_price}</td>
                                                        {job.status !== 'completed' && (
                                                            <td className="px-4 py-3">
                                                                <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {job.status !== 'completed' && (
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
                                                                    type: 'part',
                                                                    inventory_id: item.id
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
                                                <div className="w-24">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Qty</label>
                                                    <select
                                                        className="w-full p-2.5 border rounded-lg bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                                        value={newItem.quantity}
                                                        onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                                    >
                                                        {[...Array(20)].map((_, i) => (
                                                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                        ))}
                                                    </select>
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
                                    )}
                                </>
                            )}

                            {desktopTab === 'reports' && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-delaval-blue" />
                                                Service Reports
                                            </h2>
                                            <p className="text-sm text-slate-500 mt-1">Generate and view test reports</p>
                                        </div>
                                        <button
                                            onClick={() => setIsGeneratingReport(true)}
                                            className="bg-delaval-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            New Report
                                        </button>
                                    </div>
                                    <div className="p-12 text-center text-slate-500">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <p className="font-medium text-slate-700">No reports generated yet</p>
                                        <p className="text-sm mt-1">Click the button above to create a new IMQCS Test Report.</p>
                                    </div>
                                </div>
                            )}

                            {desktopTab === ('photos' as any) && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-slate-800">Field Photos</h2>
                                        <label className="cursor-pointer bg-delaval-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                                            <Camera size={18} />
                                            {isUploading ? 'Uploading...' : 'Upload Photo'}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                        </label>
                                    </div>

                                    {attachments.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                            <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                                            <p className="font-medium">No photos attached to this job.</p>
                                            <p className="text-sm">Upload photos of the site, machinery, or issues.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {attachments.map((att) => (
                                                <div key={att.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                                    <img src={att.file_url} className="w-full h-full object-cover" alt={att.file_name} />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                        <button 
                                                            onClick={() => window.open(att.file_url, '_blank')}
                                                            className="p-2 bg-white text-slate-900 rounded-lg hover:scale-110 transition-transform"
                                                        >
                                                            <ImageIcon size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteAttachment(att.id, att.file_url)}
                                                            className="p-2 bg-red-600 text-white rounded-lg hover:scale-110 transition-transform"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {desktopTab === 'reports' && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-delaval-blue" />
                                                Service Reports
                                            </h2>
                                            <p className="text-sm text-slate-500 mt-1">Generate and view test reports</p>
                                        </div>
                                        <button
                                            onClick={() => setIsGeneratingReport(true)}
                                            className="bg-delaval-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            New Report
                                        </button>
                                    </div>
                                    <div className="p-12 text-center text-slate-500">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <p className="font-medium text-slate-700">No reports generated yet</p>
                                        <p className="text-sm mt-1">Click the button above to create a new IMQCS Test Report.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="section-card p-6">
                            <h2 className="text-lg font-bold mb-4">Job Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-2">Status</label>
                                    {job.status === 'completed' ? (
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2.5 rounded-lg border border-green-200 font-medium w-full">
                                                <CheckCircle size={18} /> Completed
                                            </div>
                                            {(job as any).is_invoiced && (
                                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2.5 rounded-lg border border-blue-200 font-medium w-full">
                                                    <Receipt size={18} /> Invoiced
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <SearchableSelect
                                            label=""
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
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500">Engineer</label>
                                    <div className="text-slate-900">{job.engineer_name || 'Unassigned'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500">Scheduled Date</label>
                                    <div className="text-slate-900">{job.date_scheduled ? new Date(job.date_scheduled).toLocaleDateString() : 'Unscheduled'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500">Job Description</label>
                                    <div className="text-slate-900 bg-slate-50 p-3 rounded-lg mt-1 text-sm">{job.notes || 'No description provided.'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden pb-24 bg-[#F8FAFB] min-h-screen text-[#1a1a1a]">
                {/* Mobile Header */}
                <div className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-20 border-b border-slate-100">
                    <button onClick={() => navigate('/jobs')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold font-display text-slate-900 truncate flex-1 text-center mr-8">
                        {job.customers?.name || `Job #${job.job_number}`}
                    </h1>
                </div>

                {/* Mobile Content */}
                <div className="p-4 space-y-6">
                    {/* Customer & Job Info Header */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-delaval-blue text-white rounded-xl flex items-center justify-center text-xl font-bold">
                            {job.customers?.name?.substring(0, 2).toUpperCase() || 'JB'}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">{job.customers?.name}</h2>
                            <p className="text-sm text-slate-500">{job.customers?.address?.split(',')[0]}, {job.customers?.address?.split(',').pop()?.trim()}</p>
                            <p className="text-sm text-delaval-blue font-medium mt-0.5">
                                📞 {job.customers?.phone || 'No phone'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Update */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Status</label>
                    {
                        job.status === 'completed' ? (
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-3 rounded-lg border border-green-200 font-bold">
                                <CheckCircle size={18} /> Completed
                            </div>
                        ) : (
                            <SearchableSelect
                                label=""
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
                            />
                        )
                    }
                </div>

                {/* Equipment Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</h3>
                    </div>
                    <div className="p-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-sm text-slate-500">Machine</span>
                            <span className="text-sm font-bold text-slate-900 text-right">DeLaval VMS V300</span> {/* Hardcoded mock data matching design */}
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-sm text-slate-500">Serial</span>
                            <span className="text-sm font-bold text-slate-900 text-right">VMS-2019-00412</span> {/* Hardcoded mock data matching design */}
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-slate-500">Installed</span>
                            <span className="text-sm font-bold text-slate-900 text-right">Mar 2025</span> {/* Hardcoded mock data matching design */}
                        </div>
                    </div>
                </div>

                {/* Service Tabs */}
                <div className="flex border-b border-slate-200 sticky top-[64px] bg-[#F8FAFB] z-10 pt-2 px-4">
                    <button
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'details' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500'}`}
                        onClick={() => setMobileTab('details')}
                    >
                        DETAILS
                    </button>
                    <button
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'parts' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500'}`}
                        onClick={() => setMobileTab('parts')}
                    >
                        PARTS
                    </button>
                    <button
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'labor' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500'}`}
                        onClick={() => setMobileTab('labor')}
                    >
                        LABOUR
                    </button>
                    <button
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'photos' ? 'border-delaval-blue text-delaval-blue' : 'border-transparent text-slate-500'}`}
                        onClick={() => setMobileTab('photos')}
                    >
                        PHOTOS
                    </button>
                </div>

                {/* Tab Content */}
                <div className="pt-2">
                    {mobileTab === 'details' && (
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Issue Description</h3>
                                <p className="text-sm text-slate-700">{job.notes || 'No description provided.'}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Schedule &amp; Assignment</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Date</span>
                                        <span className="font-medium">{job.date_scheduled ? new Date(job.date_scheduled).toLocaleDateString() : 'Unscheduled'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Engineer</span>
                                        <span className="font-medium">{job.engineer_name || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button onClick={generatePDF} className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-sm">
                                    <FileText size={18} /> PDF Report
                                </button>
                                {job.status === 'completed' ? (
                                    <button onClick={() => navigate(`/invoices/builder?jobId=${job.id}`)} className="flex items-center justify-center gap-2 bg-delaval-blue text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-900/10">
                                        <Receipt size={18} /> Invoice
                                    </button>
                                ) : (
                                    <button className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-green-900/10">
                                        Mark Done
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {mobileTab === 'parts' && (
                        <div className="space-y-4">
                            {/* Add Part Form */}
                            {job.status !== 'completed' && (
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 space-y-3">
                                    <h3 className="text-sm font-bold text-slate-900">Add Part</h3>
                                    <SearchableSelect
                                        label=""
                                        options={inventory.map(inv => ({ value: inv.id, label: `${inv.name} (€${inv.sell_price})` }))}
                                        value=""
                                        onChange={(val) => {
                                            const item = inventory.find(i => i.id === val);
                                            if (item) {
                                                setNewItem({
                                                    ...newItem,
                                                    description: item.name,
                                                    unit_price: item.sell_price,
                                                    type: 'part',
                                                    inventory_id: item.id
                                                });
                                            }
                                        }}
                                        placeholder="Search parts catalog..."
                                    />
                                    <div className="flex gap-3 pt-2">
                                        <div className="w-1/3">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Qty</label>
                                            <select
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                                value={newItem.quantity}
                                                onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                            >
                                                {[...Array(20)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-1/3">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Price (€)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                                value={newItem.unit_price}
                                                onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="w-1/3 flex items-end">
                                            <button
                                                onClick={() => {
                                                    setNewItem(prev => ({ ...prev, type: 'part' }));
                                                    handleAddItem();
                                                }}
                                                className="w-full bg-delaval-blue text-white p-2.5 rounded-lg flex items-center justify-center hover:bg-delaval-dark-blue h-[42px]"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Parts List */}
                            <div className="flex justify-between items-center px-1 mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Used Parts ({partsItems.length})</span>
                                <span className="text-sm font-bold text-slate-900">Total: €{totalPartsCost.toFixed(2)}</span>
                            </div>
                            <div className="space-y-3">
                                {partsItems.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4 bg-white rounded-xl border border-slate-100">No parts added yet.</p>
                                ) : (
                                    partsItems.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{item.description}</div>
                                                <div className="text-sm text-slate-500 mt-0.5">Qty {item.quantity} × €{item.unit_price}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-slate-900">€{(item.quantity * item.unit_price).toFixed(2)}</span>
                                                {job.status !== 'completed' && (
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 p-2">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {mobileTab === 'labor' && (
                        <div className="space-y-4">
                            {/* Add Labor Form */}
                            {job.status !== 'completed' && (
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 space-y-3">
                                    <h3 className="text-sm font-bold text-slate-900">Add Time/Labour</h3>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                                        <input
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                            placeholder="e.g. Travel time, Service hours..."
                                            value={newItem.description}
                                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <div className="w-1/3">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Hours</label>
                                            <select
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-delaval-blue/20"
                                                value={newItem.quantity}
                                                onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                            >
                                                {[...Array(12)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1} hr</option>
                                                ))}
                                                <option value={0.5}>0.5 hr</option>
                                            </select>
                                        </div>
                                        <div className="w-1/3">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Rate (€)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                                value={newItem.unit_price}
                                                onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="w-1/3 flex items-end">
                                            <button
                                                onClick={() => {
                                                    setNewItem(prev => ({ ...prev, type: 'labor' }));
                                                    handleAddItem();
                                                }}
                                                className="w-full bg-delaval-blue text-white p-2.5 rounded-lg flex items-center justify-center hover:bg-delaval-dark-blue h-[42px]"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Labor List */}
                            <div className="flex justify-between items-center px-1 mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Labour Log ({laborItems.length})</span>
                                <span className="text-sm font-bold text-slate-900">Total: €{totalLaborCost.toFixed(2)}</span>
                            </div>
                            <div className="space-y-3">
                                {laborItems.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4 bg-white rounded-xl border border-slate-100">No time added yet.</p>
                                ) : (
                                    laborItems.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{item.description}</div>
                                                <div className="text-sm text-slate-500 mt-0.5">{item.quantity} hrs @ €{item.unit_price}/hr</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-slate-900">€{(item.quantity * item.unit_price).toFixed(2)}</span>
                                                {job.status !== 'completed' && (
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 p-2">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {(mobileTab as string) === 'photos' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Photos ({attachments.length})</span>
                                <label className="cursor-pointer text-delaval-blue font-bold text-sm flex items-center gap-1">
                                    <Plus size={16} /> Add Photo
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                </label>
                            </div>

                            {isUploading && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-delaval-blue text-sm font-bold flex items-center gap-3 animate-pulse">
                                    <div className="w-5 h-5 border-2 border-delaval-blue border-t-transparent rounded-full animate-spin" />
                                    Uploading photo...
                                </div>
                            )}

                            {attachments.length === 0 && !isUploading ? (
                                <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-100 italic">
                                    No photos captured.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {attachments.map((att) => (
                                        <div key={att.id} className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                            <img src={att.file_url} className="w-full h-full object-cover" alt={att.file_name} onClick={() => window.open(att.file_url, '_blank')} />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id, att.file_url); }}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg backdrop-blur"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default JobDetails;
