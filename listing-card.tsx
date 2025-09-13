import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { SocialImpactBadge } from "@/components/social-impact-badge";

export interface ListingProps {
  id: number;
  title: string;
  description: string;
  category?: string;
  subcategory?: string;
  price: string;
  priceNumeric: number;
  unit: string;
  location: string;
  image?: string;
  status: 'available' | 'limited' | 'sold';
  minOrder: string;
  isFeatured?: boolean;
  socialImpactScore?: number;
  socialImpactCategory?: string;
}

export function ListingCard({
  id,
  title,
  description,
  category,
  subcategory,
  price,
  unit,
  location,
  image,
  status,
  minOrder,
  isFeatured,
  socialImpactScore = 0,
  socialImpactCategory = "",
}: ListingProps) {
  // Add null safety checks
  if (!id || !title || !price || !status) {
    console.warn('ListingCard: Missing required props', { id, title, price, status });
    return null;
  }
  // Determine status badge color
  const statusColor = {
    available: "bg-green-100 text-green-800",
    limited: "bg-yellow-100 text-yellow-800",
    sold: "bg-red-100 text-red-800",
  }[status];
  
  // Use real images only - no placeholder images for authentic testing
  const displayImage = image || null;
  
  return (
    <Card className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 flex flex-col h-full">
      <div className="h-40 bg-neutral-100 relative">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={title} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-neutral-500">
            No Image
          </div>
        )}
        {isFeatured && (
          <div className="absolute top-2 right-2 bg-primary-dark text-white text-xs px-2 py-1 rounded">
            Featured
          </div>
        )}
      </div>
      <CardContent className="p-4 flex flex-col flex-1">
        {/* Header with title and status badge */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-neutral-800 font-medium">{title}</h3>
          <Badge className={`${statusColor} border-0 font-normal`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        
        {/* Description with fixed height */}
        <div className="mb-3">
          <p className="text-sm text-neutral-600 line-clamp-2 h-10">{description}</p>
        </div>
        
        {/* Category and subcategory info */}
        <div className="text-xs text-neutral-600 mb-2">
          <span className="font-medium">
            {category ? category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Category not provided yet'}
          </span>
          {subcategory && (
            <span className="text-neutral-500">
              {' → '}{subcategory}
            </span>
          )}
        </div>
        
        {/* Location and min order info */}
        <div className="text-xs text-neutral-600 mb-3">
          <span className="inline-flex items-center">
            <MapPin size={12} className="mr-1" /> {location}
          </span>
          <span className="mx-2">•</span>
          <span>Min. Order: {minOrder}</span>
        </div>

        {/* Social Impact Badge */}
        {socialImpactScore > 0 && (
          <div className="mb-3">
            <SocialImpactBadge 
              score={socialImpactScore} 
              category={socialImpactCategory}
              variant="compact"
            />
          </div>
        )}
        
        {/* Price and button - pushed to bottom with mt-auto */}
        <div className="mt-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-600">Price</p>
            <p className="text-lg font-semibold text-neutral-800">{price}/{unit}</p>
          </div>
          <Link to={`/listings/${id}`}>
            <Button size="sm" className="bg-primary text-white hover:bg-primary-dark">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
