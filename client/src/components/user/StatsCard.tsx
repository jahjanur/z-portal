import React from "react";
import StatCard from "../ui/StatCard";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  valueColor?: string;
}

/**
 * Legacy stats card — kept for API compatibility.
 * Renders the modern ui/StatCard internally (iconBgColor/valueColor are
 * superseded by the token-based design system and intentionally unused).
 */
const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon }) => {
  return <StatCard label={title} value={value} icon={icon} hint={subtitle} />;
};

export default StatsCard;
