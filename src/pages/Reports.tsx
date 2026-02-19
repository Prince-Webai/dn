

import { BarChart2, TrendingUp, Users, Wrench, AlertCircle, FilePlus } from 'lucide-react';

const Reports = () => {
    const reportOptions = [
        { icon: BarChart2, title: 'Revenue Report', desc: 'Monthly & annual revenue analysis', color: 'bg-blue-100 text-blue-600' },
        { icon: TrendingUp, title: 'Parts Usage', desc: 'Inventory turnover & trends', color: 'bg-emerald-100 text-emerald-600' },
        { icon: Users, title: 'Customer Spend', desc: 'Top customers & loyalty', color: 'bg-purple-100 text-purple-600' },
        { icon: Wrench, title: 'Engineer Performance', desc: 'Job completion & efficiency', color: 'bg-orange-100 text-orange-600' },
        { icon: AlertCircle, title: 'Overdue Accounts', desc: 'Outstanding debtors report', color: 'bg-red-100 text-red-600' },
        { icon: FilePlus, title: 'Custom Report', desc: 'Build your own analytics', color: 'bg-slate-100 text-slate-600' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-slate-900">Analytics & Reports</h1>
                <p className="text-slate-500">View performance metrics and generate reports</p>
            </div>

            <div className="section-card p-8 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reportOptions.map((option, index) => {
                        const Icon = option.icon;
                        return (
                            <div key={index} className="flex gap-4 p-6 rounded-xl border border-slate-100 hover:border-delaval-blue/30 hover:shadow-md transition-all cursor-pointer bg-white group">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${option.color} group-hover:scale-110 transition-transform`}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-delaval-blue transition-colors">{option.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{option.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Reports;
