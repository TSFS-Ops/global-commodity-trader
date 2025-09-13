import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Loader2 } from "lucide-react";
import { insertCannabisProductSchema } from "@shared/schema";

// Create a form schema based on the cannabis product schema
const formSchema = z.object({
  productName: z.string().min(3, "Product name must be at least 3 characters"),
  strain: z.string().min(2, "Strain name must be at least 2 characters"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  pricePerUnit: z.coerce.number().positive("Price must be positive").optional(),
  thcContent: z.coerce.number().min(0, "THC content cannot be negative").max(100, "THC content cannot exceed 100%").optional(),
  cbdContent: z.coerce.number().min(0, "CBD content cannot be negative").max(100, "CBD content cannot exceed 100%").optional(),
  description: z.string().optional(),
  certificationStandard: z.string().optional(),
  harvestDate: z.string().optional(),
}).omit({ ownerId: true });

type FormValues = z.infer<typeof formSchema>;

interface CannabisProductFormProps {
  onSuccess?: () => void;
}

export function CannabisProductForm({ onSuccess }: CannabisProductFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      strain: "",
      location: "",
      quantity: 0,
      pricePerUnit: undefined,
      thcContent: undefined,
      cbdContent: undefined,
      description: "",
      certificationStandard: "",
      harvestDate: "",
    },
  });

  const createCannabisProductMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Convert dates from string to ISO format if provided
      const formattedData = {
        ...data,
        harvestDate: data.harvestDate ? new Date(data.harvestDate).toISOString() : undefined,
      };
      
      const res = await apiRequest("POST", "/api/cannabis-products", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Product registered!",
        description: "Your cannabis product has been successfully registered.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cannabis-products"] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormValues) {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to register cannabis products",
        variant: "destructive",
      });
      return;
    }
    
    createCannabisProductMutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Premium Cannabis Flower" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="strain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strain</FormLabel>
                <FormControl>
                  <Input placeholder="Durban Poison" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Eastern Cape, South Africa" {...field} />
              </FormControl>
              <FormDescription>
                Where the product was grown or produced
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="pricePerUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Unit ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    placeholder="Optional" 
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="certificationStandard"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certification</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="thcContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>THC Content (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.1" 
                    placeholder="Optional" 
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="cbdContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CBD Content (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.1" 
                    placeholder="Optional" 
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="harvestDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Harvest Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your cannabis product in detail..." 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary-dark"
          disabled={createCannabisProductMutation.isPending}
        >
          {createCannabisProductMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Create Cannabis Listing
        </Button>
      </form>
    </Form>
  );
}