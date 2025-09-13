import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  UserPlus, 
  Handshake, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Building2,
  Mail,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/main-layout";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inviteMandateSchema = z.object({
  sellerEmail: z.string().email("Please enter a valid email address"),
  commissionType: z.enum(["flat", "percent"]),
  commissionRate: z.number().min(0, "Commission rate must be positive"),
  description: z.string().optional(),
  expiresAt: z.string().min(1, "Expiration date is required"),
});

type InviteMandateForm = z.infer<typeof inviteMandateSchema>;

interface Mandate {
  id: number;
  sellerOrgName: string;
  status: string;
  commissionType: string;
  commissionRate: number;
  createdAt: string;
  expiresAt: string;
  totalListings?: number;
  totalCommissions?: number;
}

interface BrokerStats {
  activeMandates: number;
  totalCommissions: number;
  totalListings: number;
  pendingInvitations: number;
}

export default function BrokerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Redirect if not a broker
  useEffect(() => {
    if (user && user.role !== 'broker') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch broker stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/broker/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/broker/stats');
      return await res.json() as BrokerStats;
    },
  });

  // Fetch broker mandates
  const { data: mandates, isLoading: mandatesLoading } = useQuery({
    queryKey: ['/api/broker/mandates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/broker/mandates');
      return await res.json() as Mandate[];
    },
  });

  const inviteForm = useForm<InviteMandateForm>({
    resolver: zodResolver(inviteMandateSchema),
    defaultValues: {
      sellerEmail: "",
      commissionType: "percent",
      commissionRate: 5.0,
      description: "",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    },
  });

  // Invite mandate mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteMandateForm) => {
      const res = await apiRequest('POST', '/api/broker/invite-mandate', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "The seller will receive an email with your mandate invitation.",
      });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/broker/mandates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/broker/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onInviteSubmit = (data: InviteMandateForm) => {
    inviteMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
      'pending': { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      'expired': { variant: 'outline' as const, icon: XCircle, color: 'text-red-600' },
      'revoked': { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const mandateColumns = [
    {
      header: "Seller Organization",
      accessorKey: "sellerOrgName",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      header: "Commission",
      accessorKey: "commissionRate",
      cell: ({ row }: any) => {
        const mandate = row.original;
        return mandate.commissionType === 'percent' 
          ? `${mandate.commissionRate}%` 
          : `$${mandate.commissionRate}`;
      },
    },
    {
      header: "Listings",
      accessorKey: "totalListings",
      cell: ({ row }: any) => row.original.totalListings || 0,
    },
    {
      header: "Total Earned",
      accessorKey: "totalCommissions",
      cell: ({ row }: any) => `$${(row.original.totalCommissions || 0).toFixed(2)}`,
    },
    {
      header: "Expires",
      accessorKey: "expiresAt",
      cell: ({ row }: any) => new Date(row.original.expiresAt).toLocaleDateString(),
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#173c1e]">Broker Dashboard</h1>
            <p className="text-[#173c1e]/70">
              Manage your seller mandates and track commission earnings
            </p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Seller
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Invite Seller to Mandate</DialogTitle>
                <DialogDescription>
                  Send a mandate invitation to a seller. They can accept, reject, or negotiate terms.
                </DialogDescription>
              </DialogHeader>
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                  <FormField
                    control={inviteForm.control}
                    name="sellerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="seller@example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={inviteForm.control}
                      name="commissionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percent">Percentage</SelectItem>
                              <SelectItem value="flat">Flat Rate</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="commissionRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {inviteForm.watch('commissionType') === 'percent' ? 'Rate (%)' : 'Amount ($)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={inviteForm.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mandate Expires</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional terms or notes..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={inviteMutation.isPending}
                      className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                    >
                      {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Mandates</CardTitle>
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#173c1e]">
                {statsLoading ? "..." : stats?.activeMandates || 0}
              </div>
              <p className="text-xs text-muted-foreground">Current partnerships</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#173c1e]">
                ${statsLoading ? "..." : (stats?.totalCommissions || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Commission earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Listings Managed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#173c1e]">
                {statsLoading ? "..." : stats?.totalListings || 0}
              </div>
              <p className="text-xs text-muted-foreground">On behalf of sellers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#173c1e]">
                {statsLoading ? "..." : stats?.pendingInvitations || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </CardContent>
          </Card>
        </div>

        {/* Mandates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#173c1e]">
              <Building2 className="w-5 h-5 mr-2" />
              My Mandates
            </CardTitle>
            <CardDescription>
              Manage your seller relationships and track performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mandatesLoading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Loading mandates...</div>
              </div>
            ) : mandates && mandates.length > 0 ? (
              <DataTable
                columns={mandateColumns}
                data={mandates}
              />
            ) : (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  No mandates found. Start by inviting sellers to work with you.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}