import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Building2, 
  Users, 
  Handshake, 
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  UserPlus,
  Mail,
  DollarSign,
  Calendar,
  FileText
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";

interface Organization {
  id: number;
  name: string;
  region: string;
  isVerified: boolean;
  createdAt: string;
  totalListings?: number;
  totalSales?: number;
}

interface MandateInvitation {
  id: number;
  brokerName: string;
  brokerEmail: string;
  commissionType: string;
  commissionRate: number;
  description?: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
}

interface ActiveMandate {
  id: number;
  brokerName: string;
  brokerEmail: string;
  commissionType: string;
  commissionRate: number;
  status: 'active' | 'suspended' | 'terminated';
  createdAt: string;
  expiresAt: string;
  totalListings: number;
  totalCommissions: number;
}

interface OrganizationStats {
  totalListings: number;
  activeMandates: number;
  pendingInvitations: number;
  totalCommissionsPaid: number;
}

export default function OrganizationAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInvitation, setSelectedInvitation] = useState<MandateInvitation | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Redirect if not a seller
  useEffect(() => {
    if (user && user.role !== 'seller') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch organization data
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['/api/seller/organization'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/seller/organization');
      return await res.json() as Organization;
    },
  });

  // Fetch organization stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/seller/organization/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/seller/organization/stats');
      return await res.json() as OrganizationStats;
    },
  });

  // Fetch mandate invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['/api/seller/mandate-invitations'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/seller/mandate-invitations');
      return await res.json() as MandateInvitation[];
    },
  });

  // Fetch active mandates
  const { data: activeMandates, isLoading: mandatesLoading } = useQuery({
    queryKey: ['/api/seller/active-mandates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/seller/active-mandates');
      return await res.json() as ActiveMandate[];
    },
  });

  // Respond to mandate invitation mutation
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ invitationId, action }: { invitationId: number; action: 'accept' | 'reject' }) => {
      const res = await apiRequest('POST', `/api/seller/mandate-invitations/${invitationId}/respond`, { action });
      return await res.json();
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === 'accept' ? "Mandate accepted!" : "Invitation declined",
        description: action === 'accept' 
          ? "The broker can now manage listings on your behalf." 
          : "The invitation has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/seller/mandate-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seller/active-mandates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seller/organization/stats'] });
      setIsDetailsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to respond to invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Terminate mandate mutation
  const terminateMandateMutation = useMutation({
    mutationFn: async (mandateId: number) => {
      const res = await apiRequest('POST', `/api/seller/mandates/${mandateId}/terminate`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mandate terminated",
        description: "The broker's access has been revoked.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/seller/active-mandates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seller/organization/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to terminate mandate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      'accepted': { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
      'rejected': { variant: 'outline' as const, icon: XCircle, color: 'text-red-600' },
      'expired': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      'active': { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
      'suspended': { variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-600' },
      'terminated': { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
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

  const invitationColumns = [
    {
      header: "Broker",
      accessorKey: "brokerName",
    },
    {
      header: "Email",
      accessorKey: "brokerEmail",
    },
    {
      header: "Commission",
      accessorKey: "commissionRate",
      cell: ({ row }: any) => {
        const invitation = row.original;
        return invitation.commissionType === 'percent' 
          ? `${invitation.commissionRate}%` 
          : `$${invitation.commissionRate}`;
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      header: "Expires",
      accessorKey: "expiresAt",
      cell: ({ row }: any) => new Date(row.original.expiresAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      cell: ({ row }: any) => {
        const invitation = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedInvitation(invitation);
                setIsDetailsDialogOpen(true);
              }}
            >
              <Eye className="w-3 h-3" />
            </Button>
            {invitation.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => respondToInvitationMutation.mutate({ 
                    invitationId: invitation.id, 
                    action: 'accept' 
                  })}
                  disabled={respondToInvitationMutation.isPending}
                  className="text-green-600 hover:text-green-700"
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => respondToInvitationMutation.mutate({ 
                    invitationId: invitation.id, 
                    action: 'reject' 
                  })}
                  disabled={respondToInvitationMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  Decline
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const mandateColumns = [
    {
      header: "Broker",
      accessorKey: "brokerName",
    },
    {
      header: "Email",
      accessorKey: "brokerEmail",
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
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      header: "Listings",
      accessorKey: "totalListings",
    },
    {
      header: "Total Paid",
      accessorKey: "totalCommissions",
      cell: ({ row }: any) => `$${(row.original.totalCommissions || 0).toFixed(2)}`,
    },
    {
      header: "Actions",
      cell: ({ row }: any) => {
        const mandate = row.original;
        if (mandate.status === 'active') {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => terminateMandateMutation.mutate(mandate.id)}
              disabled={terminateMandateMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              Terminate
            </Button>
          );
        }
        return null;
      },
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
            <h1 className="text-3xl font-bold text-[#173c1e]">Organization Admin</h1>
            <p className="text-[#173c1e]/70">
              Manage your organization, broker relationships, and mandates
            </p>
          </div>
        </div>

        {/* Organization Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-[#173c1e]">
              <Building2 className="w-5 h-5 mr-2" />
              {orgLoading ? "Loading..." : organization?.name || "Organization"}
            </CardTitle>
            <CardDescription>
              {orgLoading ? "Loading organization details..." : (
                <>
                  {organization?.region && `Located in ${organization.region} • `}
                  {organization?.isVerified ? (
                    <Badge variant="default" className="text-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Verification Pending
                    </Badge>
                  )}
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#173c1e]">
                {statsLoading ? "..." : stats?.totalListings || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active products</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Mandates</CardTitle>
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#173c1e]">
                {statsLoading ? "..." : stats?.activeMandates || 0}
              </div>
              <p className="text-xs text-muted-foreground">Broker partnerships</p>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commissions Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#173c1e]">
                ${statsLoading ? "..." : (stats?.totalCommissionsPaid || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total broker fees</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Invitations and Active Mandates */}
        <Tabs defaultValue="invitations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invitations">Mandate Invitations</TabsTrigger>
            <TabsTrigger value="mandates">Active Mandates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#173c1e]">
                  <Mail className="w-5 h-5 mr-2" />
                  Mandate Invitations
                </CardTitle>
                <CardDescription>
                  Review and respond to broker mandate invitations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">Loading invitations...</div>
                  </div>
                ) : invitations && invitations.length > 0 ? (
                  <DataTable
                    columns={invitationColumns}
                    data={invitations}
                  />
                ) : (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">
                      No mandate invitations found.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mandates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#173c1e]">
                  <Handshake className="w-5 h-5 mr-2" />
                  Active Mandates
                </CardTitle>
                <CardDescription>
                  Manage your active broker relationships and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mandatesLoading ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">Loading mandates...</div>
                  </div>
                ) : activeMandates && activeMandates.length > 0 ? (
                  <DataTable
                    columns={mandateColumns}
                    data={activeMandates}
                  />
                ) : (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">
                      No active mandates found. Accept broker invitations to get started.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Invitation Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Mandate Invitation Details</DialogTitle>
              <DialogDescription>
                Review the full details of this broker mandate invitation
              </DialogDescription>
            </DialogHeader>
            {selectedInvitation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Broker Name</label>
                    <p className="text-sm">{selectedInvitation.brokerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{selectedInvitation.brokerEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Commission Type</label>
                    <p className="text-sm">{selectedInvitation.commissionType === 'percent' ? 'Percentage' : 'Flat Rate'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Commission Rate</label>
                    <p className="text-sm">
                      {selectedInvitation.commissionType === 'percent' 
                        ? `${selectedInvitation.commissionRate}%` 
                        : `$${selectedInvitation.commissionRate}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedInvitation.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Expires</label>
                    <p className="text-sm">{new Date(selectedInvitation.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {selectedInvitation.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{selectedInvitation.description}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDetailsDialogOpen(false)}
              >
                Close
              </Button>
              {selectedInvitation?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => selectedInvitation && respondToInvitationMutation.mutate({ 
                      invitationId: selectedInvitation.id, 
                      action: 'reject' 
                    })}
                    disabled={respondToInvitationMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={() => selectedInvitation && respondToInvitationMutation.mutate({ 
                      invitationId: selectedInvitation.id, 
                      action: 'accept' 
                    })}
                    disabled={respondToInvitationMutation.isPending}
                    className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                  >
                    Accept Mandate
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}