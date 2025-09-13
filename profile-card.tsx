import { User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

type ProfileCardProps = {
  user: Omit<User, "password">;
  completedTrades?: number;
  activeListings?: number;
};

export function ProfileCard({ user, completedTrades = 0, activeListings = 0 }: ProfileCardProps) {
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRatingStars = (rating: number | null | undefined) => {
    if (!rating) return null;
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <svg 
            key={`full-${i}`}
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-4 h-4 text-yellow-400"
          >
            <path 
              fillRule="evenodd" 
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" 
              clipRule="evenodd" 
            />
          </svg>
        ))}
        
        {hasHalfStar && (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-4 h-4 text-yellow-400"
          >
            <path 
              fillRule="evenodd" 
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" 
              clipRule="evenodd" 
            />
          </svg>
        )}
        
        {[...Array(emptyStars)].map((_, i) => (
          <svg 
            key={`empty-${i}`}
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="w-4 h-4 text-yellow-400"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" 
            />
          </svg>
        ))}
        
        <span className="text-xs ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <Card className="glass-card overflow-hidden">
      <div className="bg-primary p-4 text-white">
        <div className="flex items-center">
          <Avatar className="h-16 w-16 border-2 border-white">
            <AvatarImage src={user.profileImage} alt={user.fullName} />
            <AvatarFallback>{getInitials(user.fullName || '')}</AvatarFallback>
          </Avatar>
          <div className="ml-4">
            <h3 className="text-lg font-semibold">{user.fullName}</h3>
            <p className="text-sm opacity-90">
              {user.isVerified ? "Verified " : ""}{user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>
            <div className="flex items-center mt-1">
              {user.verificationLevel && (
                <Badge variant="outline" className="bg-white/20 text-white border-0 rounded px-2 py-0.5 text-xs mr-2">
                  Tier {user.verificationLevel}
                </Badge>
              )}
              {getRatingStars(user.rating)}
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-2">
            <p className="text-neutral-600 text-sm">Completed Trades</p>
            <p className="text-xl font-semibold text-neutral-800">{completedTrades}</p>
          </div>
          <div className="p-2">
            <p className="text-neutral-600 text-sm">Active Listings</p>
            <p className="text-xl font-semibold text-neutral-800">{activeListings}</p>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/profile">
            <Button className="w-full py-2 bg-primary text-white rounded font-medium hover:bg-primary-dark transition" asChild>
              <a>View Profile</a>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
