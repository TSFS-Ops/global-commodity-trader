import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  X, 
  Plus, 
  Minus, 
  Star, 
  MapPin, 
  Package,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductSpec {
  label: string;
  value: string | number | boolean;
  type: "text" | "number" | "boolean" | "price" | "rating" | "location";
  important?: boolean;
}

interface ComparisonProduct {
  id: number;
  name: string;
  price: number;
  priceUnit: string;
  image?: string;
  specs: ProductSpec[];
  badges?: string[];
  rating?: number;
  location?: string;
}

interface ProductComparisonTableProps {
  products: ComparisonProduct[];
  onRemoveProduct?: (productId: number) => void;
  onAddProduct?: () => void;
  maxProducts?: number;
  className?: string;
}

export function ProductComparisonTable({
  products,
  onRemoveProduct,
  onAddProduct,
  maxProducts = 4,
  className
}: ProductComparisonTableProps) {
  const [highlightedSpec, setHighlightedSpec] = useState<string | null>(null);

  // Get all unique specifications across products
  const allSpecs = Array.from(
    new Set(
      products.flatMap(product => 
        product.specs.map(spec => spec.label)
      )
    )
  );

  // Group specs by importance
  const importantSpecs = allSpecs.filter(label => 
    products.some(product => 
      product.specs.find(spec => spec.label === label)?.important
    )
  );
  
  const otherSpecs = allSpecs.filter(label => !importantSpecs.includes(label));

  const renderSpecValue = (product: ComparisonProduct, specLabel: string) => {
    const spec = product.specs.find(s => s.label === specLabel);
    
    if (!spec) {
      return <span className="text-gray-400">-</span>;
    }

    switch (spec.type) {
      case "boolean":
        return spec.value ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        );
      
      case "price":
        return (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">R{spec.value}</span>
          </div>
        );
      
      case "rating":
        return (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span className="text-sm font-medium">{spec.value}</span>
          </div>
        );
      
      case "location":
        return (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-sm">{spec.value}</span>
          </div>
        );
      
      case "number":
        return <span className="font-mono text-sm">{spec.value}</span>;
      
      default:
        return <span className="text-sm">{spec.value}</span>;
    }
  };

  const getBestValue = (specLabel: string) => {
    const values = products
      .map(product => product.specs.find(s => s.label === specLabel))
      .filter(Boolean)
      .map(spec => spec!.value);

    if (values.length === 0) return null;

    // For numbers, find the best value (highest for most specs, lowest for price)
    if (typeof values[0] === 'number') {
      return specLabel.toLowerCase().includes('price') 
        ? Math.min(...values as number[])
        : Math.max(...values as number[]);
    }

    return null;
  };

  const isHighlightedValue = (product: ComparisonProduct, specLabel: string) => {
    const spec = product.specs.find(s => s.label === specLabel);
    if (!spec || typeof spec.value !== 'number') return false;
    
    const bestValue = getBestValue(specLabel);
    return bestValue !== null && spec.value === bestValue;
  };

  if (products.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Products to Compare</h3>
          <p className="text-gray-600 text-center mb-6">
            Add products to compare their features, prices, and specifications side by side.
          </p>
          {onAddProduct && (
            <Button onClick={onAddProduct} className="bg-[#173c1e] hover:bg-[#173c1e]/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Product Comparison</CardTitle>
          {onAddProduct && products.length < maxProducts && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddProduct}
              className="border-[#a8c566] text-[#173c1e] hover:bg-[#a8c566]/10"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Compare up to {maxProducts} cannabis products side by side
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900 min-w-[200px] sticky left-0 bg-gray-50">
                  Specification
                </th>
                {products.map((product) => (
                  <th key={product.id} className="p-4 min-w-[200px] max-w-[250px]">
                    <div className="space-y-3">
                      {/* Product Image */}
                      {product.image ? (
                        <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-gray-100">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 mx-auto rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}

                      {/* Product Name */}
                      <div className="text-sm font-medium text-gray-900 text-center">
                        {product.name}
                      </div>

                      {/* Price */}
                      <div className="text-center">
                        <div className="text-lg font-bold text-[#173c1e]">
                          R{product.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">per {product.priceUnit}</div>
                      </div>

                      {/* Badges */}
                      {product.badges && product.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {product.badges.slice(0, 2).map((badge) => (
                            <Badge key={badge} variant="secondary" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                          {product.badges.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.badges.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Remove Button */}
                      {onRemoveProduct && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveProduct(product.id)}
                          className="mx-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Minus className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Important Specs */}
              {importantSpecs.length > 0 && (
                <>
                  <tr className="bg-blue-50">
                    <td className="p-3 font-medium text-blue-900 sticky left-0 bg-blue-50">
                      Key Features
                    </td>
                    {products.map((product) => (
                      <td key={product.id} className="p-3"></td>
                    ))}
                  </tr>
                  {importantSpecs.map((specLabel) => (
                    <tr 
                      key={specLabel}
                      className={cn(
                        "border-b hover:bg-gray-50 transition-colors",
                        highlightedSpec === specLabel && "bg-blue-50"
                      )}
                      onMouseEnter={() => setHighlightedSpec(specLabel)}
                      onMouseLeave={() => setHighlightedSpec(null)}
                    >
                      <td className="p-4 font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50">
                        {specLabel}
                      </td>
                      {products.map((product) => (
                        <td 
                          key={product.id} 
                          className={cn(
                            "p-4 text-center",
                            isHighlightedValue(product, specLabel) && "bg-green-50 font-medium"
                          )}
                        >
                          {renderSpecValue(product, specLabel)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {/* Other Specs */}
              {otherSpecs.length > 0 && (
                <>
                  {importantSpecs.length > 0 && (
                    <tr>
                      <td colSpan={products.length + 1} className="p-0">
                        <Separator />
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-50">
                    <td className="p-3 font-medium text-gray-700 sticky left-0 bg-gray-50">
                      Additional Details
                    </td>
                    {products.map((product) => (
                      <td key={product.id} className="p-3"></td>
                    ))}
                  </tr>
                  {otherSpecs.map((specLabel) => (
                    <tr 
                      key={specLabel}
                      className={cn(
                        "border-b hover:bg-gray-50 transition-colors",
                        highlightedSpec === specLabel && "bg-blue-50"
                      )}
                      onMouseEnter={() => setHighlightedSpec(specLabel)}
                      onMouseLeave={() => setHighlightedSpec(null)}
                    >
                      <td className="p-4 font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50">
                        {specLabel}
                      </td>
                      {products.map((product) => (
                        <td 
                          key={product.id} 
                          className={cn(
                            "p-4 text-center",
                            isHighlightedValue(product, specLabel) && "bg-green-50 font-medium"
                          )}
                        >
                          {renderSpecValue(product, specLabel)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}