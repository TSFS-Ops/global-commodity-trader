import { ModernCard } from "@/components/ui/modern-card";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { MapPin, Leaf, ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedListingCardProps {
  title: string;
  description: string;
  price: number;
  quantity: number;
  unit: string;
  location: string;
  category: string;
  verified?: boolean;
  rating?: number;
  image?: string;
  onView: () => void;
  onContact: () => void;
}

export function EnhancedListingCard({
  title,
  description,
  price,
  quantity,
  unit,
  location,
  category,
  verified = false,
  rating = 0,
  image,
  onView,
  onContact
}: EnhancedListingCardProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'cannabis': return 'bg-green-100 text-green-800 border-green-300';
      case 'hemp': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'cbd': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'thc': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <ModernCard hover className="group overflow-hidden">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-green-100 to-green-200 overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="w-16 h-16 text-green-400" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={cn("text-xs font-medium border", getCategoryColor(category))}>
            {category}
          </Badge>
          {verified && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>
        
        {rating > 0 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs font-medium">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Price and Quantity */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold cannabis-gradient bg-clip-text text-transparent">
            R{price.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{quantity}</span> {unit} available
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{location}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <EnhancedButton
            variant="cannabis"
            size="sm"
            onClick={onView}
            className="flex-1"
          >
            View Details
          </EnhancedButton>
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={onContact}
            className="flex-1"
          >
            Contact Seller
          </EnhancedButton>
        </div>
      </div>
    </ModernCard>
  );
}