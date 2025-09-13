import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ReceiptText } from "lucide-react";

interface TransactionRecorderProps {
  productId: string | number;
  productName: string;
  sellerId: string | number;
  sellerName: string;
  quantity: number;
  price: number;
  onTransactionRecorded?: (transactionHash: string) => void;
}

export function TransactionRecorder({ 
  productId, 
  productName, 
  sellerId, 
  sellerName,
  quantity, 
  price,
  onTransactionRecorded 
}: TransactionRecorderProps) {
  const { toast } = useToast();
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [localPrice, setLocalPrice] = useState(price);
  
  // Mutation to record a transaction
  const recordTransactionMutation = useMutation({
    mutationFn: async () => {
      const data = {
        productId,
        sellerId,
        quantity: localQuantity,
        price: localPrice
      };
      
      const res = await apiRequest("POST", "/api/blockchain/transactions", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction recorded",
        description: "The transaction has been successfully recorded on the blockchain",
      });
      
      if (onTransactionRecorded) {
        onTransactionRecorded(data.transactionHash);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleRecordTransaction = () => {
    recordTransactionMutation.mutate();
  };
  
  const totalPrice = localQuantity * localPrice;
  
  return (
    <Card>
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-primary flex items-center">
          <ReceiptText className="mr-2 h-5 w-5" />
          Record Blockchain Transaction
        </CardTitle>
        <CardDescription>
          Record this purchase on the blockchain for transparency and verification
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-name">Product</Label>
                <Input id="product-name" value={productName} disabled />
              </div>
              <div>
                <Label htmlFor="seller-name">Seller</Label>
                <Input id="seller-name" value={sellerName} disabled />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  min="1"
                  value={localQuantity} 
                  onChange={(e) => setLocalQuantity(Number(e.target.value))}
                  disabled={recordTransactionMutation.isPending} 
                />
              </div>
              <div>
                <Label htmlFor="price">Price Per Unit</Label>
                <Input 
                  id="price" 
                  type="number" 
                  min="0.01" 
                  step="0.01"
                  value={localPrice} 
                  onChange={(e) => setLocalPrice(Number(e.target.value))}
                  disabled={recordTransactionMutation.isPending} 
                />
              </div>
            </div>
            
            <div>
              <Label>Total Price</Label>
              <div className="text-2xl font-bold">${totalPrice.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t p-4">
        <Button variant="outline" disabled={recordTransactionMutation.isPending}>
          Cancel
        </Button>
        <Button 
          onClick={handleRecordTransaction}
          disabled={recordTransactionMutation.isPending || localQuantity <= 0 || localPrice <= 0}
        >
          {recordTransactionMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Record Transaction
        </Button>
      </CardFooter>
    </Card>
  );
}