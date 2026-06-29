import React from 'react';

interface MachineStatusBadgeProps {
  status: 'available' | 'occupied' | 'loading';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const MachineStatusBadge: React.FC<MachineStatusBadgeProps> = ({
  status,
  showIcon = false,
  size = 'md'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return {
          text: 'Available',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          icon: '✓'
        };
      case 'occupied':
        return {
          text: 'Occupied',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          icon: '⏳'
        };
      case 'loading':
        return {
          text: 'Loading...',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: '↻'
        };
      default:
        return {
          text: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: '?'
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`${config.bgColor} ${config.textColor} ${sizeClasses[size]} rounded-full font-semibold inline-flex items-center gap-1`}>
      {showIcon && <span className="text-xs">{config.icon}</span>}
      {config.text}
    </span>
  );
};

export default MachineStatusBadge;