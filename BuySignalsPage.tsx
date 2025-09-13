import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  DollarSign, 
  Eye, 
  MessageSquare, 
  AlertCircle,
  Leaf,
  Calendar
} from 'lucide-react';

interface BuySignal {
  id: number;
  title: string;
  description: string;
  category: string;
  targetQuantity?: number;
  unit?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency: string;
  preferredLocation?: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  isActive: boolean;
  expiresAt?: string;
  responseCount: number;
  viewCount: number;
  createdAt: string;
  buyer?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function BuySignalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const { data: signalsData, isLoading } = useQuery({
    queryKey: ['/api/buy-signals', { 
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      search: searchQuery || undefined 
    }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: mySignalsData } = useQuery({
    queryKey: ['/api/my-buy-signals'],
    enabled: !!user,
  });

  const signals = (signalsData as any)?.signals || [];
  const mySignals = (mySignalsData as any)?.signals || [];

  const filteredSignals = signals.filter((signal: BuySignal) => {
    const matchesSearch = !searchQuery || 
      signal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signal.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesUrgency = urgencyFilter === 'all' || signal.urgency === urgencyFilter;
    
    return matchesSearch && matchesUrgency;
  });

  const urgencyColors = {
    low: 'bg-gray-100 text-gray-800 border-gray-200',
    normal: 'bg-blue-100 text-blue-800 border-blue-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    urgent: 'bg-red-100 text-red-800 border-red-200',
  };

  const categoryIcons = {
    cannabis: <Leaf className="h-4 w-4" />,
    hemp: <Leaf className="h-4 w-4" />,
    cbd: <Leaf className="h-4 w-4" />,
    thc: <Leaf className="h-4 w-4" />,
    equipment: <AlertCircle className="h-4 w-4" />,
    services: <MessageSquare className="h-4 w-4" />,
  };

  const formatBudget = (min?: number, max?: number, currency = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'ZAR' ? 'R' : '€';
    
    if (min && max) {
      return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
    }
    if (min) {
      return `${symbol}${min.toLocaleString()}+`;
    }
    if (max) {
      return `Up to ${symbol}${max.toLocaleString()}`;
    }
    return 'Budget: Negotiable';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    return 'Just posted';
  };

  const SignalCard = ({ signal, showActions = false }: { signal: BuySignal; showActions?: boolean }) => (
    <Card key={signal.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-2 flex items-center gap-2">
              {categoryIcons[signal.category as keyof typeof categoryIcons]}
              <span className="truncate">{signal.title}</span>
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {signal.description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge 
              variant="outline" 
              className={urgencyColors[signal.urgency]}
            >
              {signal.urgency}
            </Badge>
            {!signal.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Budget and Quantity */}
        {(signal.budgetMin || signal.budgetMax || signal.targetQuantity) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {(signal.budgetMin || signal.budgetMax) && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{formatBudget(signal.budgetMin, signal.budgetMax, signal.currency)}</span>
              </div>
            )}
            {signal.targetQuantity && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Quantity:</span>
                <span>{signal.targetQuantity} {signal.unit || 'units'}</span>
              </div>
            )}
          </div>
        )}

        {/* Location and Category */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {signal.preferredLocation && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{signal.preferredLocation}</span>
            </div>
          )}
          <Badge variant="secondary" className="text-xs">
            {signal.category}
          </Badge>
        </div>

        {/* Expiry Date */}
        {signal.expiresAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Expires: {new Date(signal.expiresAt).toLocaleDateString()}</span>
          </div>
        )}

        {/* Stats and Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{signal.viewCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{signal.responseCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTimeAgo(signal.createdAt)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showActions && user && signal.buyer && signal.buyer.id !== user.id && (
              <Button size="sm" onClick={() => navigate(`/buy-signals/${signal.id}/respond`)}>
                Respond
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/buy-signals/${signal.id}`)}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Buy Signals</h1>
          <p className="text-muted-foreground">
            Browse buyer requests and post what you're looking for
          </p>
        </div>
        {user && (
          <Button onClick={() => navigate('/buy-signals/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Signal
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search signals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="cannabis">Cannabis</SelectItem>
                <SelectItem value="hemp">Hemp</SelectItem>
                <SelectItem value="cbd">CBD Products</SelectItem>
                <SelectItem value="thc">THC Products</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="services">Services</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setUrgencyFilter('all');
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">All Signals</TabsTrigger>
          {user && <TabsTrigger value="mine">My Signals</TabsTrigger>}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {filteredSignals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No signals found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchQuery || categoryFilter !== 'all' || urgencyFilter !== 'all'
                    ? 'Try adjusting your filters to find more buy signals.'
                    : 'Be the first to post a buy signal and let sellers know what you need.'}
                </p>
                {user && (
                  <Button className="mt-4" onClick={() => navigate('/buy-signals/create')}>
                    Create First Signal
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSignals.map((signal: BuySignal) => (
                <SignalCard key={signal.id} signal={signal} showActions={true} />
              ))}
            </div>
          )}
        </TabsContent>

        {user && (
          <TabsContent value="mine" className="space-y-6">
            {mySignals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No signals yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Create your first buy signal to start receiving offers from sellers.
                  </p>
                  <Button className="mt-4" onClick={() => navigate('/buy-signals/create')}>
                    Create Buy Signal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {mySignals.map((signal: BuySignal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}