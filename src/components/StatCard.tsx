import React from 'react';
import { cn } from '../utils/cn';

interface StatCardProps {
  label: string;
  value: string;
  colorClass: string;
  labelClass: string;
  valueClass: string;
  icon?: React.ReactNode;
}

export const StatCard = ({ label, value, colorClass, labelClass, valueClass, icon }: StatCardProps) => (
  <div className={cn("rounded-xl p-4 border flex flex-col", colorClass)}>
    <div className="flex items-center justify-between mb-1">
      <p className={cn("text-xs font-semibold uppercase tracking-wider", labelClass)}>{label}</p>
      {icon}
    </div>
    <p className={cn("text-xl font-bold mt-auto", valueClass)}>{value}</p>
  </div>
);
