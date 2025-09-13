import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Leaf, Heart, Users, GraduationCap, Utensils, TreePine } from "lucide-react";

export interface SocialImpactCriteria {
  minimumSocialImpactScore: number;
  preferredSocialImpactCategory: string;
  socialImpactWeight: number; // 0-1 representing importance (0-100%)
}

interface SocialImpactFilterProps {
  criteria: SocialImpactCriteria;
  onCriteriaChange: (criteria: SocialImpactCriteria) => void;
}

const SOCIAL_IMPACT_CATEGORIES = [
  { value: "", label: "Any Category", icon: Leaf },
  { value: "Job Creation", label: "Job Creation", icon: Users },
  { value: "Education", label: "Education", icon: GraduationCap },
  { value: "Food Security", label: "Food Security", icon: Utensils },
  { value: "Environmental", label: "Environmental", icon: TreePine },
  { value: "Healthcare", label: "Healthcare", icon: Heart },
];

export function SocialImpactFilter({ criteria, onCriteriaChange }: SocialImpactFilterProps) {
  const handleScoreChange = (value: number[]) => {
    onCriteriaChange({
      ...criteria,
      minimumSocialImpactScore: value[0],
    });
  };

  const handleWeightChange = (value: number[]) => {
    onCriteriaChange({
      ...criteria,
      socialImpactWeight: value[0] / 100, // Convert percentage to decimal
    });
  };

  const handleCategoryChange = (category: string) => {
    onCriteriaChange({
      ...criteria,
      preferredSocialImpactCategory: category,
    });
  };

  const getCategoryIcon = (category: string) => {
    const categoryItem = SOCIAL_IMPACT_CATEGORIES.find(cat => cat.value === category);
    return categoryItem?.icon || Leaf;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-emerald-600" />
          Social Impact Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Minimum Social Impact Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Minimum Social Impact Score</Label>
            <Badge variant="secondary">
              {criteria.minimumSocialImpactScore}/100
            </Badge>
          </div>
          <Slider
            value={[criteria.minimumSocialImpactScore]}
            onValueChange={handleScoreChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Only show listings with a social impact score of {criteria.minimumSocialImpactScore} or higher
          </p>
        </div>

        {/* Social Impact Weight */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Social Impact Importance</Label>
            <Badge variant="outline">
              {Math.round(criteria.socialImpactWeight * 100)}%
            </Badge>
          </div>
          <Slider
            value={[Math.round(criteria.socialImpactWeight * 100)]}
            onValueChange={handleWeightChange}
            max={50}
            min={0}
            step={5}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            How much social impact affects your matching preferences (vs. price, location, etc.)
          </p>
        </div>

        {/* Preferred Impact Category */}
        <div className="space-y-3">
          <Label>Preferred Impact Category</Label>
          <Select
            value={criteria.preferredSocialImpactCategory}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select preferred impact type" />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_IMPACT_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                return (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {category.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {criteria.preferredSocialImpactCategory && (
            <p className="text-sm text-muted-foreground">
              Prioritizing listings focused on {criteria.preferredSocialImpactCategory.toLowerCase()}
            </p>
          )}
        </div>

        {/* Current Settings Summary */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Current Settings:</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>• Minimum score: {criteria.minimumSocialImpactScore}/100</div>
            <div>• Impact weight: {Math.round(criteria.socialImpactWeight * 100)}% of total score</div>
            <div>• Category: {criteria.preferredSocialImpactCategory || "Any"}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}