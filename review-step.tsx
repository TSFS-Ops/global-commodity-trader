import { UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReviewStepProps {
  form: UseFormReturn<any>;
  onPrevious: () => void;
  currentStep: number;
  totalSteps: number;
  onPublish: () => void;
  publishLoading: boolean;
}

export function ReviewStep({ 
  form, 
  onPrevious, 
  currentStep, 
  totalSteps, 
  onPublish,
  publishLoading
}: ReviewStepProps) {
  
  const formValues = form.getValues();

  // Checklist items for publishing
  const checklistItems = [
    {
      id: "category",
      label: "Choose a Category",
      completed: !!formValues.category,
      value: formValues.category
    },
    {
      id: "subcategory", 
      label: "Choose a Sub-category",
      completed: !!formValues.subcategory,
      value: formValues.subcategory
    },
    {
      id: "frequency",
      label: "Set Supply Frequency", 
      completed: !!formValues.supplyFrequency,
      value: formValues.supplyFrequency
    },
    {
      id: "payment",
      label: "Choose a Payment Method",
      completed: !!formValues.paymentMethod,
      value: formValues.paymentMethod
    },
    {
      id: "photos",
      label: "Add at least one product photo",
      completed: formValues.images?.length > 0,
      value: formValues.images?.length > 0 ? `${formValues.images.length} photo(s)` : null
    },
    {
      id: "coa",
      label: "Upload a Certificate of Analysis (COA)",
      completed: !!formValues.coaDocument,
      value: formValues.coaDocument
    },
    {
      id: "licence",
      label: "Upload a licence or certificate", 
      completed: formValues.certificatesDocuments?.length > 0,
      value: formValues.certificatesDocuments?.length > 0 ? `${formValues.certificatesDocuments.length} document(s)` : null
    }
  ];

  const completedCount = checklistItems.filter(item => item.completed).length;
  const allCompleted = completedCount === checklistItems.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep} of {totalSteps}: Review & Publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Publish Checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Publishing Checklist</h3>
              <Badge variant={allCompleted ? "default" : "secondary"}>
                {completedCount}/{checklistItems.length} Complete
              </Badge>
            </div>

            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={item.completed ? "text-green-700" : "text-red-700"}>
                      {item.label}
                    </span>
                  </div>
                  {item.completed && item.value && (
                    <span className="text-sm text-gray-600 truncate max-w-xs">
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {!allCompleted && (
              <div className="p-4 bg-orange-50 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Complete all items to publish</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Your listing is saved as a draft. Complete the missing items above to make it live.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Listing Preview */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Listing Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-medium">{formValues.title || "Listing Title"}</h4>
                <p className="text-sm text-gray-600">
                  by {formValues.isAnonymous ? (formValues.tradingName || "Trading Name") : "Your Name"}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Category:</span> {formValues.category || "Not set"}
                </div>
                <div>
                  <span className="font-medium">Sub-category:</span> {formValues.subcategory || "Not set"}
                </div>
                <div>
                  <span className="font-medium">Quantity:</span> {formValues.quantity || 0} {formValues.unit || "units"}
                </div>
                <div>
                  <span className="font-medium">Price:</span> {formValues.currency} {formValues.pricePerUnit || 0}/{formValues.unit}
                </div>
                <div>
                  <span className="font-medium">Frequency:</span> {formValues.supplyFrequency || "Not set"}
                </div>
                <div>
                  <span className="font-medium">Payment:</span> {formValues.paymentMethod || "Not set"}
                </div>
              </div>

              {formValues.description && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-sm text-gray-600 mt-1">{formValues.description}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous: Media
        </Button>
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={() => {/* Save as draft - already auto-saved */}}
          >
            Save as Draft
          </Button>
          <Button 
            onClick={onPublish}
            disabled={!allCompleted || publishLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {publishLoading ? "Publishing..." : "Publish Listing"}
          </Button>
        </div>
      </div>
    </div>
  );
}