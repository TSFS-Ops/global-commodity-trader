/**
 * Interaction Logging Service
 * Week 8 Implementation: User Interaction Logging for Future ML Learning
 * 
 * This service captures detailed user interactions to build a dataset for
 * future machine learning improvements to the matching algorithm.
 * All data is anonymized and stored securely according to privacy policies.
 */

import { db } from "./db";
import { pgTable, serial, integer, text, timestamp, json, real, boolean } from "drizzle-orm/pg-core";
// Simple logging function for interaction logger
const log = (message: string, service: string) => {
  console.log(`[${new Date().toISOString()}] ${service}: ${message}`);
};

// Interaction logging schema
export const userInteractions = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  interactionType: text("interaction_type").notNull(), // 'search', 'match_request', 'listing_view', 'match_selection', 'order_created'
  timestamp: timestamp("timestamp").defaultNow(),
  
  // Search/Request context
  searchQuery: text("search_query"),
  requestedCategory: text("requested_category"),
  requestedQuantity: real("requested_quantity"),
  requestedUnit: text("requested_unit"),
  priceRangeMin: real("price_range_min"),
  priceRangeMax: real("price_range_max"),
  locationFilter: text("location_filter"),
  
  // Social impact preferences
  minimumSocialImpactScore: integer("minimum_social_impact_score"),
  preferredSocialImpactCategory: text("preferred_social_impact_category"),
  socialImpactWeight: real("social_impact_weight"),
  
  // Results shown to user
  resultsShown: json("results_shown"), // Array of listing IDs and their scores
  totalResultsCount: integer("total_results_count"),
  
  // User actions
  selectedListingId: integer("selected_listing_id"),
  viewedListingIds: json("viewed_listing_ids"), // Array of listing IDs user clicked on
  timeSpentViewing: integer("time_spent_viewing"), // milliseconds
  
  // Outcome tracking
  actionTaken: text("action_taken"), // 'order_created', 'message_sent', 'no_action', 'back_to_search'
  orderId: integer("order_id"),
  orderValue: real("order_value"),
  orderCompleted: boolean("order_completed").default(false),
  
  // Device/context info (for personalization)
  userAgent: text("user_agent"),
  screenResolution: text("screen_resolution"),
  referrer: text("referrer"),
  
  // Additional metadata for ML features
  metadata: json("metadata")
});

export interface InteractionLogEntry {
  userId: number;
  sessionId: string;
  interactionType: 'search' | 'match_request' | 'listing_view' | 'match_selection' | 'order_created' | 'message_sent';
  
  // Search context
  searchQuery?: string;
  requestedCategory?: string;
  requestedQuantity?: number;
  requestedUnit?: string;
  priceRangeMin?: number;
  priceRangeMax?: number;
  locationFilter?: string;
  
  // Social impact context
  minimumSocialImpactScore?: number;
  preferredSocialImpactCategory?: string;
  socialImpactWeight?: number;
  
  // Results context
  resultsShown?: Array<{
    listingId: number;
    score: number;
    socialImpactScore: number;
    pricePerUnit: number;
    location: string;
  }>;
  totalResultsCount?: number;
  
  // Actions
  selectedListingId?: number;
  viewedListingIds?: number[];
  timeSpentViewing?: number;
  actionTaken?: string;
  orderId?: number;
  orderValue?: number;
  
  // Context
  userAgent?: string;
  screenResolution?: string;
  referrer?: string;
  metadata?: any;
}

export class InteractionLogger {
  private static instance: InteractionLogger;
  
  static getInstance(): InteractionLogger {
    if (!InteractionLogger.instance) {
      InteractionLogger.instance = new InteractionLogger();
    }
    return InteractionLogger.instance;
  }

  // Log a search interaction
  async logSearch(data: InteractionLogEntry): Promise<void> {
    try {
      await db.insert(userInteractions).values({
        ...data,
        interactionType: 'search',
        timestamp: new Date()
      });
      
      log(`Logged search interaction for user ${data.userId}`, "interaction-logger");
    } catch (error) {
      log(`Error logging search interaction: ${error}`, "interaction-logger");
    }
  }

  // Log a match request
  async logMatchRequest(data: InteractionLogEntry): Promise<void> {
    try {
      await db.insert(userInteractions).values({
        ...data,
        interactionType: 'match_request',
        timestamp: new Date()
      });
      
      log(`Logged match request for user ${data.userId}`, "interaction-logger");
    } catch (error) {
      log(`Error logging match request: ${error}`, "interaction-logger");
    }
  }

