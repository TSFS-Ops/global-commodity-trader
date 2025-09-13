import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryStepProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
  currentStep: number;
  totalSteps: number;
  safeCategories: string[];
  safeMap: Record<string, string[]>;
}

export function CategoryStep({ 
  form, 
  onNext, 
  currentStep, 
  totalSteps, 
  safeCategories, 
  safeMap 
}: CategoryStepProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    form.getValues("category") || null
  );

  // Watch category changes
  const watchedCategory = form.watch("category");

  useEffect(() => {
    if (watchedCategory !== selectedCategory) {
      setSelectedCategory(watchedCategory);
      // Reset subcategory when category changes
      if (watchedCategory !== selectedCategory) {
        form.setValue("subcategory", undefined);
      }
    }
  }, [watchedCategory, selectedCategory, form]);

  // Get subcategory options based on selected category
  const subcatOptions = selectedCategory ? (safeMap[selectedCategory] || []) : [];

  const isStepValid = () => {
    const category = form.getValues("category");
    // For drafts, only category is required - subcategory is optional
    return !!category;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep} of {totalSteps}: Category Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category * (Step 1)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
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
                    <FormLabel>Sub-category * (Step 2)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={!selectedCategory}
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
                      {!selectedCategory ? "Please select a category first" : "Choose a specific sub-category"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show preview of selected options */}
              {selectedCategory && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Selected:</h4>
                  <p className="text-blue-700">
                    <strong>Category:</strong> {selectedCategory}
                  </p>
                  {form.getValues("subcategory") && (
                    <p className="text-blue-700">
                      <strong>Sub-category:</strong> {form.getValues("subcategory")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div />
        <Button 
          onClick={onNext}
          disabled={!isStepValid()}
        >
          Next: Identity & Presentation
        </Button>
      </div>
    </div>
  );
}