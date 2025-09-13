import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/listings/listing-card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { 
  Loader2, 
  Edit, 
  Check, 
  X, 
  DollarSign, 
  ShoppingBag, 
  MapPin, 
  Building, 
  AtSign, 
  User as UserIcon 
} from "lucide-react";

// Profile form schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().optional(),
  company: z.string().optional(),
  location: z.string().min(2, "Location must be at least 2 characters"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: userListings, isLoading: isListingsLoading } = useQuery({
    queryKey: [`/api/listings?mine=true`],
    enabled: !!user && user.role === 'seller',
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: userOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      bio: user?.bio || "",
      company: user?.company || "",
      location: user?.location || undefined,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onProfileSubmit(data: ProfileFormValues) {
    updateProfileMutation.mutate(data);
  }

  // Format the user's listings - handle API response format
  const formattedListings = Array.isArray(userListings?.items)
    ? userListings.items.map((listing: any) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description || "",
        category: listing.category,
        price: `$${listing.pricePerUnit}`,
        priceNumeric: listing.pricePerUnit,
        unit: listing.unit,
        location: listing.location,
        image: listing.images && listing.images.length > 0 ? listing.images[0] : undefined,
        status: listing.status === 'active' ? 'available' : (listing.status === 'pending' ? 'limited' : 'sold'),
        minOrder: `${listing.minOrderQuantity} ${listing.unit}`,
        isFeatured: listing.isFeatured,
      }))
    : [];

  // Define columns for orders table
  const orderColumns: ColumnDef<any>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
    },
    {
      accessorKey: "listingId",
      header: "Product",
      cell: ({ row }) => row.original.listing?.title || `Product #${row.original.listingId}`,
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => <span className="font-medium">${row.original.totalPrice.toFixed(2)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const statusClasses: Record<string, string> = {
          pending: "bg-yellow-100 text-yellow-800",
          processing: "bg-blue-100 text-blue-800",
          completed: "bg-green-100 text-green-800",
          cancelled: "bg-red-100 text-red-800",
        };
        const statusClass = statusClasses[status] || "bg-gray-100 text-gray-800";
        
        return (
          <Badge className={`${statusClass} border-0`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ];

  if (!user) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-2">Authentication required</h2>
            <p className="text-neutral-600 mb-4">Please log in to view your profile</p>
            <Button onClick={() => window.location.href = '/auth'}>
              Log In
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">My Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Profile info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={user.profileImage} alt={user.fullName} />
                  <AvatarFallback className="text-lg">{getInitials(user.fullName)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold mb-1">{user.fullName}</h2>
                <p className="text-neutral-600 mb-2">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                
                {user.isVerified && (
                  <Badge className="bg-green-100 text-green-800 mb-2 border-0">
                    Verified User
                  </Badge>
                )}
                
                {user.verificationLevel && (
                  <Badge variant="outline" className="mb-2">
                    Tier {user.verificationLevel}
                  </Badge>
                )}
                
                {user.rating && (
                  <div className="flex items-center justify-center mb-4">
                    {[...Array(Math.floor(user.rating))].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400">
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                      </svg>
                    ))}
                    {user.rating % 1 >= 0.5 && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400">
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                      </svg>
                    )}
                    {[...Array(5 - Math.ceil(user.rating))].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-sm text-neutral-600">({user.rating.toFixed(1)})</span>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                {isEditing ? (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 w-full">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem className="flex items-center">
                            <UserIcon className="h-5 w-5 text-neutral-400 mr-2" />
                            <FormControl>
                              <Input placeholder="Full Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="flex items-center">
                            <AtSign className="h-5 w-5 text-neutral-400 mr-2" />
                            <FormControl>
                              <Input placeholder="Email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem className="flex items-center">
                            <Building className="h-5 w-5 text-neutral-400 mr-2" />
                            <FormControl>
                              <Input placeholder="Company (Optional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem className="flex items-center">
                            <MapPin className="h-5 w-5 text-neutral-400 mr-2" />
                            <FormControl>
                              <Input placeholder="Location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell us about yourself"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <>
                    <div className="space-y-2 w-full">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-neutral-400 mr-2" />
                        <span>{user.fullName}</span>
                      </div>
                      <div className="flex items-center">
                        <AtSign className="h-5 w-5 text-neutral-400 mr-2" />
                        <span>{user.email}</span>
                      </div>
                      {user.company && (
                        <div className="flex items-center">
                          <Building className="h-5 w-5 text-neutral-400 mr-2" />
                          <span>{user.company}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <MapPin className="h-5 w-5 text-neutral-400 mr-2" />
                        <span>{user.location}</span>
                      </div>
                    </div>
                    
                    {user.bio && (
                      <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
                        <p className="text-neutral-600 text-sm">{user.bio}</p>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Stats card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Account Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm text-neutral-600">Completed Trades</h4>
                    <p className="text-2xl font-bold">
                      {isOrdersLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        Array.isArray(userOrders) ? userOrders.filter((order: any) => order.status === 'completed').length : 0
                      )}
                    </p>
                  </div>
                </div>
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm text-neutral-600">
                      {user.role === 'seller' ? 'Active Listings' : 'Pending Orders'}
                    </h4>
                    <p className="text-2xl font-bold">
                      {user.role === 'seller' ? (
                        isListingsLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                          formattedListings.filter(listing => listing.status === 'available').length
                        )
                      ) : (
                        isOrdersLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                          Array.isArray(userOrders) ? userOrders.filter((order: any) => order.status === 'pending').length : 0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Activities and listings */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="orders">
            <TabsList className="mb-4">
              <TabsTrigger value="orders">My Orders</TabsTrigger>
              {user.role === 'seller' && (
                <TabsTrigger value="listings">My Listings</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>View and manage your orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {isOrdersLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : Array.isArray(userOrders) && userOrders.length > 0 ? (
                    <DataTable 
                      columns={orderColumns} 
                      data={userOrders} 
                      searchKey="id"
                      searchPlaceholder="Search orders..."
                    />
                  ) : (
                    <div className="text-center p-8">
                      <ShoppingBag className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                      <p className="text-neutral-600 mb-4">You haven't placed any orders.</p>
                      <Button onClick={() => window.location.href = '/listings'}>
                        Browse Listings
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {user.role === 'seller' && (
              <TabsContent value="listings">
                <Card>
                  <CardHeader>
                    <CardTitle>My Listings</CardTitle>
                    <CardDescription>Manage your product listings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isListingsLoading ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : formattedListings && formattedListings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formattedListings.map((listing) => (
                          <ListingCard key={listing.id} {...listing} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <ShoppingBag className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No listings yet</h3>
                        <p className="text-neutral-600 mb-4">You haven't created any listings.</p>
                        <Button onClick={() => window.location.href = '/listings/new'}>
                          Create New Listing
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => window.location.href = '/listings/new'}
                    >
                      Create New Listing
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