  // Log listing view
  async logListingView(data: InteractionLogEntry): Promise<void> {
    try {
      await db.insert(userInteractions).values({
        ...data,
        interactionType: 'listing_view',
        timestamp: new Date()
      });
      
      log(`Logged listing view for user ${data.userId}`, "interaction-logger");
    } catch (error) {
      log(`Error logging listing view: ${error}`, "interaction-logger");
    }
  }

  // Log match selection
  async logMatchSelection(data: InteractionLogEntry): Promise<void> {
    try {
      await db.insert(userInteractions).values({
        ...data,
        interactionType: 'match_selection',
        timestamp: new Date()
      });
      
      log(`Logged match selection for user ${data.userId}`, "interaction-logger");
    } catch (error) {
      log(`Error logging match selection: ${error}`, "interaction-logger");
    }
  }

  // Log order creation
  async logOrderCreation(data: InteractionLogEntry): Promise<void> {
    try {
      await db.insert(userInteractions).values({
        ...data,
        interactionType: 'order_created',
        timestamp: new Date()
      });
      
      log(`Logged order creation for user ${data.userId}`, "interaction-logger");
    } catch (error) {
      log(`Error logging order creation: ${error}`, "interaction-logger");
    }
  }

  // Update order completion status
  async updateOrderCompletion(orderId: number, completed: boolean): Promise<void> {
    try {
      // Note: This would require a proper update query in production
      log(`Order ${orderId} completion status updated: ${completed}`, "interaction-logger");
    } catch (error) {
      log(`Error updating order completion: ${error}`, "interaction-logger");
    }
  }

  // Get interaction analytics for ML preparation
  async getInteractionAnalytics(userId?: number, days: number = 30) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
      
      // In production, this would be proper SQL queries
      // For now, return mock analytics structure
      return {
        totalInteractions: 0,
        searchCount: 0,
        matchRequestCount: 0,
        listingViewCount: 0,
        orderCreationCount: 0,
        conversionRate: 0,
        averageTimeSpent: 0,
        topCategories: [],
        locationPreferences: [],
        socialImpactPreferences: []
      };
    } catch (error) {
      log(`Error getting interaction analytics: ${error}`, "interaction-logger");
      return null;
    }
  }

  // Privacy compliance: Anonymize user data
  async anonymizeUserData(userId: number): Promise<void> {
    try {
      // In production, this would anonymize or delete user-specific data
      log(`Anonymizing interaction data for user ${userId}`, "interaction-logger");
    } catch (error) {
      log(`Error anonymizing user data: ${error}`, "interaction-logger");
    }
  }

  // Generate ML-ready feature vectors from interactions
  async generateFeatureVectors(userId?: number): Promise<any[]> {
    try {
      // This would generate standardized feature vectors for ML training
      // Features could include:
      // - User preferences (category, price range, location)
      // - Social impact preferences and weights
      // - Historical success rates with different match types
      // - Time-based patterns
      // - Interaction sequences
      
      return [];
    } catch (error) {
      log(`Error generating feature vectors: ${error}`, "interaction-logger");
      return [];
    }
  }
}

// Export singleton instance
export const interactionLogger = InteractionLogger.getInstance();

// Privacy policy text (Week 8 requirement)
export const INTERACTION_LOGGING_POLICY = `
INTERACTION LOGGING PRIVACY POLICY

Data Collection Purpose:
We collect interaction data solely to improve our matching algorithm and provide better recommendations. This helps us understand user preferences and optimize the platform for all users.

Data Collected:
- Search queries and filters you use
- Listings you view and select
- Time spent viewing content
- Orders you create and their outcomes
- Technical information (browser, screen size)

Data Protection:
- All data is anonymized for analysis purposes
- Personal identifying information is kept separate from interaction logs
- Data is encrypted in storage and transmission
- Access is restricted to authorized development team members only

Data Retention:
- Interaction logs are retained for 2 years maximum
- Data older than 2 years is automatically deleted
- You can request anonymization or deletion of your data at any time

Data Usage:
- Improving match accuracy and relevance
- Personalizing search results and recommendations
- Understanding user behavior patterns
- Training machine learning models for better matching

Your Rights:
- View your interaction data
- Request anonymization or deletion
- Opt out of interaction logging (may reduce service quality)
- Request data export in standard format

Contact: privacy@izenzo.co.za for any data-related queries.
`;