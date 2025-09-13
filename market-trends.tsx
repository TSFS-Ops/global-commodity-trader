import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Package, FlaskRound, RefreshCw, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { ReactNode } from "react";

interface TrendItem {
  id: number;
  productName: string;
  category: 'hemp' | 'carbon_credit' | 'biochar' | 'hemp_fiber' | 'other';
  subtitle: string;
  price: string;
  changePercentage: number;
}

interface MarketTrendsProps {
  trends: TrendItem[];
  onViewAllClick: () => void;
}

export function MarketTrends({ trends, onViewAllClick }: MarketTrendsProps) {
  const getCategoryIcon = (category: string): ReactNode => {
    switch (category) {
      case 'hemp':
        return <Leaf size={16} />;
      case 'carbon_credit':
        return <RefreshCw size={16} />;
      case 'hemp_fiber':
        return <Package size={16} />;
      case 'biochar':
        return <FlaskRound size={16} />;
      default:
        return <Leaf size={16} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle>Market Trends</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {trends.map((trend) => (
            <div key={trend.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 text-neutral-800">
                  {getCategoryIcon(trend.category)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{trend.productName}</p>
                  <p className="text-xs text-neutral-600">{trend.subtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{trend.price}</p>
                <p className={`text-xs flex items-center justify-end ${trend.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.changePercentage >= 0 ? (
                    <ArrowUp size={12} className="mr-1" />
                  ) : (
                    <ArrowDown size={12} className="mr-1" />
                  )}
                  {Math.abs(trend.changePercentage)}%
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-white"
            onClick={onViewAllClick}
          >
            View All Markets
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
