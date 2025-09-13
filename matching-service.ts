interface MatchingCriteria {
  productType?: string;
  quantity?: number;
  location?: string;
  budget?: number;
  urgency?: string;
  qualityRequirements?: string;
  socialImpactPriority?: number;
}

interface MatchingFactors {
  priceMatch: number;
  quantityMatch: number;
  locationMatch: number;
  qualityMatch: number;
  socialImpactMatch: number;
}

interface RankedResult {
  listing: any;
  matchScore: number;
  matchQuality: string;
  matchingFactors: MatchingFactors;
  priceCompetitiveness: number;
  distanceScore: number;
  qualityScore: number;
  socialImpactScore: number;
}

class MatchingService {
  rank(criteria: MatchingCriteria, listings: any[]): RankedResult[] {
    return listings.map(listing => {
      const matchingFactors = this.calculateMatchingFactors(criteria, listing);
      const matchScore = this.calculateOverallScore(matchingFactors);
      
      return {
        listing,
        matchScore,
        matchQuality: this.getMatchQuality(matchScore),
        matchingFactors,
        priceCompetitiveness: matchingFactors.priceMatch,
        distanceScore: matchingFactors.locationMatch,
        qualityScore: matchingFactors.qualityMatch,
        socialImpactScore: matchingFactors.socialImpactMatch
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateMatchingFactors(criteria: MatchingCriteria, listing: any): MatchingFactors {
    const priceMatch = this.calculatePriceMatch(criteria.budget, listing.price || listing.pricePerUnit);
    const quantityMatch = this.calculateQuantityMatch(criteria.quantity, listing.quantity);
    const locationMatch = this.calculateLocationMatch(criteria.location, listing.location);
    const qualityMatch = this.calculateQualityMatch(criteria.qualityRequirements, listing.quality || listing.description);
    const socialImpactMatch = this.calculateSocialImpactMatch(criteria.socialImpactPriority, listing.socialImpactScore);

    return {
      priceMatch,
      quantityMatch,
      locationMatch,
      qualityMatch,
      socialImpactMatch
    };
  }

  private calculatePriceMatch(budget?: number, price?: number): number {
    if (!budget || !price) return 0.5;
    if (price <= budget) return 1;
    const overage = price - budget;
    const overagePercent = overage / budget;
    return Math.max(0, 1 - overagePercent);
  }

  private calculateQuantityMatch(requiredQuantity?: number, availableQuantity?: number): number {
    if (!requiredQuantity || !availableQuantity) return 0.5;
    if (availableQuantity >= requiredQuantity) return 1;
    return availableQuantity / requiredQuantity;
  }

  private calculateLocationMatch(requiredLocation?: string, listingLocation?: string): number {
    if (!requiredLocation || !listingLocation) return 0.5;
    const required = requiredLocation.toLowerCase();
    const available = listingLocation.toLowerCase();
    
    if (available.includes(required) || required.includes(available)) return 1;
    return 0.2;
  }

  private calculateQualityMatch(requirements?: string, description?: string): number {
    if (!requirements || !description) return 0.5;
    
    const reqWords = requirements.toLowerCase().split(/\s+/);
    const descWords = description.toLowerCase().split(/\s+/);
    
    const matches = reqWords.filter(word => descWords.some(descWord => descWord.includes(word)));
    return matches.length / reqWords.length;
  }

  private calculateSocialImpactMatch(priority?: number, score?: number): number {
    if (!priority || !score) return 0.5;
    const normalizedPriority = Math.max(0, Math.min(1, priority));
    const normalizedScore = Math.max(0, Math.min(1, score / 100));
    
    return normalizedScore * normalizedPriority + (1 - normalizedPriority) * 0.5;
  }

  private calculateOverallScore(factors: MatchingFactors): number {
    const weights = {
      price: 0.3,
      quantity: 0.2,
      location: 0.2,
      quality: 0.15,
      socialImpact: 0.15
    };

    return (
      factors.priceMatch * weights.price +
      factors.quantityMatch * weights.quantity +
      factors.locationMatch * weights.location +
      factors.qualityMatch * weights.quality +
      factors.socialImpactMatch * weights.socialImpact
    );
  }

  private getMatchQuality(score: number): string {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  }
}

export const matchingService = new MatchingService();
export type { MatchingCriteria, RankedResult, MatchingFactors };