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
    <div
      className="p-6 rounded-2xl border backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(42, 42, 42, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        <div className="p-2 rounded-lg" style={{ backgroundColor: iconBgColor }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white" style={{ color: valueColor || undefined }}>
        {value}
      </p>
      {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
};

export default StatsCard;
