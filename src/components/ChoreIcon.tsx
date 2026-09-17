import React from 'react';
import {
  Bed,
  Sparkles,
  Shirt,
  Backpack,
  BookOpen,
  CheckCircle2,
  Box,
  Utensils,
  Trash2,
  HeartHandshake,
  Flower2,
  ChefHat,
  Heart,
  Smile,
  Tv,
  Film,
  IceCream,
  Moon,
  Gift,
  Pizza,
  Trophy,
  Gamepad2,
  Bike,
  Music,
  Sun,
  Flame,
  Star,
  Award,
  Clock,
  Compass,
  Check,
  Zap,
} from 'lucide-react';

interface ChoreIconProps {
  name: string;
  className?: string;
}

export const ChoreIcon: React.FC<ChoreIconProps> = ({ name, className = 'w-5 h-5' }) => {
  const iconMap: Record<string, React.ReactElement> = {
    bed: <Bed className={className} />,
    sparkles: <Sparkles className={className} />,
    shirt: <Shirt className={className} />,
    backpack: <Backpack className={className} />,
    'book-open': <BookOpen className={className} />,
    'check-circle-2': <CheckCircle2 className={className} />,
    box: <Box className={className} />,
    utensils: <Utensils className={className} />,
    'trash-2': <Trash2 className={className} />,
    'heart-handshake': <HeartHandshake className={className} />,
    'flower-2': <Flower2 className={className} />,
    'chef-hat': <ChefHat className={className} />,
    heart: <Heart className={className} />,
    smile: <Smile className={className} />,
    tv: <Tv className={className} />,
    film: <Film className={className} />,
    'ice-cream': <IceCream className={className} />,
    moon: <Moon className={className} />,
    gift: <Gift className={className} />,
    pizza: <Pizza className={className} />,
    trophy: <Trophy className={className} />,
    gamepad: <Gamepad2 className={className} />,
    bike: <Bike className={className} />,
    music: <Music className={className} />,
    sun: <Sun className={className} />,
    flame: <Flame className={className} />,
    star: <Star className={className} />,
    award: <Award className={className} />,
    clock: <Clock className={className} />,
    compass: <Compass className={className} />,
    zap: <Zap className={className} />,
  };

  return iconMap[name.toLowerCase()] || <Check className={className} />;
};
