
import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { BarChart2, TrendingUp, Users, Euro, Package, Calendar } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Invoice, Job, InventoryItem } from '../types';

interface RevenueData {
    name: string;
    revenue: number;
    target: number;
}

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [jobStatusData, setJobStatusData] = useState<any[]>([]);
    const [inventoryValue, setInventoryValue] = useState(0);
    const [topCustomers, setTopCustomers] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const [invoices, jobs, inventory] = await Promise.all([
                dataService.getInvoices(),
                dataService.getJobs(),
                dataService.getInventory()
            ]);

            processRevenueData(invoices);
            processJobStatusData(jobs);
            processInventoryData(inventory);
            processTopCustomers(invoices);

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const processRevenueData = (invoices: Invoice[]) => {
        // Group by Month (Last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const last6Months: RevenueData[] = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(currentMonth - i);
            last6Months.push({
                name: months[d.getMonth()],
                revenue: 0,
                target: 5000 // Mock target
            });
        }

        invoices.forEach(inv => {
            if (inv.status !== 'void' && inv.date_issued) {
                const date = new Date(inv.date_issued);
                const monthName = months[date.getMonth()];
                const monthData = last6Months.find(m => m.name === monthName);
                if (monthData) {
                    monthData.revenue += (inv.total_amount || 0);
                }
            }
        });

        setRevenueData(last6Months);
    };

    const processJobStatusData = (jobs: Job[]) => {
        const statusCounts: Record<string, number> = {};
        jobs.forEach(j => {
            statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
        });

        const data = Object.keys(statusCounts).map(status => ({
            name: status.replace('_', ' ').toUpperCase(),
            value: statusCounts[status]
        }));

        setJobStatusData(data);
    };

    const processInventoryData = (inventory: InventoryItem[]) => {
        const total = inventory.reduce((acc, item) => acc + (item.stock_level * item.cost_price), 0);
        setInventoryValue(total);
    };

    const processTopCustomers = (invoices: Invoice[]) => {
        const customerSpend: Record<string, number> = {};
        invoices.forEach(inv => {
            if ((inv as any).customers) {
                const name = (inv as any).customers.name;
                customerSpend[name] = (customerSpend[name] || 0) + (inv.total_amount || 0);
            }
        });

        const sorted = Object.entries(customerSpend)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        setTopCustomers(sorted);
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-delaval-blue/30 border-t-delaval-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-slate-900">Analytics & Reports</h1>
                <p className="text-slate-500">Overview of business performance and metrics</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Inventory Value</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">€{inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                        <Package size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Top Customer</p>
                        <h3 className="text-xl font-bold text-slate-900 mt-1">{topCustomers[0]?.name || 'N/A'}</h3>
                        <p className="text-xs text-green-600 font-medium">€{topCustomers[0]?.value?.toLocaleString() || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Revenue (Last 6M)</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">
                            €{revenueData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart2 size={20} className="text-slate-400" />
                        Revenue Trends
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `€${value}`} />
                                <RechartsTooltip
                                    formatter={(value: any) => [`€${Number(value).toLocaleString()}`, 'Revenue']}
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="revenue" fill="#0051A5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Job Status Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-slate-400" />
                        Job Status Distribution
                    </h3>
                    <div className="h-80 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={jobStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {jobStatusData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Customers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Euro size={20} className="text-slate-400" />
                        Top Customers by Spend
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Total Spend</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Contribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topCustomers.map((customer, index) => {
                                const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.revenue, 0);
                                const percentage = totalRevenue > 0 ? (customer.value / totalRevenue) * 100 : 0;

                                return (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{customer.name}</td>
                                        <td className="px-6 py-4 text-slate-600 text-right">€{customer.value.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-xs text-slate-500">{percentage.toFixed(1)}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-delaval-blue" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
