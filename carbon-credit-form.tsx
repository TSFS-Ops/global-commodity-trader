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
import { insertCarbonCreditSchema } from "@shared/schema";

// Create a form schema based on the carbon credit schema
const formSchema = insertCarbonCreditSchema.extend({
  projectEndDate: z.string().optional(),
  projectStartDate: z.string().optional(),
}).omit({ ownerId: true });

type FormValues = z.infer<typeof formSchema>;

interface CarbonCreditFormProps {
  onSuccess?: () => void;
}

export function CarbonCreditForm({ onSuccess }: CarbonCreditFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      location: "",
      quantity: 0,
      pricePerUnit: 0,
      description: "",
      certificationStandard: "",
      verificationBody: "",
      projectStartDate: "",
      projectEndDate: "",
    },
  });

  const createCarbonCreditMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Convert dates from string to ISO format if provided
      const formattedData = {
        ...data,
        projectStartDate: data.projectStartDate ? new Date(data.projectStartDate).toISOString() : undefined,
        projectEndDate: data.projectEndDate ? new Date(data.projectEndDate).toISOString() : undefined,
      };
      
      const res = await apiRequest("POST", "/api/carbon-credits", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Carbon credits registered!",
        description: "Your carbon credits have been successfully registered.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/carbon-credits"] });
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
        description: "Please log in to register carbon credits",
        variant: "destructive",
      });
      return;
    }
    
    createCarbonCreditMutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="projectName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="Hemp Cultivation Carbon Offset Project" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Eastern Cape, South Africa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Available Quantity (units)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="1"
                    step="1"
                    placeholder="100"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
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
                <FormLabel>Price Per Unit (USD)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="75.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
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
              <FormLabel>Project Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Provide details about the carbon offset project..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="certificationStandard"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certification Standard</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Verified Carbon Standard (VCS)" {...field} />
                </FormControl>
                <FormDescription>
                  The standard under which the carbon credits are certified
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="verificationBody"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Body</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Gold Standard" {...field} />
                </FormControl>
                <FormDescription>
                  Organization that verified the carbon credits
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="projectStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Start Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="projectEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project End Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary-dark"
          disabled={createCarbonCreditMutation.isPending}
        >
          {createCarbonCreditMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Register Carbon Credits
        </Button>
      </form>
    </Form>
  );
}
