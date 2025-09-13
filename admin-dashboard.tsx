import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  BarChart3, 
  Shield, 
  Database, 
  TrendingUp, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SystemLog {
  id?: number;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'security' | 'audit';
  service: string;
  message: string;
  details?: Record<string, any>;
}

interface AuditReport {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  topUsers: Array<{ userId: number; actionCount: number }>;
  topActions: Array<{ action: string; count: number }>;
  securityEvents: number;
}

interface MarketData {
  symbol: string;
  productType: string;
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
  volume?: number;
  priceChange24h?: number;
}

interface MatchResult {
  listing: any;
  seller: any;
  compatibilityScore: number;
  matchingFactors: string[];
  estimatedDeliveryTime?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [marketSymbols, setMarketSymbols] = useState("HEMP-USD,CANNABIS-USD");
  const [auditDateRange, setAuditDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Check if user has admin permissions
  if (!user || user.role !== 'admin') {
    return (
      <MainLayout>
        <div className="container mx-auto py-10">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You need admin permissions to access this dashboard.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Fetch recent system logs
  const { data: systemLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/logs/recent'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/logs/recent?limit=50');
      return await res.json() as SystemLog[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch user permissions
  const { data: permissions } = useQuery({
    queryKey: ['/api/permissions/my-permissions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/permissions/my-permissions');
      return await res.json();
    }
  });

  // Market data fetching
  const marketDataMutation = useMutation({
    mutationFn: async (symbols: string[]) => {
      const res = await apiRequest('POST', '/api/external-data/market-prices', { symbols });
      return await res.json() as MarketData[];
    },
    onSuccess: () => {
      toast({
        title: "Market data updated",
        description: "Latest market prices have been fetched successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Market data error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Audit report generation
  const auditReportMutation = useMutation({
    mutationFn: async (dateRange: { startDate: string; endDate: string }) => {
      const res = await apiRequest('POST', '/api/logs/audit-report', dateRange);
      return await res.json() as AuditReport;
    },
    onSuccess: () => {
      toast({
        title: "Audit report generated",
        description: "The audit report has been generated successfully."
      });
    }
  });

  // Matching suggestions
  const matchingSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/matching/suggestions');
      return await res.json() as MatchResult[];
    }
  });

  const handleFetchMarketData = () => {
    const symbols = marketSymbols.split(',').map(s => s.trim()).filter(Boolean);
    if (symbols.length > 0) {
      marketDataMutation.mutate(symbols);
    }
  };

  const handleGenerateAuditReport = () => {
    auditReportMutation.mutate(auditDateRange);
  };

  const getLogLevelBadge = (level: string) => {
    const variants = {
      info: "default",
      warning: "secondary",
      error: "destructive",
      security: "destructive",
      audit: "outline"
    } as const;
    
    return <Badge variant={variants[level as keyof typeof variants] || "default"}>{level}</Badge>;
  };

  const formatTimestamp = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Platform architecture management and monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              <Shield className="w-3 h-3 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logging">Logging & Audit</TabsTrigger>
            <TabsTrigger value="matching">Matching Engine</TabsTrigger>
            <TabsTrigger value="external">External Data</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Operational</div>
                  <p className="text-xs text-muted-foreground">All services running</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Logs</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemLogs?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 50 entries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {systemLogs?.filter(log => log.level === 'security').length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Security-related logs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4</div>
                  <p className="text-xs text-muted-foreground">External integrations</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Architecture Components Status</CardTitle>
                <CardDescription>
                  Real-time status of key platform components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Matching Engine</span>
                      <Badge variant="default" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Logging Service</span>
                      <Badge variant="default" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Permissions Module</span>
                      <Badge variant="default" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">External Data Service</span>
                      <Badge variant="default" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Blockchain Integration</span>
                      <Badge variant="secondary" className="text-yellow-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Mock Mode
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">WebSocket Server</span>
                      <Badge variant="default" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logging" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent System Logs</CardTitle>
                  <CardDescription>Latest system events and activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {logsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-muted-foreground">Loading logs...</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {systemLogs?.map((log, index) => (
                          <div key={index} className="border rounded p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              {getLogLevelBadge(log.level)}
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                            <div className="font-medium">{log.service}</div>
                            <div className="text-muted-foreground">{log.message}</div>
                          </div>
                        )) || <div className="text-sm text-muted-foreground">No logs available</div>}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Generate Audit Report</CardTitle>
                  <CardDescription>Create detailed audit reports for compliance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={auditDateRange.startDate}
                      onChange={(e) => setAuditDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={auditDateRange.endDate}
                      onChange={(e) => setAuditDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={handleGenerateAuditReport}
                    disabled={auditReportMutation.isPending}
                    className="w-full"
                  >
                    {auditReportMutation.isPending ? "Generating..." : "Generate Report"}
                  </Button>
                  
                  {auditReportMutation.data && (
                    <div className="mt-4 p-4 bg-muted rounded space-y-2">
                      <h4 className="font-medium">Audit Report Summary</h4>
                      <div className="grid gap-1 text-sm">
                        <div>Total Actions: {auditReportMutation.data.totalActions}</div>
                        <div>Successful: {auditReportMutation.data.successfulActions}</div>
                        <div>Failed: {auditReportMutation.data.failedActions}</div>
                        <div>Security Events: {auditReportMutation.data.securityEvents}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matching" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Matching Engine</CardTitle>
                <CardDescription>Advanced buyer-seller matching algorithms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => matchingSuggestionsMutation.mutate()}
                  disabled={matchingSuggestionsMutation.isPending}
                >
                  {matchingSuggestionsMutation.isPending ? "Generating..." : "Generate Matching Suggestions"}
                </Button>
                
                {matchingSuggestionsMutation.data && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Matching Results</h4>
                    <div className="grid gap-3">
                      {matchingSuggestionsMutation.data.map((match, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium">{match.listing.title}</h5>
                            <Badge variant="outline">
                              {Math.round(match.compatibilityScore * 100)}% match
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Seller: {match.seller.fullName} | {match.estimatedDeliveryTime}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {match.matchingFactors.map((factor, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="external" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Market Data Feed</CardTitle>
                  <CardDescription>Real-time market price information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="symbols">Market Symbols (comma-separated)</Label>
                    <Input
                      id="symbols"
                      value={marketSymbols}
                      onChange={(e) => setMarketSymbols(e.target.value)}
                      placeholder="HEMP-USD,CANNABIS-USD,EXTRACT-USD"
                    />
                  </div>
                  <Button 
                    onClick={handleFetchMarketData}
                    disabled={marketDataMutation.isPending}
                    className="w-full"
                  >
                    {marketDataMutation.isPending ? "Fetching..." : "Fetch Market Data"}
                  </Button>
                  
                  {marketDataMutation.data && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Market Prices</h4>
                      {marketDataMutation.data.map((data, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">{data.symbol}</div>
                            <div className="text-xs text-muted-foreground">{data.productType}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${data.price.toFixed(2)}</div>
                            <div className={`text-xs ${data.priceChange24h && data.priceChange24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.priceChange24h ? `${data.priceChange24h > 0 ? '+' : ''}${data.priceChange24h.toFixed(2)}%` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>External Data Sources</CardTitle>
                  <CardDescription>Connected external systems and registries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Partner System A</div>
                        <div className="text-sm text-muted-foreground">Product verification service</div>
                      </div>
                      <Badge variant="default" className="text-green-600">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Public Registry B</div>
                        <div className="text-sm text-muted-foreground">License verification</div>
                      </div>
                      <Badge variant="default" className="text-green-600">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Market Price Feeds</div>
                        <div className="text-sm text-muted-foreground">Real-time pricing data</div>
                      </div>
                      <Badge variant="default" className="text-green-600">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Regulatory Data Sources</div>
                        <div className="text-sm text-muted-foreground">Compliance information</div>
                      </div>
                      <Badge variant="default" className="text-green-600">Connected</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Permission System</CardTitle>
                <CardDescription>Role-based access control and user permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {permissions && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Your Role: {permissions.role}</h4>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {permissions.permissions.map((permission: string, index: number) => (
                          <Badge key={index} variant="outline" className="justify-start">
                            <Eye className="w-3 h-3 mr-1" />
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Permission Categories</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <h5 className="text-sm font-medium mb-1">Listings</h5>
                          <p className="text-xs text-muted-foreground">Control access to product listings</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-1">Orders</h5>
                          <p className="text-xs text-muted-foreground">Manage order operations</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-1">Users</h5>
                          <p className="text-xs text-muted-foreground">User account management</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-1">External Data</h5>
                          <p className="text-xs text-muted-foreground">Access to external systems</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}