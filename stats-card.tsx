import { Card, CardContent } from "@/components/ui/card";
import { ModernCard } from "@/components/ui/modern-card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ReactNode, memo } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: number;
    timeframe: string;
  };
}

export const StatsCard = memo(function StatsCard({
  title,
  value,
  icon,
  iconColor,
  iconBgColor,
  trend,
}: StatsCardProps) {
  const isTrendPositive = trend ? trend.value >= 0 : false;
  
  return (
    <ModernCard hover gradient className="group card-hover">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={cn(
            "p-4 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-lg",
            iconBgColor,
            iconColor,
            "group-hover:shadow-xl"
          )}>
            {icon}
          </div>
          <div className="ml-6 flex-1">
            <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">{title}</p>
            <p className="text-3xl font-bold text-gray-900 group-hover:text-green-700 transition-colors mt-1">{value}</p>
          </div>
        </div>
        {trend && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-sm fade-in-up">
            <span className={cn(
              "font-medium flex items-center gap-1 px-2 py-1 rounded-full",
              isTrendPositive ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
            )}>
              {isTrendPositive ? (
                <ArrowUp size={16} />
              ) : (
                <ArrowDown size={16} />
              )}
              {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-500 ml-3">from {trend.timeframe}</span>
          </div>
        )}
      </CardContent>
    </ModernCard>
  );
});
