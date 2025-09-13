import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowDown, ArrowUp, Download, Maximize } from "lucide-react";
import { useState } from "react";

interface MarketChartProps {
  title: string;
  currentPrice: number;
  change: number;
  changePercentage: number;
  timeframe: string;
  data: {
    time: string;
    value: number;
  }[];
  timeOptions: {
    label: string;
    value: string;
  }[];
}

export function MarketChart({
  title,
  currentPrice,
  change,
  changePercentage,
  timeframe,
  data,
  timeOptions
}: MarketChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeOptions[0].value);
  const isPriceIncrease = change >= 0;

  return (
    <Card>
      <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center space-x-2">
          {timeOptions.map(option => (
            <Button
              key={option.value}
              size="sm"
              variant={selectedTimeframe === option.value ? "default" : "ghost"}
              onClick={() => setSelectedTimeframe(option.value)}
              className="py-1 px-3"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
            <div className="flex items-center text-sm">
              <span className={`${isPriceIncrease ? 'text-green-600' : 'text-red-600'} flex items-center font-medium`}>
                {isPriceIncrease ? (
                  <ArrowUp size={16} className="mr-1" />
                ) : (
                  <ArrowDown size={16} className="mr-1" />
                )}
                ${Math.abs(change).toFixed(2)} ({Math.abs(changePercentage).toFixed(2)}%)
              </span>
              <span className="text-neutral-600 ml-2">{timeframe}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="icon" variant="ghost">
              <Download size={16} />
            </Button>
            <Button size="icon" variant="ghost">
              <Maximize size={16} />
            </Button>
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.5rem'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
