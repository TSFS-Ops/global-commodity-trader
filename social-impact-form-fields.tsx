import { Control } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, GraduationCap, Utensils, TreePine } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SocialImpactFormFieldsProps {
  control: Control<any>;
}

const SOCIAL_IMPACT_CATEGORIES = [
  { value: "Job Creation", label: "Job Creation", icon: Users },
  { value: "Education", label: "Education", icon: GraduationCap },
  { value: "Food Security", label: "Food Security", icon: Utensils },
  { value: "Environmental", label: "Environmental", icon: TreePine },
  { value: "Healthcare", label: "Healthcare", icon: Heart },
];

export function SocialImpactFormFields({ control }: SocialImpactFormFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-emerald-600" />
          Social Impact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Social Impact Score */}
        <FormField
          control={control}
          name="socialImpactScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Social Impact Score (0-100)</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[field.value || 0]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={100}
                      min={0}
                      step={5}
                      className="flex-1"
                    />
                    <Badge variant="outline" className="min-w-[60px] justify-center">
                      {field.value || 0}/100
                    </Badge>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
              </FormControl>
              <FormDescription>
                Rate the social or environmental benefit of this listing (0 = no impact, 100 = maximum impact)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Social Impact Category */}
        <FormField
          control={control}
          name="socialImpactCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Impact Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of social impact" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SOCIAL_IMPACT_CATEGORIES.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          {category.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the primary type of social or environmental benefit this listing provides
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Impact Examples */}
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Impact Category Examples:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>• <strong>Job Creation:</strong> Supports local employment and economic development</div>
            <div>• <strong>Education:</strong> Funds educational programs or training initiatives</div>
            <div>• <strong>Food Security:</strong> Contributes to sustainable food systems</div>
            <div>• <strong>Environmental:</strong> Carbon sequestration, biodiversity, conservation</div>
            <div>• <strong>Healthcare:</strong> Medical research, community health programs</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}