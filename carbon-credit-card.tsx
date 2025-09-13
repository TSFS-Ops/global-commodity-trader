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
  CalendarIcon, 
  Globe, 
  Leaf, 
  MapPin, 
  Award, 
  Clock, 
  Edit, 
  DollarSign,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

interface CarbonCreditCardProps {
  carbonCredit: any;
  isOwner: boolean;
}

export function CarbonCreditCard({ carbonCredit, isOwner }: CarbonCreditCardProps) {
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
        description: "You have successfully purchased carbon credits.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/carbon-credits"] });
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
        description: "Please log in to purchase carbon credits",
        variant: "destructive",
      });
      return;
    }
    
    if (quantity <= 0 || quantity > carbonCredit.quantity) {
      toast({
        title: "Invalid quantity",
        description: `Please enter a quantity between 1 and ${carbonCredit.quantity}`,
        variant: "destructive",
      });
      return;
    }
    
    // Create a mock listing to use the orders API
    const orderData = {
      listingId: -carbonCredit.id, // Negative ID to indicate it's a carbon credit
      sellerId: carbonCredit.ownerId,
      quantity,
      totalPrice: quantity * (carbonCredit.pricePerUnit || 0),
      notes: `Purchase of ${quantity} carbon credits from project: ${carbonCredit.projectName}`
    };
    
    purchaseMutation.mutate(orderData);
  };
  
  // Format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  const projectStartDate = formatDate(carbonCredit.projectStartDate);
  const projectEndDate = formatDate(carbonCredit.projectEndDate);
  const createdAt = formatDate(carbonCredit.createdAt);
  
  // Calculate total price
  const totalPrice = quantity * (carbonCredit.pricePerUnit || 0);
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition">
      <div className="h-40 bg-primary/10 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf className="h-16 w-16 text-primary/40" />
        </div>
        {carbonCredit.certificationStandard && (
          <Badge className="absolute top-2 right-2 bg-primary text-white">
            {carbonCredit.certificationStandard}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-neutral-800 font-medium">{carbonCredit.projectName}</h3>
            <p className="text-sm text-neutral-600 line-clamp-2">{carbonCredit.description || "No description available"}</p>
          </div>
          {isOwner && (
            <Badge variant="outline" className="border-primary text-primary">
              Your Project
            </Badge>
          )}
        </div>
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center text-sm text-neutral-600">
            <MapPin size={16} className="mr-1 text-neutral-500" />
            <span>{carbonCredit.location}</span>
          </div>
          
          {carbonCredit.verificationBody && (
            <div className="flex items-center text-sm text-neutral-600">
              <Award size={16} className="mr-1 text-neutral-500" />
              <span>Verified by {carbonCredit.verificationBody}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-neutral-600">
            <Clock size={16} className="mr-1 text-neutral-500" />
            <span>
              {projectStartDate === "N/A" && projectEndDate === "N/A"
                ? `Created on ${createdAt}`
                : `${projectStartDate} to ${projectEndDate}`
              }
            </span>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-neutral-600">Available</p>
            <p className="text-lg font-semibold text-neutral-800">{carbonCredit.quantity} units</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-neutral-600">Price per unit</p>
            <p className="text-lg font-semibold text-neutral-800">
              {carbonCredit.pricePerUnit 
                ? `$${carbonCredit.pricePerUnit.toFixed(2)}` 
                : "Contact for pricing"}
            </p>
          </div>
        </div>
        
        <div className="mt-3">
          {isOwner ? (
            <Button className="w-full" variant="outline">
              <Edit size={16} className="mr-2" />
              Edit Carbon Credits
            </Button>
          ) : (
            <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary text-white hover:bg-primary-dark">
                  <CheckCircle2 size={16} className="mr-2" />
                  Purchase Credits
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Purchase Carbon Credits</DialogTitle>
                  <DialogDescription>
                    Select the quantity of carbon credits you wish to purchase from "{carbonCredit.projectName}".
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Available credits:</span>
                    <span className="font-medium">{carbonCredit.quantity} units</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Price per unit:</span>
                    <span className="font-medium">
                      {carbonCredit.pricePerUnit 
                        ? `$${carbonCredit.pricePerUnit.toFixed(2)}` 
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
                        max={carbonCredit.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="h-8 w-20 rounded-none text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => setQuantity(Math.min(carbonCredit.quantity, quantity + 1))}
                        disabled={quantity >= carbonCredit.quantity}
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
