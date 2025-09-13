import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Camera, X } from "lucide-react";

interface MediaStepProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
  currentStep: number;
  totalSteps: number;
}

export function MediaStep({ 
  form, 
  onNext, 
  onPrevious, 
  currentStep, 
  totalSteps 
}: MediaStepProps) {
  
  const images = form.watch("images") || [];

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    form.setValue("images", newImages);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep} of {totalSteps}: Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <div className="space-y-4">
              {/* Product Photos */}
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Photos *</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {/* Upload Area */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                          <Camera className="mx-auto h-16 w-16 text-gray-400" />
                          <div className="mt-4">
                            <p className="text-lg font-medium text-gray-600">
                              Add Product Photos
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Upload high-quality photos of your product
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              JPG, PNG up to 10MB each • Minimum 1 photo required
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                const currentImages = field.value || [];
                                const newImages = [...currentImages, ...files.map(f => f.name)];
                                field.onChange(newImages);
                              }
                            }}
                          />
                        </div>

                        {/* Preview uploaded images */}
                        {images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {images.map((image: string, index: number) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border">
                                  <div className="text-center p-4">
                                    <Camera className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="text-xs text-gray-500 mt-2 truncate">
                                      {image}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Required for publishing. Add at least one high-quality photo of your product.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo Guidelines */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Photo Guidelines:</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Use high-resolution images (minimum 800x600px)</li>
                  <li>• Show your product clearly with good lighting</li>
                  <li>• Include different angles and close-ups</li>
                  <li>• Avoid blurry or overly edited photos</li>
                  <li>• Include packaging if relevant</li>
                </ul>
              </div>

              {/* Status */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Media Status:</h4>
                <div className="text-purple-700 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${images.length > 0 ? "bg-green-500" : "bg-gray-300"}`} />
                    <span>Product Photos: {images.length > 0 ? `${images.length} uploaded` : "Required (minimum 1)"}</span>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous: Compliance
        </Button>
        <Button onClick={onNext}>
          Next: Review & Publish
        </Button>
      </div>
    </div>
  );
}