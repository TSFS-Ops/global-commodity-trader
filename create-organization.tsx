import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Building2, ArrowLeft, CheckCircle } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  region: z.string().min(1, "Please select a region"),
  sellerType: z.enum(["direct_seller", "broker"]),
  description: z.string().optional(),
  website: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type OrganizationForm = z.infer<typeof organizationSchema>;

const SOUTH_AFRICAN_REGIONS = [
  "Eastern Cape",
  "Free State", 
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape"
];

export default function CreateOrganization() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      region: "",
      sellerType: "direct_seller" as const,
      description: "",
      website: "",
      phone: "",
      address: "",
    },
  });

  // Create organization mutation
  const createOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationForm) => {
      const res = await apiRequest('POST', '/api/organizations', data);
      return await res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Organization created successfully!",
        description: "Your business profile has been set up. You can now proceed with uploading documents.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seller/organization'] });
      
      // Redirect back to onboarding after a brief delay
      setTimeout(() => {
        navigate('/onboarding/seller');
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationForm) => {
    createOrganizationMutation.mutate(data);
  };

  const handleGoBack = () => {
    navigate('/onboarding/seller');
  };

  if (isSubmitted) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#173c1e]">Organization Created!</h3>
                  <p className="text-sm text-[#173c1e]/70 mt-1">
                    Redirecting you back to complete the onboarding...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mr-4 text-[#173c1e]/70"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Onboarding
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#173c1e]">Create Organization</h1>
            <p className="text-[#173c1e]/70">
              Set up your business profile to start selling on Izenzo
            </p>
          </div>
        </div>

        {/* Organization Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-[#173c1e]">
              <Building2 className="w-5 h-5 mr-2" />
              Business Information
            </CardTitle>
            <CardDescription>
              Provide details about your cannabis business. This information will be displayed to potential buyers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your Cannabis Business Name" 
                            data-testid="input-organization-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-region">
                              <SelectValue placeholder="Select your region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOUTH_AFRICAN_REGIONS.map((region) => (
                              <SelectItem key={region} value={region.toLowerCase().replace(' ', '-')}>
                                {region}
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
                    name="sellerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-seller-type">
                              <SelectValue placeholder="Select your business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="direct_seller">
                              Direct Seller - I sell my own products
                            </SelectItem>
                            <SelectItem value="broker">
                              Broker - I facilitate trades between buyers and sellers
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your cannabis business, products, and what makes you unique..."
                            className="min-h-[120px]"
                            data-testid="textarea-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[#173c1e]">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://yourwebsite.com" 
                              data-testid="input-website"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+27 123 456 7890" 
                              data-testid="input-phone"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Full business address including postal code..."
                            data-testid="textarea-address"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoBack}
                    className="border-[#173c1e]/20"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrganizationMutation.isPending}
                    className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                    data-testid="button-create-organization"
                  >
                    {createOrganizationMutation.isPending ? "Creating..." : "Create Organization"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}