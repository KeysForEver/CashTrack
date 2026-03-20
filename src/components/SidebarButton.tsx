import React from 'react';
import { cn } from '../utils/cn';

interface SidebarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
  hoverBg: string;
}

export const SidebarButton = ({ onClick, icon, label, color, hoverBg }: SidebarButtonProps) => (
  <button 
    type="button"
    onClick={onClick} 
    className={cn(
      "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] hover:shadow-sm hover:scale-[1.01]",
      color,
      hoverBg
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);
