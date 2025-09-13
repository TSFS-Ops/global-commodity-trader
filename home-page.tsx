import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityTable, ActivityItem } from "@/components/dashboard/activity-table";
import { ProfileCard } from "@/components/profile/profile-card";
import { MarketTrends } from "@/components/dashboard/market-trends";
import { ListingCard } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, DollarSign, Handshake, Leaf, PackageCheck, RefreshCw } from "lucide-react";
import { StatsCardSkeletonRow } from "@/components/skeletons/stats-card-skeleton";
import { ActivityTableSkeleton } from "@/components/skeletons/activity-table-skeleton";
import { ProfileCardSkeleton } from "@/components/skeletons/profile-card-skeleton";
import { ListingCardSkeletonGrid } from "@/components/skeletons/listing-card-skeleton";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  
  // Use combined dashboard overview endpoint for better performance
  const { data: overview, isLoading: isOverviewLoading, error: overviewError, refetch: refetchOverview } = useQuery<{
    stats: {
      cannabisListings: number;
      totalQuantity: number;
      avgPrice: number;
      activeSuppliers: number;
    };
    activity: any[];
    featuredListings: any[];
    success: boolean;
  }>({
    queryKey: ['/api/dashboard/overview'],
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Extract data from combined response with fallbacks
  const stats = overview?.stats || { 
    cannabisListings: 0, 
    totalQuantity: 0, 
    avgPrice: 0, 
    activeSuppliers: 0 
  };
  const activityData = overview?.activity || [];
  const featuredListings = overview?.featuredListings || [];
  const hasOverviewError = overviewError || !overview?.success;

  // Market trends with longer cache (15 minutes)
  const { data: marketTrends, isLoading: isTrendsLoading } = useQuery({
    queryKey: ["/api/market-trends/latest"],
    staleTime: 15 * 60 * 1000, // Longer cache for trends
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Check loading states
  const isStatsLoading = isOverviewLoading || !overview;
  const isListingsLoading = isOverviewLoading;
  const isActivityLoading = isOverviewLoading;

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">
              Welcome back, {user.fullName?.split(' ')[0] || user.username}
            </h1>
            <p className="text-neutral-600">
              Cannabis Trading Platform
            </p>
          </div>
          <div className="flex gap-2">
            {(user?.role === 'seller' || user?.role === 'admin') && (
              <Button asChild>
                <Link to="/listings/create">
                  Create Listing
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Real Stats - No Mock Data */}
        {isStatsLoading ? (
          <StatsCardSkeletonRow count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Cannabis Listings"
              value={`${stats.cannabisListings}`}
              icon={<PackageCheck size={16} />}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            
            <StatsCard
              title="Total Available"
              value={`${stats.totalQuantity}kg`}
              icon={<Handshake size={16} />}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            
            <StatsCard
              title="Avg Price Range"
              value={`R${stats.avgPrice}/kg`}
              icon={<DollarSign size={16} />}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
            
            <StatsCard
              title="Active Suppliers"
              value={`${stats.activeSuppliers}`}
              icon={<Leaf size={16} />}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile and Actions */}
          <div className="space-y-6">
            {isStatsLoading ? <ProfileCardSkeleton /> : <ProfileCard user={user} />}
          </div>

          {/* Right Column - Market Data and Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-neutral-800">Market Overview</h2>
                <Link to="/search">
                  <Button variant="link" className="text-primary hover:text-primary-dark">
                    View Details
                  </Button>
                </Link>
              </div>
              
              {isTrendsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <MarketTrends 
                  trends={(marketTrends as any) || []} 
                  onViewAllClick={() => navigate('/search')}
                />
              )}
            </div>
            
            {/* Recent Activity - Real Data Only */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-medium text-neutral-800">Recent Activity</h2>
                <Link to="/orders">
                  <Button variant="link" className="text-primary hover:text-primary-dark">
                    View All
                  </Button>
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                {isActivityLoading ? (
                  <ActivityTableSkeleton rows={5} />
                ) : activityData.length > 0 ? (
                  <ActivityTable data={activityData} />
                ) : (
                  <div className="p-8 text-center text-neutral-600">
                    No transaction activity yet. Start trading cannabis to see activity here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Listings */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-neutral-800">Featured Cannabis Listings</h2>
            <Link to="/listings">
              <Button variant="link" className="text-primary hover:text-primary-dark">
                View All
              </Button>
            </Link>
          </div>
          
          {isListingsLoading ? (
            <ListingCardSkeletonGrid count={6} />
          ) : featuredListings && featuredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredListings.slice(0, 6).map((listing: any) => (
                <ListingCard 
                  key={listing.id} 
                  id={listing.id}
                  title={listing.title}
                  description={listing.description}
                  category={listing.category}
                  price={listing.price}
                  priceNumeric={listing.priceNumeric}
                  unit={listing.unit}
                  location={listing.location}
                  image={listing.image}
                  status={listing.status}
                  minOrder={listing.minOrder}
                  isFeatured={listing.isFeatured}
                  socialImpactScore={listing.socialImpactScore}
                  socialImpactCategory={listing.socialImpactCategory}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-600">
              No featured cannabis listings available. Check back later for new offerings.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}