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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CommercialsStepProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
  currentStep: number;
  totalSteps: number;
}

export function CommercialsStep({ 
  form, 
  onNext, 
  onPrevious, 
  currentStep, 
  totalSteps 
}: CommercialsStepProps) {
  
  const pricePerUnit = form.watch("pricePerUnit");
  const quantity = form.watch("quantity");
  const currency = form.watch("currency");
  
  const totalValue = pricePerUnit && quantity ? pricePerUnit * quantity : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep} of {totalSteps}: Commercials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <div className="grid grid-cols-2 gap-4">
              {/* Price per Unit */}
              <FormField
                control={form.control}
                name="pricePerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Unit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 25.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Price per {form.getValues("unit") || "unit"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="ZAR">ZAR (R)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How do you want to be paid?" />
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
                    Required for publishing
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pricing Summary */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Pricing Summary:</h4>
              <div className="text-green-700 space-y-1">
                <p><strong>Price per {form.getValues("unit") || "unit"}:</strong> {currency} {pricePerUnit || 0}</p>
                <p><strong>Available quantity:</strong> {quantity || 0} {form.getValues("unit") || "units"}</p>
                <p><strong>Total value:</strong> {currency} {totalValue.toFixed(2)}</p>
                <p><strong>Payment method:</strong> {form.getValues("paymentMethod") || "Not set"}</p>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous: Logistics
        </Button>
        <Button onClick={onNext}>
          Next: Compliance & Trust
        </Button>
      </div>
    </div>
  );
}