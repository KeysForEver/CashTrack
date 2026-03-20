import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { BarChart as BarChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { ActiveShape } from './ActiveShape';
import { formatCurrency } from '../utils/formatters';

interface DashboardChartsProps {
  activeChart: 'bar' | 'pie';
  setActiveChart: (chart: 'bar' | 'pie') => void;
  barData: any[];
  pieData: any[];
  activePieIndex: number;
  setActivePieIndex: (index: number) => void;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  activeChart,
  setActiveChart,
  barData,
  pieData,
  activePieIndex,
  setActivePieIndex
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">Visão Geral</h3>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveChart('bar')}
            className={`p-2 rounded-lg transition-all ${activeChart === 'bar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChartIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveChart('pie')}
            className={`p-2 rounded-lg transition-all ${activeChart === 'pie' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <PieChartIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeChart === 'bar' ? (
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `R$ ${value}`} />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
              <Bar dataKey="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                activeIndex={activePieIndex}
                activeShape={ActiveShape}
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                onMouseEnter={(_, index) => setActivePieIndex(index)}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
