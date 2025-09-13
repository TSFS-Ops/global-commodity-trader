import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { fetchTaxonomy, Taxonomy } from "@/api/taxonomy";

import { insertListingSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SocialImpactFormFields } from "@/components/social-impact-form-fields";
import { ObjectUploader } from "@/components/ObjectUploader";

// Create a draft-friendly schema for the form
const listingFormSchema = insertListingSchema.extend({
  specifications: z.record(z.string()).optional(),
}).extend({
  // Override strict validations for drafts
  pricePerUnit: z.number().optional(), // Remove .positive() requirement for drafts
  subcategory: z.string().nullable().optional(), // Allow null for drafts
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

export function ListingForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  
  // Fetch taxonomy data
  const { data: taxonomy, isLoading: taxonomyLoading } = useQuery({
    queryKey: ["/api/taxonomy"],
    queryFn: fetchTaxonomy
  });
  
  // Provide safe defaults when data is still loading
  const safeCategories = taxonomy?.categories || [];
  const safeMap = taxonomy?.map || {};

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      subcategory: undefined,
      quantity: 0,
      unit: "kg",
      pricePerUnit: undefined,
      currency: "USD",
      location: "",
      minOrderQuantity: 0,
      images: [],
      status: "draft",
      isFeatured: false,
      socialImpactScore: 0,
      socialImpactCategory: "",
      coaDocument: "",
      supplyFrequency: "one-time",
      paymentMethod: "bank-transfer",
      certificatesDocuments: [],
    },
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: ListingFormValues & { status?: string }) => {
      const res = await apiRequest("POST", "/api/listings", data);
      return await res.json();
    },
    onSuccess: (data, variables) => {
      const isDraftSave = variables.status === "draft";
      toast({
        title: isDraftSave ? "Draft saved!" : "Listing created!",
        description: isDraftSave ? "Your listing draft has been saved." : "Your listing has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      if (!isDraftSave) {
        navigate("/listings");
      }
    },
    onError: (error: Error) => {
      toast({
        title: isDraft ? "Error saving draft" : "Error creating listing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ListingFormValues) {
    setIsDraft(false);
    createListingMutation.mutate({ ...data, status: "active" });
  }
  
  function onSaveDraft(data: ListingFormValues) {
    setIsDraft(true);
    createListingMutation.mutate({ ...data, status: "draft" });
  }
  
  // Watch category changes to reset subcategory
  const watchedCategory = form.watch("category");
  useEffect(() => {
    if (watchedCategory !== selectedCategory) {
      setSelectedCategory(watchedCategory);
      form.setValue("subcategory", undefined);
    }
  }, [watchedCategory, selectedCategory, form]);

  // Get subcategory options based on selected category
  const subcatOptions = useMemo(() => {
    return selectedCategory ? (safeMap[selectedCategory] || []) : [];
  }, [selectedCategory, safeMap]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-neutral-600 mb-4">You must be logged in to create a listing</p>
        <Button onClick={() => window.location.href = "/auth"}>
          Login to Continue
        </Button>
      </div>
    );
  }

  if (user.role !== 'seller' && user.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-neutral-600 mb-4">Only sellers can create listings</p>
        <p className="text-sm text-neutral-500 mb-4">
          Current role: {user.role}. Please contact admin to upgrade to seller account.
        </p>
        <Button onClick={() => window.location.reload()}>Refresh Account</Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Create New Listing</h2>
              <p className="text-sm text-muted-foreground">
                Create your listing with whatever information you have. You can add more details later.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Premium Hemp Oil" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your product (can be added later)..."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category * (Step 1)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={taxonomyLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a category first" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {safeCategories.map((category: string) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose a category to see relevant sub-categories.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-category (Step 2)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={!selectedCategory || taxonomyLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedCategory ? "Select a category first" : "Choose a sub-category"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subcatOptions.map((subcategory: string) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {!selectedCategory ? "Please select a category first" : "Optional: Choose a specific sub-category"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Eastern Cape, South Africa (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Available (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                        <FormLabel>Unit (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "kg"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                            <SelectItem value="g">Gram (g)</SelectItem>
                            <SelectItem value="oz">Ounce (oz)</SelectItem>
                            <SelectItem value="lb">Pound (lb)</SelectItem>
                            <SelectItem value="ton">Ton</SelectItem>
                            <SelectItem value="unit">Unit</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Unit (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "USD"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="ZAR">ZAR (R)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="minOrderQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        The minimum quantity a buyer must purchase
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Featured Listing</FormLabel>
                        <FormDescription>
                          Featured listings appear at the top of search results.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Compliance Requirements Section */}
            <div className="space-y-6 border rounded-lg p-6 bg-blue-50">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-blue-900">Additional Information</h3>
                <p className="text-sm text-blue-700">
                  Add compliance documentation and detailed information when available to build buyer confidence.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="supplyFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supply Frequency (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        required
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supply frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one-time">One-time</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="on-demand">On-demand</SelectItem>
                          <SelectItem value="continuous">Continuous</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How often can you supply this product? (Can be negotiated later)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        required
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="credit-card">Credit Card</SelectItem>
                          <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="escrow">Escrow Service</SelectItem>
                          <SelectItem value="payment-on-delivery">Payment on Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Preferred payment method (Can be negotiated with buyers)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Photos (Optional)</FormLabel>
                      <FormControl>
                        <ObjectUploader
                          uploadType="image"
                          maxNumberOfFiles={5}
                          maxFileSize={5242880} // 5MB
                          acceptedFileTypes={["image/jpeg", "image/png", "image/gif", "image/webp"]}
                          createDatabaseRecord={false} // Product photos are for listing display only
                          onFilesUploaded={(files) => {
                            const imagePaths = files.map(f => f.objectPath);
                            const currentImages = field.value || [];
                            field.onChange([...currentImages, ...imagePaths]);
                          }}
                        >
                          Upload Product Photos
                        </ObjectUploader>
                      </FormControl>
                      <FormDescription>
                        Upload photos when ready. High-quality images help buyers make informed decisions.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coaDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate of Analysis (COA) (Optional)</FormLabel>
                      <FormControl>
                        <ObjectUploader
                          uploadType="document"
                          maxNumberOfFiles={1}
                          maxFileSize={10485760} // 10MB
                          acceptedFileTypes={["application/pdf", "image/jpeg", "image/png"]}
                          documentType="coa"
                          description="Certificate of Analysis for listing"
                          onFilesUploaded={(files) => {
                            if (files.length > 0) {
                              field.onChange(files[0].objectPath);
                            }
                          }}
                        >
                          Upload COA Document
                        </ObjectUploader>
                      </FormControl>
                      <FormDescription>
                        Upload your Certificate of Analysis when available (PDF or image format)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certificatesDocuments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificates & Licenses (Optional)</FormLabel>
                      <FormControl>
                        <ObjectUploader
                          uploadType="document"
                          maxNumberOfFiles={10}
                          maxFileSize={10485760} // 10MB
                          acceptedFileTypes={[
                            "application/pdf", 
                            "image/jpeg", 
                            "image/png",
                            "application/msword",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          ]}
                          documentType="license"
                          description="Business license or certificate for listing"
                          onFilesUploaded={(files) => {
                            const docPaths = files.map(f => f.objectPath);
                            const currentDocs = field.value || [];
                            field.onChange([...currentDocs, ...docPaths]);
                          }}
                        >
                          Upload Certificates & Licenses
                        </ObjectUploader>
                      </FormControl>
                      <FormDescription>
                        Upload licenses and permits when ready - these help build buyer confidence
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Social Impact Section */}
            <SocialImpactFormFields control={form.control} />

            <div className="flex flex-col md:flex-row gap-4">
              <Button 
                type="button"
                variant="outline"
                onClick={form.handleSubmit(onSaveDraft)}
                disabled={createListingMutation.isPending}
                className="w-full md:w-auto"
              >
                {createListingMutation.isPending && isDraft && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!createListingMutation.isPending && <Save className="mr-2 h-4 w-4" />}
                Save as Draft
              </Button>
              
              <Button 
                type="submit" 
                className="w-full md:w-auto" 
                disabled={createListingMutation.isPending}
              >
                {createListingMutation.isPending && !isDraft && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Listing
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
