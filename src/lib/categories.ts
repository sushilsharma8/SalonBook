import {
  Scissors,
  Sparkles,
  Eye,
  Activity,
  ThermometerSun,
  Droplet,
  PenTool,
  Sun,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react';

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  { id: 'hair', label: 'Hair', icon: Scissors },
  { id: 'nails', label: 'Nails', icon: Sparkles },
  { id: 'eyebrows', label: 'Lashes', icon: Eye },
  { id: 'beauty', label: 'Beauty', icon: Sparkles },
  { id: 'medspa', label: 'Medspa', icon: Activity },
  { id: 'barber', label: 'Barber', icon: Scissors },
  { id: 'massage', label: 'Massage', icon: Activity },
  { id: 'spa', label: 'Spa', icon: ThermometerSun },
  { id: 'waxing', label: 'Waxing', icon: Droplet },
  { id: 'tattoo', label: 'Tattoo', icon: PenTool },
  { id: 'tanning', label: 'Tanning', icon: Sun },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
];
