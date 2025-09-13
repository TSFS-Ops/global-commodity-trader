import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Plus, DollarSign, MapPin, Calendar, AlertCircle } from 'lucide-react';

const buySignalSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.enum(['cannabis', 'hemp', 'cbd', 'thc', 'equipment', 'services']),
  targetQuantity: z.number().positive('Quantity must be positive').optional(),
  unit: z.string().optional(),
  budgetMin: z.number().positive('Budget must be positive').optional(),
  budgetMax: z.number().positive('Budget must be positive').optional(),
  currency: z.string().default('USD'),
  preferredLocation: z.string().optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  expiresAt: z.string().optional(),
  specifications: z.record(z.string()).optional(),
});

type BuySignalFormData = z.infer<typeof buySignalSchema>;

export default function CreateBuySignalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BuySignalFormData>({
    resolver: zodResolver(buySignalSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'cannabis',
      currency: 'USD',
      urgency: 'normal',
      specifications: {},
    },
  });

  const createSignalMutation = useMutation({
    mutationFn: async (data: BuySignalFormData) => {
      const response = await apiRequest('/api/buy-signals', 'POST', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Buy Signal Created',
        description: 'Your buy signal is now live and visible to sellers.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/my-buy-signals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buy-signals'] });
      navigate('/buy-signals');
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Signal',
        description: error.message || 'Failed to create buy signal. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: BuySignalFormData) => {
    setIsSubmitting(true);
    try {
      // Convert expiry date if provided
      let processedData = { ...data };
      if (data.expiresAt) {
        processedData.expiresAt = new Date(data.expiresAt).toISOString();
      }
      
      await createSignalMutation.mutateAsync(processedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'cannabis', label: 'Cannabis' },
    { value: 'hemp', label: 'Hemp' },
    { value: 'cbd', label: 'CBD Products' },
    { value: 'thc', label: 'THC Products' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'services', label: 'Services' },
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Low Priority', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High Priority', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  ];

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center space-y-4 pt-6">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <div className="text-center">
              <h3 className="font-semibold">Authentication Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please log in to create a buy signal.
              </p>
            </div>
            <Button onClick={() => navigate('/login')}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Buy Signal</h1>
          <p className="text-muted-foreground">
            Post a "want ad" to let sellers know what you're looking for
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Buy Signal
          </CardTitle>
          <CardDescription>
            Tell sellers exactly what you need. Be specific to get better responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Looking for high-quality hemp flower..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A clear, descriptive title for what you're seeking
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {urgencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Badge className={option.color}>{option.label}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe exactly what you're looking for, including quality requirements, intended use, certifications needed, etc."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide detailed specifications to help sellers understand your needs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity and Budget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="targetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="100"
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
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="kg, grams, liters"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="ZAR">ZAR (R)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Budget Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="budgetMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Minimum Budget
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="1000"
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
                  name="budgetMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Maximum Budget
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="5000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location and Expiry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="preferredLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Preferred Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cape Town, South Africa"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Where you'd prefer to source from or receive delivery
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Expires On
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        When this signal should expire (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? 'Creating...' : 'Create Signal'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}