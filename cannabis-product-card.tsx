import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Leaf, 
  MapPin, 
  Award, 
  Clock, 
  Edit, 
  DollarSign,
  Loader2,
  CheckCircle2,
  PercentIcon
} from "lucide-react";
import { format } from "date-fns";

interface CannabisProductProps {
  cannabisProduct: any;
  isOwner: boolean;
}

export function CannabisProductCard({ cannabisProduct, isOwner }: CannabisProductProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  const purchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase successful!",
        description: "You have successfully purchased this cannabis product.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cannabis-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsPurchaseDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handlePurchase = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to purchase cannabis products",
        variant: "destructive",
      });
      return;
    }
    
    if (quantity <= 0 || quantity > cannabisProduct.quantity) {
      toast({
        title: "Invalid quantity",
        description: `Please enter a quantity between 1 and ${cannabisProduct.quantity}`,
        variant: "destructive",
      });
      return;
    }
    
    // Create order data for cannabis product purchase
    const orderData = {
      listingId: -cannabisProduct.id, // Negative ID to indicate it's a cannabis product
      sellerId: cannabisProduct.ownerId,
      quantity,
      totalPrice: quantity * (cannabisProduct.pricePerUnit || 0),
      notes: `Purchase of ${quantity} ${cannabisProduct.unit}s of ${cannabisProduct.productName}, strain: ${cannabisProduct.strain}`
    };
    
    purchaseMutation.mutate(orderData);
  };
  
  // Format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  const harvestDate = formatDate(cannabisProduct.harvestDate);
  const createdAt = formatDate(cannabisProduct.createdAt);
  
  // Calculate total price
  const totalPrice = quantity * (cannabisProduct.pricePerUnit || 0);
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition">
      <div className="h-40 bg-primary/10 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf className="h-16 w-16 text-primary/40" />
        </div>
        {cannabisProduct.certificationStandard && (
          <Badge className="absolute top-2 right-2 bg-primary text-white">
            {cannabisProduct.certificationStandard}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-neutral-800 font-medium">{cannabisProduct.productName}</h3>
            <p className="text-sm text-neutral-600 line-clamp-2">{cannabisProduct.description || "No description available"}</p>
          </div>
          {isOwner && (
            <Badge variant="outline" className="border-primary text-primary">
              Your Product
            </Badge>
          )}
        </div>
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center text-sm text-neutral-600">
            <MapPin size={16} className="mr-1 text-neutral-500" />
            <span>{cannabisProduct.location}</span>
          </div>
          
          {cannabisProduct.strain && (
            <div className="flex items-center text-sm text-neutral-600">
              <Leaf size={16} className="mr-1 text-neutral-500" />
              <span>Strain: {cannabisProduct.strain}</span>
            </div>
          )}
          
          {(cannabisProduct.thcContent || cannabisProduct.cbdContent) && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <div className="flex items-center">
                <PercentIcon size={16} className="mr-1 text-neutral-500" />
                <span>THC: {cannabisProduct.thcContent || 'Unknown'}%</span>
              </div>
              <div className="flex items-center">
                <PercentIcon size={16} className="mr-1 text-neutral-500" />
                <span>CBD: {cannabisProduct.cbdContent || 'Unknown'}%</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center text-sm text-neutral-600">
            <Clock size={16} className="mr-1 text-neutral-500" />
            <span>
              {harvestDate === "N/A" 
                ? `Listed on ${createdAt}`
                : `Harvested: ${harvestDate}`
              }
            </span>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-neutral-600">Available</p>
            <p className="text-lg font-semibold text-neutral-800">{cannabisProduct.quantity} {cannabisProduct.unit || 'units'}</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-neutral-600">Price per {cannabisProduct.unit || 'unit'}</p>
            <p className="text-lg font-semibold text-neutral-800">
              {cannabisProduct.pricePerUnit 
                ? `$${cannabisProduct.pricePerUnit.toFixed(2)}` 
                : "Contact for pricing"}
            </p>
          </div>
        </div>
        
        <div className="mt-3">
          {isOwner ? (
            <Button className="w-full" variant="outline">
              <Edit size={16} className="mr-2" />
              Edit Product
            </Button>
          ) : (
            <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary text-white hover:bg-primary-dark">
                  <CheckCircle2 size={16} className="mr-2" />
                  Purchase Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Purchase Cannabis Product</DialogTitle>
                  <DialogDescription>
                    Select the quantity of {cannabisProduct.productName} ({cannabisProduct.strain}) you wish to purchase.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Available quantity:</span>
                    <span className="font-medium">{cannabisProduct.quantity} {cannabisProduct.unit || 'units'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Price per {cannabisProduct.unit || 'unit'}:</span>
                    <span className="font-medium">
                      {cannabisProduct.pricePerUnit 
                        ? `$${cannabisProduct.pricePerUnit.toFixed(2)}` 
                        : "Contact for pricing"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="quantity" className="text-neutral-600">Quantity:</label>
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        -
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min={1}
                        max={cannabisProduct.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="h-8 w-20 rounded-none text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => setQuantity(Math.min(cannabisProduct.quantity, quantity + 1))}
                        disabled={quantity >= cannabisProduct.quantity}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-primary hover:bg-primary-dark"
                    onClick={handlePurchase}
                    disabled={purchaseMutation.isPending}
                  >
                    {purchaseMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <DollarSign className="mr-2 h-4 w-4" />
                    )}
                    Complete Purchase
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}