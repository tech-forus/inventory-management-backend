import { Package, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

export interface Metric {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  bgColor: string;
}

export interface MovementData {
  day: string;
  date?: number; // Day of month (1-31)
  fullDate?: string; // Full date string for reference
  incomingAmount: number;
  outgoingAmount: number;
}

export interface CategoryData {
  name: string;
  value: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  sold: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

// Note: Mock data constants have been removed as the dashboard now uses real data from the API

