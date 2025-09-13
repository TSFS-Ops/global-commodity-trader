import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Building2 } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";

interface IdentityStepProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
  currentStep: number;
  totalSteps: number;
}

export function IdentityStep({ 
  form, 
  onNext, 
  onPrevious, 
  currentStep, 
  totalSteps 
}: IdentityStepProps) {
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [showOrgForm, setShowOrgForm] = useState(false);
  const isAnonymous = form.watch("isAnonymous");

  // Check if user has an organization
  const { data: organizationData, isLoading: isOrgLoading } = useQuery({
    queryKey: ['/api/seller/organization'],
    enabled: !!user && user.role === 'seller',
  });

  const hasOrganization = organizationData && (organizationData as any)?.id;

  // Organization creation mutation
  const createOrgMutation = useMutation({
    mutationFn: async (orgData: any) => {
      const res = await apiRequest("POST", "/api/organizations", orgData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization created",
        description: "Your business profile has been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/seller/organization'] });
      setShowOrgForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [orgForm, setOrgForm] = useState({
    name: "",
    region: "",
    description: "",
    phone: "",
    address: "",
  });

  const handleCreateOrganization = () => {
    if (!orgForm.name || !orgForm.region) {
      toast({
        title: "Missing required fields",
        description: "Please fill in organization name and region.",
        variant: "destructive",
      });
      return;
    }
    createOrgMutation.mutate(orgForm);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep} of {totalSteps}: Identity & Presentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Status */}
          {isOrgLoading ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Checking organization status...</p>
            </div>
          ) : hasOrganization ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Organization Setup Complete</span>
              </div>
              <p className="text-sm text-green-700">
                <strong>{(organizationData as any)?.name}</strong> is ready for trading. 
                You can proceed with your listing.
              </p>
            </div>
          ) : showOrgForm ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Create Your Organization</span>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                To start selling, we need to set up your business profile. This is required for compliance.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Organization Name *</label>
                  <Input
                    value={orgForm.name}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Green Valley Cannabis Co."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Region *</label>
                  <Input
                    value={orgForm.region}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, region: e.target.value }))}
                    placeholder="e.g. Western Cape, South Africa"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Textarea
                    value={orgForm.description}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of your business..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+27 12 345 6789"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <Input
                    value={orgForm.address}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Business address"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleCreateOrganization}
                  disabled={createOrgMutation.isPending}
                  className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowOrgForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Organization Required</span>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                You need to set up your business organization before creating listings.
              </p>
              <Button 
                onClick={() => setShowOrgForm(true)}
                size="sm"
                className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Set Up Organization
              </Button>
            </div>
          )}

          <Form {...form}>
            <div className="space-y-4">
              {/* Anonymity Toggle */}
              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Trade anonymously</FormLabel>
                      <FormDescription>
                        Hide your legal name and use a trading name instead. Your legal name stays internal.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Trading Name (shown if anonymous) */}
              {isAnonymous && (
                <FormField
                  control={form.control}
                  name="tradingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trading Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. GreenLeaf Trading Co." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This name will be shown publicly instead of your legal name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Auto-suggested Title (editable) */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing Title *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Premium Hemp Oil - Flower/Bud - 10kg from South Africa" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      This title is auto-generated based on your category and details. You can edit it.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Short Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of your product (can be expanded later)..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Keep it concise. You can add more details later.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">How this will appear:</h4>
                <div className="text-green-700 space-y-1">
                  <p><strong>Seller:</strong> {isAnonymous ? (form.getValues("tradingName") || "Trading Name") : "Your Legal Name"}</p>
                  <p><strong>Title:</strong> {form.getValues("title") || "Listing Title"}</p>
                  {form.getValues("description") && (
                    <p><strong>Description:</strong> {form.getValues("description")}</p>
                  )}
                </div>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous: Category
        </Button>
        <Button 
          onClick={onNext}
          disabled={!hasOrganization}
        >
          Next: Quantity & Logistics
        </Button>
      </div>
    </div>
  );
}