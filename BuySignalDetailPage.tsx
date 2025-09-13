import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  DollarSign, 
  Package, 
  Clock, 
  Eye, 
  MessageSquare,
  Send,
  Leaf,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const responseSchema = z.object({
  message: z.string().min(20, 'Message must be at least 20 characters'),
  offerPrice: z.number().positive('Offer price must be positive').optional(),
  offerQuantity: z.number().positive('Offer quantity must be positive').optional(),
  availableQuantity: z.number().positive('Available quantity must be positive').optional(),
  deliveryTime: z.string().optional(),
});

type ResponseFormData = z.infer<typeof responseSchema>;

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
  buyer: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function BuySignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResponseForm, setShowResponseForm] = useState(false);

  const { data: signalData, isLoading } = useQuery({
    queryKey: [`/api/buy-signals/${id}`],
    enabled: !!id,
  });

  const { data: responsesData } = useQuery({
    queryKey: [`/api/buy-signals/${id}/responses`],
    enabled: !!id && !!user?.id && !!(signalData as any)?.signal?.buyer?.id,
  });

  const form = useForm<ResponseFormData>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      message: '',
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (data: ResponseFormData) => {
      const response = await apiRequest(`/api/buy-signals/${id}/responses`, 'POST', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Response Sent',
        description: 'Your response has been sent to the buyer.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/buy-signals/${id}`] });
      setShowResponseForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Sending Response',
        description: error.message || 'Failed to send response. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: ResponseFormData) => {
    await respondMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const signal = (signalData as any)?.signal as BuySignal | undefined;
  const responses = (responsesData as any)?.responses || [];

  if (!signal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Signal Not Found</h3>
            <p className="text-muted-foreground text-center">
              This buy signal may have been removed or you don't have access to view it.
            </p>
            <Button className="mt-4" onClick={() => navigate('/buy-signals')}>
              Back to Signals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const urgencyColors = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const categoryIcons = {
    cannabis: <Leaf className="h-5 w-5" />,
    hemp: <Leaf className="h-5 w-5" />,
    cbd: <Leaf className="h-5 w-5" />,
    thc: <Leaf className="h-5 w-5" />,
    equipment: <Package className="h-5 w-5" />,
    services: <MessageSquare className="h-5 w-5" />,
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
    return 'Negotiable';
  };

  const isOwner = user?.id === signal.buyer.id;
  const canRespond = user && !isOwner && signal.isActive;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/buy-signals')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Buy Signals
        </Button>
      </div>

      {/* Signal Details */}
      <div className="space-y-6">
        {/* Main Signal Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2 flex items-center gap-3">
                  {categoryIcons[signal.category as keyof typeof categoryIcons]}
                  <span>{signal.title}</span>
                </CardTitle>
                <CardDescription className="text-base">
                  {signal.description}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Badge className={urgencyColors[signal.urgency]}>
                  {signal.urgency} priority
                </Badge>
                {!signal.isActive && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Key Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Budget */}
              {(signal.budgetMin || signal.budgetMax) && (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">Budget Range</div>
                    <div className="text-green-700">
                      {formatBudget(signal.budgetMin, signal.budgetMax, signal.currency)}
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity */}
              {signal.targetQuantity && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">Target Quantity</div>
                    <div className="text-blue-700">
                      {signal.targetQuantity} {signal.unit || 'units'}
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              {signal.preferredLocation && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-medium text-orange-900">Preferred Location</div>
                    <div className="text-orange-700">{signal.preferredLocation}</div>
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                {categoryIcons[signal.category as keyof typeof categoryIcons]}
                <div>
                  <div className="font-medium text-purple-900">Category</div>
                  <div className="text-purple-700 capitalize">{signal.category}</div>
                </div>
              </div>
            </div>

            {/* Buyer Information */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Posted by
              </h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {signal.buyer.firstName?.[0]}{signal.buyer.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {signal.buyer.firstName && signal.buyer.lastName 
                      ? `${signal.buyer.firstName} ${signal.buyer.lastName}`
                      : signal.buyer.username
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">@{signal.buyer.username}</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-4">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{signal.viewCount} views</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{signal.responseCount} responses</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Posted {new Date(signal.createdAt).toLocaleDateString()}</span>
              </div>
              {signal.expiresAt && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Expires {new Date(signal.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Response Section */}
        {canRespond && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Respond to this Signal
              </CardTitle>
              <CardDescription>
                Send your offer and details to the buyer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showResponseForm ? (
                <Button onClick={() => setShowResponseForm(true)} className="w-full">
                  Create Response
                </Button>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Message *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your offer, availability, and any relevant details..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide details about how you can fulfill this request
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="offerPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Offer Price (per unit)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="offerQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Offer Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="availableQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Available</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Time</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 2-3 business days"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowResponseForm(false)}
                        disabled={respondMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={respondMutation.isPending}
                        className="min-w-[120px]"
                      >
                        {respondMutation.isPending ? 'Sending...' : 'Send Response'}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Owner: View Responses */}
        {isOwner && responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Responses ({responses.length})
              </CardTitle>
              <CardDescription>
                Responses from sellers interested in your request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responses.map((response: any, index: number) => (
                  <div key={response.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {response.seller?.firstName?.[0]}{response.seller?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {response.seller?.firstName && response.seller?.lastName 
                              ? `${response.seller.firstName} ${response.seller.lastName}`
                              : response.seller?.username
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(response.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {!response.isRead && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm mb-3">{response.message}</p>
                    
                    {(response.offerPrice || response.offerQuantity || response.deliveryTime) && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground bg-gray-50 p-3 rounded">
                        {response.offerPrice && (
                          <div>
                            <span className="font-medium">Price:</span> ${response.offerPrice}
                          </div>
                        )}
                        {response.offerQuantity && (
                          <div>
                            <span className="font-medium">Quantity:</span> {response.offerQuantity}
                          </div>
                        )}
                        {response.deliveryTime && (
                          <div>
                            <span className="font-medium">Delivery:</span> {response.deliveryTime}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No access message */}
        {!canRespond && !isOwner && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="font-medium mb-2">Cannot Respond</h3>
              <p className="text-muted-foreground text-center">
                {!signal.isActive 
                  ? 'This buy signal is no longer active.'
                  : 'You need to be logged in to respond to buy signals.'
                }
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}