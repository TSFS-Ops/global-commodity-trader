import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heart, Leaf, Users, GraduationCap, Utensils, TreePine } from "lucide-react";

interface SocialImpactBadgeProps {
  score: number;
  category: string;
  className?: string;
  variant?: "default" | "prominent" | "compact";
}

const CATEGORY_ICONS = {
  "Job Creation": Users,
  "Education": GraduationCap,
  "Food Security": Utensils,
  "Environmental": TreePine,
  "Healthcare": Heart,
} as const;

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-600 border-emerald-200 bg-emerald-50";
  if (score >= 60) return "text-blue-600 border-blue-200 bg-blue-50";
  if (score >= 40) return "text-amber-600 border-amber-200 bg-amber-50";
  return "text-gray-600 border-gray-200 bg-gray-50";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "High Impact";
  if (score >= 60) return "Good Impact";
  if (score >= 40) return "Moderate Impact";
  return "Basic Impact";
};

export function SocialImpactBadge({ 
  score, 
  category, 
  className = "", 
  variant = "default" 
}: SocialImpactBadgeProps) {
  const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Leaf;
  const colorClass = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Badge variant="outline" className={colorClass}>
          <Heart className="h-3 w-3 mr-1" />
          {score}/100
        </Badge>
        {category && (
          <Badge variant="secondary" className="text-xs">
            <IconComponent className="h-3 w-3 mr-1" />
            {category}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === "prominent") {
    return (
      <Card className={`p-3 ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${colorClass}`}>
            <Heart className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Social Impact</h4>
              <Badge variant="outline" className={colorClass}>
                {score}/100
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{scoreLabel}</p>
            {category && (
              <div className="flex items-center gap-1 mt-1">
                <IconComponent className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{category}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className={colorClass}>
        <Heart className="h-3 w-3 mr-1" />
        {score}/100 • {scoreLabel}
      </Badge>
      {category && (
        <div className="flex items-center gap-1">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{category}</span>
        </div>
      )}
    </div>
  );
}