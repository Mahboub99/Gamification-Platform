import React from 'react';
import { cn, getBadgeColor } from '@/lib/utils';

interface BadgeProps {
  name: string;
  description?: string;
  imageUrl?: string;
  rarity: string;
  experienceReward?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Badge: React.FC<BadgeProps> = ({
  name,
  description,
  imageUrl,
  rarity,
  experienceReward,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  return (
    <div className={cn('flex flex-col items-center space-y-2', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover rounded-full border-2 border-gray-200"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={cn('absolute -top-1 -right-1 px-2 py-1 rounded-full text-xs font-medium', getBadgeColor(rarity))}>
          {rarity}
        </div>
      </div>
      <div className="text-center">
        <h4 className="font-semibold text-sm">{name}</h4>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
        {experienceReward && (
          <p className="text-xs text-green-600 mt-1">+{experienceReward} XP</p>
        )}
      </div>
    </div>
  );
};

export { Badge }; 