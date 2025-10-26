import React from "react";

interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  color: string;
  labelColor: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  current,
  total,
  color,
  labelColor,
}) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${labelColor}`}>
          {current} / {total}
        </span>
      </div>
      <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;