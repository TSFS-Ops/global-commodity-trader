import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, Clock, CalendarIcon, Package, TruckIcon, X, MessageCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

type Order = {
  id: number;
  listingId: number;
  buyerId: number;
  sellerId: number;
  quantity: number;
  totalPrice: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  deliveryAddress: string | null;
  notes: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: {
    title: string;
    category: string;
    description: string;
    unit: string;
    pricePerUnit: number;
  };
  seller?: {
    username: string;
    email: string;
  };
  buyer?: {
    username: string;
    email: string;
  };
};

export default function OrderDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const orderId = params.id;
  
  const [newMessage, setNewMessage] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
    staleTime: 60 * 1000, // 1 minute
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The order status has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowStatusDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!order) throw new Error("Order not found");
      const recipientId = user?.role === "seller" ? order.buyerId : order.sellerId;
      const messageData = {
        receiverId: recipientId,
        content: message,
        relatedOrderId: orderId,
      };
      const res = await apiRequest("POST", "/api/messages", messageData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      setNewMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Message failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, { status: "cancelled" });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order cancelled",
        description: "The order has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleUpdateStatus = () => {
    if (newStatus) {
      updateStatusMutation.mutate(newStatus);
    }
  };
  
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage);
    }
  };
  
  const handleCancelOrder = () => {
    cancelOrderMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return "Unknown date";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="mr-2 h-4 w-4" /> },
      processing: { color: "bg-blue-100 text-blue-800", icon: <Package className="mr-2 h-4 w-4" /> },
      completed: { color: "bg-green-100 text-green-800", icon: <Check className="mr-2 h-4 w-4" /> },
      cancelled: { color: "bg-red-100 text-red-800", icon: <X className="mr-2 h-4 w-4" /> },
    };
    
    const statusConfig = statusMap[status as keyof typeof statusMap] || 
      { color: "bg-neutral-100 text-neutral-800", icon: <Package className="mr-2 h-4 w-4" /> };
    
    return (
      <Badge className={`${statusConfig.color} border-0 text-sm py-1 px-3`}>
        <span className="flex items-center">
          {statusConfig.icon}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </Badge>
    );
  };
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }
  
  if (!order) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Order Not Found</h2>
          <p className="text-neutral-600 mb-6">The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/orders">
            <Button>Return to Orders</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }
  
  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;
  
  if (!isBuyer && !isSeller) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Access Denied</h2>
          <p className="text-neutral-600 mb-6">You don't have permission to view this order.</p>
          <Link href="/orders">
            <Button>Return to Orders</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <Link href="/orders">
          <Button variant="ghost" className="mb-4 pl-0 text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Order #{order.id}</h1>
            <p className="text-neutral-600">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            {getStatusBadge(order.status)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>Complete information about this order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-start">
                  <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center mr-4 flex-shrink-0">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{order.listing?.title || `Product #${order.listingId}`}</h3>
                    <p className="text-neutral-600 text-sm">{order.listing?.description || "No description available"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {order.listing?.category || "Unknown Category"}
                      </Badge>
                      {order.transactionId && (
                        <Badge variant="outline">
                          TXN: {order.transactionId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-neutral-500">QUANTITY</h4>
                  <p className="text-lg">{order.quantity} {order.listing?.unit || "units"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 text-neutral-500">PRICE PER UNIT</h4>
                  <p className="text-lg">${order.listing?.pricePerUnit?.toFixed(2) || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium mb-2 text-neutral-500">TOTAL PRICE</h4>
                  <p className="text-2xl font-bold">${order.totalPrice.toFixed(2)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium mb-2 text-neutral-500">DELIVERY ADDRESS</h4>
                <p className="text-neutral-800">{order.deliveryAddress || "No delivery address provided"}</p>
              </div>
              
              {order.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-neutral-500">NOTES</h4>
                  <p className="text-neutral-800">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Contact form */}
          <Card>
            <CardHeader>
              <CardTitle>Contact {isBuyer ? "Seller" : "Buyer"}</CardTitle>
              <CardDescription>Send a message about this order</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={`Message to ${isBuyer ? order.seller?.username : order.buyer?.username}...`}
                className="min-h-[120px]"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Message
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Status and Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isSeller ? "Manage Order" : "Order Status"}</CardTitle>
              <CardDescription>
                {isSeller 
                  ? "Update the status of this order"
                  : "Current status and actions"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Status</span>
                {getStatusBadge(order.status)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Date Placed</span>
                <span className="font-medium">{formatDate(order.createdAt)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Last Updated</span>
                <span className="font-medium">{formatDate(order.updatedAt)}</span>
              </div>
              
              {order.transactionId && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Transaction ID</span>
                  <span className="font-medium text-sm">{order.transactionId}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              {isSeller && order.status !== "completed" && order.status !== "cancelled" && (
                <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="w-full">
                      Update Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Order Status</DialogTitle>
                      <DialogDescription>
                        Change the current status of this order
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpdateStatus}
                        disabled={!newStatus || updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update Status
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              {isBuyer && order.status === "pending" && (
                <Button variant="destructive" onClick={handleCancelOrder} disabled={cancelOrderMutation.isPending}>
                  {cancelOrderMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cancel Order
                </Button>
              )}
              
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/messages?${isBuyer ? `sellerId=${order.sellerId}` : `buyerId=${order.buyerId}`}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  View Messages
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{isBuyer ? "Seller" : "Buyer"} Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1 text-neutral-500">NAME</h4>
                <p className="font-medium">
                  {isBuyer 
                    ? order.seller?.username || `Seller #${order.sellerId}`
                    : order.buyer?.username || `Buyer #${order.buyerId}`
                  }
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1 text-neutral-500">EMAIL</h4>
                <p>
                  {isBuyer 
                    ? order.seller?.email || "Not available"
                    : order.buyer?.email || "Not available"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}