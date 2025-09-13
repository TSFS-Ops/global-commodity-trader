import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { CarbonCreditCard } from "@/components/carbon-credits/carbon-credit-card";
import { CarbonCreditForm } from "@/components/carbon-credits/carbon-credit-form";
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

export default function CarbonCreditsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: carbonCredits, isLoading } = useQuery({
    queryKey: ["/api/carbon-credits"],
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: userCarbonCredits, isLoading: isUserCreditsLoading } = useQuery({
    queryKey: [`/api/carbon-credits?ownerId=${user?.id}`],
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get unique locations for filtering
  const locations = carbonCredits 
    ? ["all", ...new Set(carbonCredits.map((credit: any) => credit.location))]
    : ["all"];

  // Filter and sort carbon credits
  const getFilteredAndSortedCredits = (credits: any[] | undefined) => {
    if (!credits) return [];
    
    return credits
      .filter((credit) => {
        // Search filter
        const matchesSearch = 
          searchQuery === "" || 
          credit.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          credit.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Location filter
        const matchesLocation = filterLocation === "all" || credit.location === filterLocation;
        
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
          case "quantity-asc":
            return a.quantity - b.quantity;
          case "quantity-desc":
            return b.quantity - a.quantity;
          default:
            return 0;
        }
      });
  };

  const filteredMarketCredits = getFilteredAndSortedCredits(carbonCredits);
  const filteredUserCredits = getFilteredAndSortedCredits(userCarbonCredits);

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2 md:mb-0">Carbon Credits</h1>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark text-white">
                <Plus size={18} className="mr-2" />
                Register Carbon Credits
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Register Carbon Credits</DialogTitle>
                <DialogDescription>
                  Fill in the details to register your carbon credits for trade.
                </DialogDescription>
              </DialogHeader>
              <CarbonCreditForm onSuccess={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="Search carbon credit projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Location" />
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
                <SelectItem value="quantity-asc">Quantity: Low to High</SelectItem>
                <SelectItem value="quantity-desc">Quantity: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="marketplace">
        <TabsList className="mb-6">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="my-credits">My Carbon Credits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="marketplace">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMarketCredits.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-800 mb-2">No carbon credits found</h3>
              <p className="text-neutral-600 mb-6">Try adjusting your search criteria</p>
              <Button variant="outline" onClick={() => {
                setSearchQuery("");
                setFilterLocation("all");
                setSortOrder("newest");
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMarketCredits.map((credit: any) => (
                <CarbonCreditCard 
                  key={credit.id} 
                  carbonCredit={credit}
                  isOwner={credit.ownerId === user?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="my-credits">
          {!user ? (
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
              <h3 className="text-lg font-medium text-neutral-800 mb-2">Authentication Required</h3>
              <p className="text-neutral-600 mb-6">Please log in to view your carbon credits</p>
              <Button onClick={() => window.location.href = '/auth'}>
                Log In
              </Button>
            </div>
          ) : isUserCreditsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUserCredits.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-800 mb-2">No carbon credits found</h3>
              <p className="text-neutral-600 mb-6">You haven't registered any carbon credits yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Register Carbon Credits
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUserCredits.map((credit: any) => (
                <CarbonCreditCard 
                  key={credit.id} 
                  carbonCredit={credit}
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
