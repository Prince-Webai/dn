
import React, { useState } from 'react';
import { Plus, CreditCard, Search } from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const Payments = () => {
    const { showToast } = useToast();
    const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

    // Mock Data based on prototype
    const [payments] = useState([
        { id: 'PAY-2025-198', customer: 'Kelly Cattle Co', invoice: 'INV-2025-039', date: 'Jan 28, 2025', method: 'Bank Transfer', amount: 2840, status: 'Cleared' },
        { id: 'PAY-2025-197', customer: 'Murphy Farm Ltd', invoice: 'INV-2025-038', date: 'Jan 26, 2025', method: 'Cheque', amount: 3650, status: 'Pending' },
    ]);

    const handleRecordPayment = (e: React.FormEvent) => {
        e.preventDefault();
        showToast('Payment Recorded', 'Payment has been successfully recorded.', 'success');
        setIsRecordPaymentOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Payment Records</h1>
                    <p className="text-slate-500">Track incoming payments and transactions</p>
                </div>
                <button
                    onClick={() => setIsRecordPaymentOpen(true)}
                    className="btn btn-primary shadow-lg shadow-blue-900/20"
                >
                    <Plus size={20} className="mr-2" /> Record Payment
                </button>
            </div>

            <div className="section-card">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">Recent Payments</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search payments..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-delaval-blue/20"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900">{payment.id}</td>
                                    <td className="px-6 py-4 font-medium text-slate-700">{payment.customer}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{payment.invoice}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{payment.date}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{payment.method}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">€{payment.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase
                                            ${payment.status === 'Cleared' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Payment Modal */}
            <Modal isOpen={isRecordPaymentOpen} onClose={() => setIsRecordPaymentOpen(false)} title="Record Payment">
                <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div className="form-group">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Customer *</label>
                        <select className="form-select w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none">
                            <option>Select customer...</option>
                            <option>Murphy Farm Ltd</option>
                            <option>Kelly Cattle Co</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Invoice Reference</label>
                        <select className="form-select w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none">
                            <option>Select invoice...</option>
                            <option>INV-2025-039 (€2,840)</option>
                            <option>INV-2025-038 (€3,650)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date *</label>
                            <input type="date" className="form-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" required />
                        </div>
                        <div className="form-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Amount (€) *</label>
                            <input type="number" step="0.01" className="form-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none" required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Payment Method *</label>
                        <select className="form-select w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-delaval-blue/20 outline-none">
                            <option>Bank Transfer</option>
                            <option>Cheque</option>
                            <option>Cash</option>
                            <option>Credit Card</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsRecordPaymentOpen(false)} className="btn btn-secondary px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="btn btn-primary px-4 py-2 bg-delaval-blue text-white rounded-lg hover:bg-delaval-dark-blue">Record Payment</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Payments;
