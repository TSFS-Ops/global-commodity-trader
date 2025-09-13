import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ShieldCheck, 
  Award, 
  Star, 
  Verified,
  TrendingUp,
  Clock,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationLevel {
  level: "bronze" | "silver" | "gold" | "platinum";
  score: number;
  badges: string[];
  trustScore: number;
  completedOrders: number;
  yearsActive: number;
  responseTime: string;
}

interface SellerVerificationBadgeProps {
  sellerId?: number;
  sellerName?: string;
  verification?: VerificationLevel;
  variant?: "default" | "compact" | "detailed";
  className?: string;
}

// Mock verification data - in production this would come from the API
const getSellerVerification = (sellerId?: number): VerificationLevel => {
  // This would be fetched from the API in a real application
  const mockVerifications: Record<number, VerificationLevel> = {
    1: {
      level: "gold",
      score: 4.8,
      badges: ["verified", "trusted_seller", "fast_shipping", "quality_guarantee"],
      trustScore: 96,
      completedOrders: 147,
      yearsActive: 3,
      responseTime: "< 2 hours"
    },
    2: {
      level: "silver",
      score: 4.5,
      badges: ["verified", "trusted_seller"],
      trustScore: 87,
      completedOrders: 68,
      yearsActive: 2,
      responseTime: "< 4 hours"
    },
    3: {
      level: "platinum",
      score: 4.9,
      badges: ["verified", "trusted_seller", "fast_shipping", "quality_guarantee", "premium_supplier"],
      trustScore: 98,
      completedOrders: 289,
      yearsActive: 5,
      responseTime: "< 1 hour"
    }
  };

  return mockVerifications[sellerId || 1] || {
    level: "bronze",
    score: 4.0,
    badges: ["verified"],
    trustScore: 75,
    completedOrders: 12,
    yearsActive: 1,
    responseTime: "< 8 hours"
  };
};

const getLevelConfig = (level: string) => {
  const configs = {
    bronze: {
      color: "bg-amber-600",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200"
    },
    silver: {
      color: "bg-gray-400",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    },
    gold: {
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    platinum: {
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    }
  };
  return configs[level as keyof typeof configs] || configs.bronze;
};

const getBadgeIcon = (badgeType: string) => {
  const icons = {
    verified: <ShieldCheck size={12} />,
    trusted_seller: <Award size={12} />,
    fast_shipping: <TrendingUp size={12} />,
    quality_guarantee: <Star size={12} />,
    premium_supplier: <Verified size={12} />
  };
  return icons[badgeType as keyof typeof icons] || <ShieldCheck size={12} />;
};

const getBadgeLabel = (badgeType: string) => {
  const labels = {
    verified: "Verified Seller",
    trusted_seller: "Trusted by Community",
    fast_shipping: "Fast & Reliable",
    quality_guarantee: "Quality Guaranteed",
    premium_supplier: "Premium Supplier"
  };
  return labels[badgeType as keyof typeof labels] || "Verified";
};

export function SellerVerificationBadge({ 
  sellerId, 
  sellerName,
  verification,
  variant = "default",
  className 
}: SellerVerificationBadgeProps) {
  const verificationData = verification || getSellerVerification(sellerId);
  const config = getLevelConfig(verificationData.level);

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium border",
                config.textColor,
                config.bgColor,
                config.borderColor,
                className
              )}
            >
              <ShieldCheck size={12} />
              {verificationData.level.charAt(0).toUpperCase() + verificationData.level.slice(1)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{sellerName || "Seller"}</div>
              <div className="text-xs text-gray-600 mt-1">
                Trust Score: {verificationData.trustScore}/100
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("bg-white rounded-lg border p-4 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Seller Verification</h3>
          <Badge 
            className={cn(
              "text-xs font-medium border",
              config.textColor,
              config.bgColor,
              config.borderColor
            )}
          >
            {verificationData.level.charAt(0).toUpperCase() + verificationData.level.slice(1)}
          </Badge>
        </div>

        {/* Trust Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-sm font-medium">{verificationData.score}</span>
          </div>
          <div className="text-sm text-gray-600">
            Trust Score: {verificationData.trustScore}%
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {verificationData.completedOrders}
            </div>
            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <Users size={10} />
              Orders
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {verificationData.yearsActive}y
            </div>
            <div className="text-xs text-gray-600">
              Active
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {verificationData.responseTime}
            </div>
            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <Clock size={10} />
              Response
            </div>
          </div>
        </div>

        {/* Verification Badges */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Achievements
          </h4>
          <div className="flex flex-wrap gap-2">
            {verificationData.badges.map((badge) => (
              <TooltipProvider key={badge}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    >
                      {getBadgeIcon(badge)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="text-xs">{getBadgeLabel(badge)}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <Badge 
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium border",
          config.textColor,
          config.bgColor,
          config.borderColor
        )}
      >
        <ShieldCheck size={12} />
        {verificationData.level.charAt(0).toUpperCase() + verificationData.level.slice(1)} Seller
      </Badge>
      
      <div className="flex items-center gap-1">
        <Star className="h-3 w-3 text-yellow-400 fill-current" />
        <span className="text-sm font-medium">{verificationData.score}</span>
        <span className="text-xs text-gray-500">({verificationData.completedOrders} reviews)</span>
      </div>
    </div>
  );
}