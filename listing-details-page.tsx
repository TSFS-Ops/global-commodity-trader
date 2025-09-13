import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Listing, User } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductImageGallery } from "@/components/listings/product-image-gallery";
import { SellerVerificationBadge } from "@/components/listings/seller-verification-badge";
import { ProductComparisonTable } from "@/components/listings/product-comparison-table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { 
  MapPin, 
  Calendar, 
  Package, 
  DollarSign, 
  Truck, 
  ShieldCheck, 
  Award, 
  MessageSquare, 
  ArrowLeft, 
  Loader2, 
  ShoppingCart 
} from "lucide-react";

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>();
  const listingId = parseInt(params.id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<string>("");
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  
  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: [`/api/listings/${listingId}`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const { data: seller, isLoading: isSellerLoading } = useQuery<User>({
    queryKey: ["/api/users/" + (listing?.sellerId || "")],
    enabled: !!listing?.sellerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order created!",
        description: "Your order has been successfully placed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      navigate("/orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const res = await apiRequest("POST", "/api/messages", messageData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: "Your message has been sent to the seller.",
      });
      setMessage("");
      setIsMessageDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to place an order",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    if (!listing) {
      toast({
        title: "Error",
        description: "Listing information not available",
        variant: "destructive",
      });
      return;
    }
    
    if (quantity < (listing.minOrderQuantity || 1)) {
      toast({
        title: "Invalid quantity",
        description: `Minimum order quantity is ${listing.minOrderQuantity} ${listing.unit}`,
        variant: "destructive",
      });
      return;
    }
    
    createOrderMutation.mutate({
      listingId,
      quantity,
      sellerId: listing.sellerId,
      totalPrice: quantity * listing.pricePerUnit,
      notes: `Order for ${quantity} ${listing.unit} of ${listing.title}`
    });
  };

  const handleSendMessage = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to send a message",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }
    
    if (!listing) {
      toast({
        title: "Error",
        description: "Listing information not available",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate({
      receiverId: listing.sellerId,
      content: message,
      relatedListingId: listingId
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !listing) {
    return (
      <MainLayout>
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
          <h3 className="text-lg font-medium text-neutral-800 mb-2">Listing not found</h3>
          <p className="text-neutral-600 mb-6">The listing you're looking for doesn't exist or has been removed</p>
          <Button onClick={() => navigate("/listings")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>
        </div>
      </MainLayout>
    );
  }

  const status = listing?.status || "active";
  const statusBadgeColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    sold: "bg-red-100 text-red-800",
    expired: "bg-neutral-100 text-neutral-800",
    draft: "bg-blue-100 text-blue-800",
  };

  const statusDisplay: Record<string, string> = {
    active: "Available",
    pending: "Limited",
    sold: "Sold",
    expired: "Expired",
    draft: "Draft",
  };
  
  const badgeColor = statusBadgeColor[status] || statusBadgeColor.active;
  const displayText = statusDisplay[status] || statusDisplay.active;

  const isOwnListing = user?.id === listing?.sellerId;
  const canPurchase = status === "active" && !isOwnListing;
  const pricePerUnit = listing?.pricePerUnit || 0;
  const totalPrice = quantity * pricePerUnit;
  
  // Format specifications if available
  const specs = listing?.specifications ? Object.entries(listing.specifications) : [];

  // Use real images only - no placeholder images for authentic testing
  const title = listing?.title || "Product";
  const images = listing?.images && listing.images.length > 0 ? listing.images : [];

  return (
    <MainLayout>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate("/listings")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Listings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product images and details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              {/* Enhanced Image Gallery with Zoom */}
              <ProductImageGallery 
                images={images}
                productName={title}
                className="mb-6"
              />

              {/* Product title and basic info */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-800">{title}</h1>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge variant="outline" className={`${badgeColor} border-0 font-normal`}>
                        {displayText}
                      </Badge>
                      <div className="flex flex-col text-sm text-neutral-600">
                        <span className="font-medium">
                          {listing?.category ? listing.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Category not provided yet'}
                        </span>
                        {listing?.subcategory && (
                          <span className="text-neutral-500">
                            → {listing.subcategory}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-neutral-600">Price</div>
                    <div className="text-3xl font-bold text-neutral-800">${pricePerUnit.toFixed(2)}</div>
                    <div className="text-sm text-neutral-600">per {listing?.unit || 'unit'}</div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Product details */}
                <Tabs defaultValue="description">
                  <TabsList>
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="specifications">Specifications</TabsTrigger>
                    <TabsTrigger value="shipping">Shipping & Delivery</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="p-4">
                    <p className="text-neutral-600">{listing?.description || 'No description available.'}</p>
                  </TabsContent>
                  <TabsContent value="specifications" className="p-4">
                    {specs.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {specs.map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-neutral-600">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-600">No specifications available for this product.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="shipping" className="p-4">
                    <p className="text-neutral-600">
                      Shipping details are arranged after purchase. Contact the seller for specific shipping options and costs.
                    </p>
                  </TabsContent>
                </Tabs>
                
                {/* Additional info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-neutral-400 mr-2" />
                    <span className="text-neutral-600">Location: {listing?.location || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-neutral-400 mr-2" />
                    <span className="text-neutral-600">
                      Listed on: {listing?.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-neutral-400 mr-2" />
                    <span className="text-neutral-600">
                      Available quantity: {listing?.quantity || 0} {listing?.unit || 'units'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-neutral-400 mr-2" />
                    <span className="text-neutral-600">
                      Minimum order: {listing?.minOrderQuantity || 1} {listing?.unit || 'units'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Features and benefits */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium text-neutral-800 mb-4">Features & Benefits</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center p-4 bg-neutral-50 rounded-lg">
                  <div className="bg-primary/10 p-3 rounded-full mb-3">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Fast Delivery</h3>
                  <p className="text-sm text-neutral-600">Quick and efficient delivery options available</p>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-neutral-50 rounded-lg">
                  <div className="bg-primary/10 p-3 rounded-full mb-3">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Quality Guaranteed</h3>
                  <p className="text-sm text-neutral-600">All products undergo rigorous quality checks</p>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-neutral-50 rounded-lg">
                  <div className="bg-primary/10 p-3 rounded-full mb-3">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Certified Product</h3>
                  <p className="text-sm text-neutral-600">Meets industry standards and certifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Purchase and seller info */}
        <div className="space-y-6">
          {/* Purchase card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium text-neutral-800 mb-4">Purchase Information</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Price per {listing?.unit || 'unit'}:</span>
                  <span className="font-medium">${pricePerUnit.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Quantity:</span>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-r-none"
                      onClick={() => setQuantity(Math.max(listing?.minOrderQuantity || 1, quantity - 1))}
                      disabled={!canPurchase || quantity <= (listing?.minOrderQuantity || 1)}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={listing?.minOrderQuantity || 1}
                      max={listing?.quantity || 1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || (listing?.minOrderQuantity || 1))}
                      className="h-8 w-16 rounded-none text-center"
                      disabled={!canPurchase}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-l-none"
                      onClick={() => setQuantity(Math.min(listing?.quantity || 1, quantity + 1))}
                      disabled={!canPurchase || quantity >= (listing?.quantity || 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary-dark text-white"
                  disabled={!canPurchase || createOrderMutation.isPending}
                  onClick={handlePlaceOrder}
                >
                  {createOrderMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  Place Order
                </Button>
                
                <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Contact Seller
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Message to Seller</DialogTitle>
                      <DialogDescription>
                        Send a message to the seller about this listing.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="min-h-32"
                    />
                    <DialogFooter>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="mr-2 h-4 w-4" />
                        )}
                        Send Message
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <p className="text-xs text-neutral-600 text-center">
                  By placing an order, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Seller info */}
          {isSellerLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : seller ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium text-neutral-800 mb-4">Seller Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={seller.profileImage || undefined} alt={seller.fullName || 'Seller'} />
                      <AvatarFallback>
                        {seller.fullName ? seller.fullName.split(" ").map(n => n[0]).join("").toUpperCase() : 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{seller.fullName || 'Seller'}</div>
                      <div className="text-sm text-neutral-600">{seller.location || 'Unknown location'}</div>
                    </div>
                  </div>

                  {/* Enhanced Seller Verification */}
                  <SellerVerificationBadge 
                    sellerId={seller.id}
                    sellerName={seller.fullName || undefined}
                    variant="detailed"
                  />
                </div>
                
                {seller.rating && (
                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {[...Array(Math.floor(seller.rating))].map((_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      ))}
                      {seller.rating % 1 >= 0.5 && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      )}
                      {[...Array(5 - Math.ceil(seller.rating))].map((_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-yellow-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                      ))}
                      <span className="ml-1 text-sm text-neutral-600">({seller.rating.toFixed(1)})</span>
                    </div>
                  </div>
                )}
                
                {seller.company && (
                  <div className="text-sm text-neutral-600 mb-3">
                    <span className="font-medium">Company:</span> {seller.company}
                  </div>
                )}
                
                {seller.isVerified && (
                  <Badge className="bg-green-100 text-green-800 mb-3 border-0">
                    Verified Seller
                  </Badge>
                )}
                
                <div className="space-y-2 mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/profile/${seller.id}`)}
                  >
                    View Seller Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          
          {/* Similar products suggestion would go here */}
        </div>
      </div>
    </MainLayout>
  );
}
