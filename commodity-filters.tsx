import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, Sprout, Pill, Hash } from "lucide-react";

interface CommodityFiltersProps {
  selected: string;
  onSelect: (commodity: string) => void;
}

const commodityOptions = [
  { value: "hemp", label: "Hemp", icon: <Sprout size={16} />, color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { value: "cannabis", label: "Cannabis", icon: <Leaf size={16} />, color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
  { value: "cbd", label: "CBD", icon: <Pill size={16} />, color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { value: "thc", label: "THC", icon: <Hash size={16} />, color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
];

export function CommodityFilters({ selected, onSelect }: CommodityFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === "" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("")}
        className="h-8"
      >
        All Types
      </Button>
      
      {commodityOptions.map((option) => (
        <Badge
          key={option.value}
          variant="outline"
          className={`cursor-pointer h-8 px-3 flex items-center gap-1 transition-colors ${
            selected === option.value 
              ? option.color 
              : "hover:bg-muted"
          }`}
          onClick={() => onSelect(option.value)}
        >
          {option.icon}
          {option.label}
        </Badge>
      ))}
    </div>
  );
}