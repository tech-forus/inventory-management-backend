import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ArrowDownLeft, ArrowUpRight, MoreHorizontal, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard from './MetricCard';
import { Metric, MovementData, CategoryData, TopProduct } from '../../constants/dashboard';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

interface DashboardViewProps {
  metrics: Metric[];
  movementData: MovementData[];
  categoryData: CategoryData[];
  topProducts: TopProduct[];
  loading?: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  movementData,
  categoryData,
  topProducts,
  loading = false
}) => {
  const navigate = useNavigate();
  const totalAssetValue = categoryData.reduce((acc, curr) => acc + curr.value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 w-full bg-slate-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22.5px] font-black leading-[1.2] tracking-tight text-slate-900">System Overview</h1>
              <Sparkles className="text-amber-400" size={18} />
            </div>
            <p className="text-[12px] leading-[1.5] text-slate-500 font-medium">Real-time inventory intelligence and operational metrics.</p>
          </div>
        </div>

        {/* Grouped Movement Control Cards with Defined Light Blue Theme */}
        <div className="bg-sky-100/50 p-[18px] sm:p-[30px] rounded-[2.625rem] border border-sky-200/70 shadow-[inset_0_2px_20px_rgba(14,165,233,0.1)] shadow-sky-900/5 relative overflow-hidden group/gate">
          {/* Subtle background decorative element */}
          <div className="absolute top-0 right-0 w-60 h-60 bg-white/40 rounded-full blur-[90px] pointer-events-none"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] sm:gap-6 relative z-10">
            <div
              onClick={() => navigate('/app/inventory/incoming')}
              className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500 p-[30px] rounded-[1.875rem] shadow-xl shadow-blue-500/10 group cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 border border-white/10"
            >
              <div className="absolute top-[-10%] right-[-5%] p-[30px] opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                <ArrowDownLeft size={165} />
              </div>
              <div className="relative z-10 flex items-center justify-center">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-[1.125rem] flex items-center justify-center border border-white/20 shadow-lg">
                    <ArrowDownLeft size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-[18px] leading-[1.2] tracking-tight">Incoming Stock</h4>
                    <p className="text-blue-50 text-[10.5px] font-bold opacity-90 uppercase tracking-[0.15em] mt-0.5 leading-[1.4]">Expected Deliveries</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate('/app/inventory/outgoing')}
              className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 p-[30px] rounded-[1.875rem] shadow-xl shadow-indigo-500/10 group cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 border border-white/10"
            >
              <div className="absolute top-[-10%] right-[-5%] p-[30px] opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
                <ArrowUpRight size={165} />
              </div>
              <div className="relative z-10 flex items-center justify-center">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-[1.125rem] flex items-center justify-center border border-white/20 shadow-lg">
                    <ArrowUpRight size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-[18px] leading-[1.2] tracking-tight">Outgoing Stock</h4>
                    <p className="text-indigo-50 text-[10.5px] font-bold opacity-90 uppercase tracking-[0.15em] mt-0.5 leading-[1.4]">Scheduled Shipments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {metrics.map((metric, idx) => (
            <MetricCard
              key={idx}
              {...metric}
              onClick={
                metric.label === 'TOTAL SKUS' ? () => navigate('/app/sku') :
                  metric.label === 'SLOW MOVING SKUS' ? () => navigate('/app/sku/analytics/slow-moving') :
                    metric.label === 'NON-MOVABLE SKUS' ? () => navigate('/app/sku/analytics/non-movable') :
                      metric.label === 'LOW STOCK ALERTS' ? () => navigate('/app/sku?stockStatus=low_stock') :
                        undefined
              }
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[30px]">
        <div className="lg:col-span-2 bg-white p-[30px] rounded-[1.875rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-[30px]">
            <div>
              <h3 className="text-[18px] font-bold leading-[1.3] text-slate-900 tracking-tight" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>Flow Analysis</h3>
              <p className="text-[10.5px] leading-[1.5] text-slate-500 font-medium mt-0.5">Revenue vs Expenses (7D)</p>
            </div>
            <div className="flex items-center gap-[9px] bg-slate-50 p-[4.5px] rounded-xl border border-slate-100">
              <button className="px-[15px] py-1.5 text-[9px] font-black text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-200 uppercase tracking-widest leading-[1.4]">Week</button>
              <button className="px-[15px] py-1.5 text-[9px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest leading-[1.4]">Month</button>
            </div>
          </div>
          <div className="h-[285px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={movementData}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9.75, fontWeight: 700 }}
                  dy={11.25}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9.75, fontWeight: 700 }}
                  domain={[0, (dataMax: number) => {
                    // Calculate max value from both datasets
                    const maxIncoming = Math.max(...movementData.map(d => d.incomingAmount || 0));
                    const maxOutgoing = Math.max(...movementData.map(d => d.outgoingAmount || 0));
                    const actualMax = Math.max(maxIncoming, maxOutgoing, dataMax);
                    
                    // If all values are 0 or very small, set a minimum scale
                    if (actualMax < 1000) {
                      return 1000;
                    }
                    
                    // Round up to nearest nice number (10k, 50k, 100k, 250k, 500k, 1M, etc.)
                    const magnitude = Math.pow(10, Math.floor(Math.log10(actualMax)));
                    const normalized = actualMax / magnitude;
                    let rounded;
                    
                    if (normalized <= 1) rounded = 1;
                    else if (normalized <= 2.5) rounded = 2.5;
                    else if (normalized <= 5) rounded = 5;
                    else rounded = 10;
                    
                    const yMax = rounded * magnitude;
                    // Add 10% padding at the top
                    return yMax * 1.1;
                  }]}
                  tickFormatter={(value: number) => {
                    if (value >= 1000000) {
                      return `₹${(value / 1000000).toFixed(1)}M`;
                    } else if (value >= 1000) {
                      return `₹${(value / 1000).toFixed(0)}k`;
                    }
                    return `₹${value.toFixed(0)}`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '15px',
                    border: 'none',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 11.25px 22.5px -3.75px rgb(0 0 0 / 0.1)',
                    fontSize: '10.5px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                  labelFormatter={(label) => `Day: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="incomingAmount"
                  name="Expenses"
                  stroke="#10b981"
                  strokeWidth={5}
                  fillOpacity={1}
                  fill="url(#colorInc)"
                />
                <Area
                  type="monotone"
                  dataKey="outgoingAmount"
                  name="Revenue"
                  stroke="#ef4444"
                  strokeWidth={5}
                  strokeDasharray="10 10"
                  fillOpacity={1}
                  fill="url(#colorOut)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-[30px] rounded-[1.875rem] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-[9px]">
            <h3 className="text-[18px] font-bold leading-[1.3] text-slate-900 tracking-tight" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>Stock Composition</h3>
            <button className="p-[9px] hover:bg-slate-50 rounded-xl transition-colors">
              <MoreHorizontal size={15} className="text-slate-400" />
            </button>
          </div>
          <p className="text-[12px] font-black leading-[1.4] text-slate-400 uppercase mb-[18px]" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>Categorical Distribution</p>

          <div className="relative flex-1 flex items-center justify-center min-h-[210px] mb-6">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-[1.4]">Total</span>
              <span className="text-[22.5px] font-black text-slate-900 tracking-tight mt-0.5 leading-[1.2]">{totalAssetValue.toLocaleString()}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 leading-[1.4]">SKUs</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={67.5}
                  outerRadius={90}
                  paddingAngle={2.25}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1200}
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 7.5px 22.5px rgba(0,0,0,0.15)',
                    fontSize: '9.75px',
                    fontWeight: 'bold'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-[9px] bg-slate-50/70 p-[18px] rounded-[1.5rem] border border-slate-100">
            {categoryData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-[10.5px] min-w-0">
                  <div className="w-[10.5px] h-[10.5px] rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-[10.5px] font-bold leading-[1.4] text-slate-600 truncate group-hover:text-slate-900 transition-colors tracking-wide">{item.name}</span>
                </div>
                <div className="flex items-center gap-[9px]">
                  <span className="text-[9px] font-black leading-[1.4] text-slate-400 w-[30px] text-right">{Math.round((item.value / totalAssetValue) * 100)}%</span>
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${(item.value / totalAssetValue) * 100}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-[30px] border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-black leading-[1.2] text-slate-900 tracking-tight">Top Performance SKUs</h3>
            <p className="text-[12px] leading-[1.4] text-slate-500 font-bold uppercase mt-1" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>MOST SELLING SKUS</p>
          </div>
          <button
            onClick={() => navigate('/app/sku/analytics/most-selling')}
            className="flex items-center gap-1.5 text-[10.5px] font-black text-indigo-600 uppercase tracking-widest hover:translate-x-1 transition-transform leading-[1.4]"
          >
            View Analytics <ArrowRight size={13.5} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-[30px] py-[18px] text-[12px] font-black leading-[1.4] text-slate-900 uppercase" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>Item Name</th>
                <th className="px-[30px] py-[18px] text-[12px] font-black leading-[1.4] text-slate-900 uppercase text-center" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>Sold Stocks</th>
                <th className="px-[30px] py-[18px] text-[12px] font-black leading-[1.4] text-slate-900 uppercase" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>Stock Health</th>
                <th className="px-[30px] py-[18px] text-[12px] font-black leading-[1.4] text-slate-900 uppercase" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((product) => (
                <tr key={product.id} className="group hover:bg-slate-50/40 transition-all cursor-pointer">
                  <td className="px-[30px] py-[21px]">
                    <div className="flex items-center gap-[15px]">
                      <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center text-[13.5px] font-black shadow-sm ${product.status === 'Out of Stock' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                        {product.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-[13.5px] font-bold leading-[1.3] text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{product.name}</span>
                        <span className="text-[9.75px] leading-[1.4] text-slate-400 font-bold uppercase tracking-widest mt-0.5 block">
                          {product.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-[30px] py-[21px] text-center">
                    <span className="text-[13.5px] leading-[1.3] text-slate-800 font-black">
                      {product.sold.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-[30px] py-[21px]">
                    <div className="w-full max-w-[135px]">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-bold leading-[1.4] text-slate-500 uppercase tracking-wide">{product.stock} Units Available</span>
                      </div>
                      <div className="w-full h-[7.5px] bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 shadow-sm ${product.status === 'In Stock' ? 'bg-emerald-500' :
                            product.status === 'Low Stock' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          style={{ width: `${product.status === 'Out of Stock' ? 0 : product.status === 'Low Stock' ? 30 : 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-[30px] py-[21px]">
                    <span className={`inline-flex items-center px-3 py-[4.5px] rounded-full text-[8.25px] font-black uppercase tracking-[0.15em] shadow-sm border leading-[1.3] ${product.status === 'In Stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      product.status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-[7.5px] animate-pulse shadow-sm ${product.status === 'In Stock' ? 'bg-emerald-500' :
                        product.status === 'Low Stock' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;

