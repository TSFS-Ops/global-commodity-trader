import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { CannabisProductCard } from "@/components/cannabis-products/cannabis-product-card";
import { CannabisProductForm } from "@/components/cannabis-products/cannabis-product-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search } from "lucide-react";

export default function CannabisProductsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: cannabisProducts, isLoading } = useQuery({
    queryKey: ["/api/cannabis-products"],
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: userCannabisProducts, isLoading: isUserProductsLoading } = useQuery({
    queryKey: [`/api/cannabis-products?ownerId=${user?.id}`],
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get unique locations for filtering
  const locations = cannabisProducts 
    ? ["all", ...new Set(cannabisProducts.map((product: any) => product.location))]
    : ["all"];

  // Filter and sort cannabis products
  const getFilteredAndSortedProducts = (products: any[] | undefined) => {
    if (!products) return [];
    
    return products
      .filter((product) => {
        // Search filter
        const matchesSearch = 
          searchQuery === "" || 
          product.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.strain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Location filter
        const matchesLocation = filterLocation === "all" || product.location === filterLocation;
        
        return matchesSearch && matchesLocation;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "price-asc":
            return (a.pricePerUnit || 0) - (b.pricePerUnit || 0);
          case "price-desc":
            return (b.pricePerUnit || 0) - (a.pricePerUnit || 0);
          case "thc-asc":
            return (a.thcContent || 0) - (b.thcContent || 0);
          case "thc-desc":
            return (b.thcContent || 0) - (a.thcContent || 0);
          case "cbd-asc":
            return (a.cbdContent || 0) - (b.cbdContent || 0);
          case "cbd-desc":
            return (b.cbdContent || 0) - (a.cbdContent || 0);
          case "quantity-asc":
            return a.quantity - b.quantity;
          case "quantity-desc":
            return b.quantity - a.quantity;
          default:
            return 0;
        }
      });
  };

  const filteredMarketProducts = getFilteredAndSortedProducts(cannabisProducts);
  const filteredUserProducts = getFilteredAndSortedProducts(userCannabisProducts);

  return (
    <MainLayout>
      <div className="container py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Cannabis Listings</h1>
          
          <div className="flex mt-4 sm:mt-0 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-8 max-w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location === "all" ? "All Locations" : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="thc-asc">THC: Low to High</SelectItem>
                <SelectItem value="thc-desc">THC: High to Low</SelectItem>
                <SelectItem value="cbd-asc">CBD: Low to High</SelectItem>
                <SelectItem value="cbd-desc">CBD: High to Low</SelectItem>
                <SelectItem value="quantity-asc">Quantity: Low to High</SelectItem>
                <SelectItem value="quantity-desc">Quantity: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs defaultValue="market" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="market">Marketplace</TabsTrigger>
            <TabsTrigger value="my-products">My Listings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMarketProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-500">No cannabis listings found</p>
                {user && (
                  <Button 
                    className="mt-4 bg-primary"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Cannabis Listing
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMarketProducts.map((product: any) => (
                  <CannabisProductCard 
                    key={product.id} 
                    cannabisProduct={product}
                    isOwner={user && user.id === product.ownerId}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my-products">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-500">Please log in to view your listings</p>
              </div>
            ) : isUserProductsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUserProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-500">You haven't created any cannabis listings yet</p>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="mt-4 bg-primary">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Cannabis Listing
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Cannabis Listing</DialogTitle>
                      <DialogDescription>
                        Provide details about your cannabis listing to publish it on the marketplace.
                      </DialogDescription>
                    </DialogHeader>
                    <CannabisProductForm onSuccess={() => setIsCreateDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Cannabis Listing
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create Cannabis Listing</DialogTitle>
                        <DialogDescription>
                          Provide details about your cannabis listing to publish it on the marketplace.
                        </DialogDescription>
                      </DialogHeader>
                      <CannabisProductForm onSuccess={() => setIsCreateDialogOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUserProducts.map((product: any) => (
                    <CannabisProductCard 
                      key={product.id} 
                      cannabisProduct={product}
                      isOwner={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}