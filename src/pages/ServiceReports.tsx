import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ServiceReport } from '../types';
import { ClipboardList, Eye, Loader2, FileText, CalendarDays, User, Wrench, Plus } from 'lucide-react';
import { ReportDocument } from '../components/forms/ReportDocument';
import { ReportStartModal } from '../components/forms/ReportStartModal';
import { MilkingMachineTestReport } from '../components/forms/MilkingMachineTestReport';
import { Customer, Job } from '../types';

const ServiceReports: React.FC = () => {
    const [reports, setReports] = useState<ServiceReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingReport, setViewingReport] = useState<ServiceReport | null>(null);

    // Global Creation states
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [creatingReport, setCreatingReport] = useState<{ customer: Customer, job: Job } | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('service_reports')
            .select('*, jobs(job_number, customers(name)), customers(name)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setReports(data as any);
        }
        setLoading(false);
    };

    const handleSaveReport = async (reportData: any) => {
        if (!creatingReport) return;

        try {
            const { error } = await supabase
                .from('service_reports')
                .insert([{
                    job_id: creatingReport.job.id,
                    customer_id: creatingReport.customer.id,
                    report_data: reportData,
                    tester: reportData.tester,
                    test_date: reportData.date,
                    machine_make: reportData.machineMake
                }]);

            if (error) throw error;
            setCreatingReport(null);
            fetchReports(); // Refresh the list
        } catch (err: any) {
            console.error('Failed to save report', err);
            alert('Failed to save report: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-black font-display text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-delaval-blue text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <ClipboardList size={22} className="md:w-6 md:h-6" />
                        </div>
                        Service Reports
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Professional IMQCS milking machine test logs</p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="hidden sm:inline-block text-sm text-slate-400 bg-slate-100 px-4 py-2 rounded-full font-bold">
                        {reports.length} Records
                    </span>
                    <button
                        onClick={() => setIsStartModalOpen(true)}
                        className="flex items-center gap-2 bg-delaval-blue hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={18} /> New Report
                    </button>
                </div>
            </motion.div>

            {/* Reports List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-delaval-blue animate-spin" />
                </div>
            ) : reports.length === 0 ? (
                <div className="section-card p-16 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No reports yet</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto">
                        Reports are created from within the <strong>Service Reports</strong> tab of any job.
                        Open a job and click <strong>New Report</strong> to get started.
                    </p>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="section-card overflow-hidden shadow-2xl shadow-slate-200/50 border-slate-200"
                >
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Report Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Job #</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Machine Make</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode="popLayout">
                                    {reports.map((report, idx) => (
                                        <motion.tr
                                            key={report.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group hover:bg-blue-50/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                                    <CalendarDays size={14} className="text-delaval-blue" />
                                                    {report.test_date
                                                        ? new Date(report.test_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
                                                        : new Date(report.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-black text-slate-900">
                                                        {(report as any).jobs?.customers?.name || (report as any).customers?.name || '—'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1 mt-0.5">
                                                        <User size={10} /> {report.tester || 'Tony Condon'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-600">
                                                    #{(report as any).jobs?.job_number || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                                    <Wrench size={14} className="text-slate-400" />
                                                    {report.machine_make || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setViewingReport(report)}
                                                    className="inline-flex items-center gap-2 bg-white border border-slate-200 text-delaval-blue hover:bg-delaval-blue hover:text-white hover:border-delaval-blue px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                                >
                                                    <Eye size={16} />
                                                    View Report
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {reports.map((report, idx) => (
                            <motion.div
                                key={report.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-4 flex justify-between items-center gap-3 active:bg-slate-50"
                            >
                                <div className="min-w-0">
                                    <p className="font-extrabold text-slate-900 text-sm truncate">
                                        {(report as any).jobs?.customers?.name || (report as any).customers?.name || 'Unknown Customer'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                            #{(report as any).jobs?.job_number || '—'}
                                        </span>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            {report.test_date
                                                ? new Date(report.test_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
                                                : new Date(report.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
                                            }
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-delaval-blue font-bold mt-1 uppercase tracking-tight flex items-center gap-1">
                                        <Wrench size={10} /> {report.machine_make || 'Standard Machine'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewingReport(report)}
                                    className="shrink-0 bg-blue-50 text-delaval-blue p-3 rounded-xl shadow-sm active:scale-90 transition-transform"
                                >
                                    <Eye size={18} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* View Report Document */}
            {viewingReport && (
                <ReportDocument
                    report={viewingReport.report_data}
                    job={(viewingReport as any).jobs || null}
                    customer={(viewingReport as any).jobs?.customers || (viewingReport as any).customers || null}
                    onClose={() => setViewingReport(null)}
                />
            )}

            {/* Global Creation Flow Steps */}
            <ReportStartModal
                isOpen={isStartModalOpen}
                onClose={() => setIsStartModalOpen(false)}
                onStart={(customer, job) => {
                    setIsStartModalOpen(false);
                    setCreatingReport({ customer, job });
                }}
            />

            {creatingReport && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-0 md:p-12 overflow-y-auto animate-in fade-in duration-300">
                    <div className="w-full h-full md:h-auto animate-in slide-in-from-bottom-5 duration-500">
                        <MilkingMachineTestReport
                            job={creatingReport.job}
                            customer={creatingReport.customer}
                            onSubmit={handleSaveReport}
                            onCancel={() => setCreatingReport(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceReports;
