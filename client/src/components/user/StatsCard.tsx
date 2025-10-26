import React from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  valueColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  valueColor,
}) => {
  return (
    <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-600">{title}</p>
        <div className="p-2 rounded-lg" style={{ backgroundColor: iconBgColor }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color: valueColor || "#1F2937" }}>
        {value}
      </p>
      {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
};

export default StatsCard;