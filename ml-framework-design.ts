/**
 * Machine Learning Framework Design
 * Week 9 Implementation: ML Pipeline and Feature Engineering Specifications
 * 
 * This module defines the architecture for future machine learning capabilities
 * that will enhance the matching engine based on user interaction patterns.
 * Implementation will begin once sufficient interaction data is collected.
 */

// ML Framework Configuration
export interface MLConfig {
  minimumDataPoints: number; // Minimum interactions needed before ML training
  retrainingInterval: number; // Days between model retraining
  validationSplit: number; // Percentage of data for validation
  testSplit: number; // Percentage of data for testing
  featureUpdateInterval: number; // Days between feature engineering updates
  modelVersioning: boolean; // Whether to keep multiple model versions
  abTestingEnabled: boolean; // Whether to run A/B tests against rule-based system
}

export const DEFAULT_ML_CONFIG: MLConfig = {
  minimumDataPoints: 1000, // Need at least 1000 interactions
  retrainingInterval: 7, // Retrain weekly
  validationSplit: 0.2, // 20% for validation
  testSplit: 0.1, // 10% for testing
  featureUpdateInterval: 30, // Update features monthly
  modelVersioning: true,
  abTestingEnabled: true
};

// Feature Engineering Specifications
export interface FeatureDefinition {
  name: string;
  description: string;
  type: 'numerical' | 'categorical' | 'binary' | 'vector';
  source: 'user_profile' | 'listing_data' | 'interaction_history' | 'external_data';
  calculationMethod: string;
  importance: 'high' | 'medium' | 'low';
  dependencies?: string[]; // Other features this depends on
}

// Core feature set for matching ML model
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // Price-based features
  {
    name: 'price_difference_ratio',
    description: 'Ratio between requested price range and listing price',
    type: 'numerical',
    source: 'listing_data',
    calculationMethod: 'abs(listing_price - user_max_price) / user_max_price',
    importance: 'high'
  },
  {
    name: 'price_affordability_score',
    description: 'How affordable the listing is within user budget',
    type: 'numerical',
    source: 'listing_data',
    calculationMethod: '(user_max_price - listing_price) / user_max_price',
    importance: 'high'
  },

  // Location-based features
  {
    name: 'location_distance_km',
    description: 'Geographic distance between user and listing',
    type: 'numerical',
    source: 'listing_data',
    calculationMethod: 'haversine_distance(user_lat_lng, listing_lat_lng)',
    importance: 'medium'
  },
  {
    name: 'same_region_flag',
    description: 'Whether user and listing are in the same region',
    type: 'binary',
    source: 'listing_data',
    calculationMethod: 'user_region == listing_region',
    importance: 'medium'
  },

  // Social Impact features
  {
    name: 'social_impact_alignment',
    description: 'Alignment between user preferences and listing social impact',
    type: 'numerical',
    source: 'listing_data',
    calculationMethod: 'social_impact_score * (category_match_bonus + user_impact_weight)',
    importance: 'high'
  },
  {
    name: 'impact_category_match',
    description: 'Whether listing matches preferred social impact category',
    type: 'binary',
    source: 'listing_data',
    calculationMethod: 'listing_impact_category == user_preferred_category',
    importance: 'medium'
  },

  // Historical interaction features
  {
    name: 'user_category_preference_score',
    description: 'Historical preference score for this product category',
    type: 'numerical',
    source: 'interaction_history',
    calculationMethod: 'sum(category_interactions) / total_interactions',
    importance: 'high',
    dependencies: ['interaction_history']
  },
  {
    name: 'user_seller_success_rate',
    description: 'Historical success rate with this specific seller',
    type: 'numerical',
    source: 'interaction_history',
    calculationMethod: 'completed_orders_with_seller / total_interactions_with_seller',
    importance: 'medium',
    dependencies: ['interaction_history']
  },
  {
    name: 'similar_user_success_pattern',
    description: 'Success rate of similar users with this type of listing',
    type: 'numerical',
    source: 'interaction_history',
    calculationMethod: 'collaborative_filtering_score(user_similarity, listing_type)',
    importance: 'medium',
    dependencies: ['user_similarity_matrix']
  },

  // Listing quality features
  {
    name: 'seller_rating_score',
    description: 'Overall rating of the seller',
    type: 'numerical',
    source: 'user_profile',
    calculationMethod: 'avg(seller_ratings)',
    importance: 'high'
  },
  {
    name: 'listing_freshness_score',
    description: 'How recently the listing was created or updated',
    type: 'numerical',
    source: 'listing_data',
    calculationMethod: '1 / (1 + days_since_last_update)',
    importance: 'low'
  },
  {
    name: 'quantity_match_score',
    description: 'How well the listing quantity matches user needs',
    type: 'numerical',
    source: 'listing_data',
    calculationMethod: 'min(user_quantity, listing_quantity) / max(user_quantity, listing_quantity)',
    importance: 'medium'
  },

  // Market context features
  {
    name: 'market_competitiveness',
    description: 'How competitive the price is in current market',
    type: 'numerical',
    source: 'external_data',
    calculationMethod: 'listing_price_percentile_in_category',
    importance: 'medium'
  },
  {
    name: 'seasonal_demand_factor',
    description: 'Seasonal demand factor for this product category',
    type: 'numerical',
    source: 'external_data',
    calculationMethod: 'seasonal_index[month][category]',
    importance: 'low'
  }
];

// ML Model Architecture Options
export interface ModelArchitecture {
  name: string;
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  trainingTime: 'fast' | 'medium' | 'slow';
  accuracy: 'good' | 'better' | 'best';
  interpretability: 'high' | 'medium' | 'low';
  scalability: 'good' | 'better' | 'best';
  recommendedUse: string;
}

export const MODEL_ARCHITECTURE_OPTIONS: ModelArchitecture[] = [
  {
    name: 'Random Forest',
    description: 'Ensemble of decision trees with feature importance ranking',
    complexity: 'simple',
    trainingTime: 'fast',
    accuracy: 'good',
    interpretability: 'high',
    scalability: 'good',
    recommendedUse: 'Initial implementation with good interpretability'
  },
  {
    name: 'Gradient Boosting (XGBoost)',
    description: 'Sequential tree boosting with high predictive power',
    complexity: 'moderate',
    trainingTime: 'medium',
    accuracy: 'better',
    interpretability: 'medium',
    scalability: 'better',
    recommendedUse: 'Production model with balanced performance and interpretability'
  },
  {
    name: 'Neural Network (Deep Learning)',
    description: 'Multi-layer neural network for complex pattern recognition',
    complexity: 'complex',
    trainingTime: 'slow',
    accuracy: 'best',
    interpretability: 'low',
    scalability: 'best',
    recommendedUse: 'Advanced implementation for maximum accuracy with large datasets'
  },
  {
    name: 'Hybrid Ensemble',
    description: 'Combination of multiple models with weighted voting',
    complexity: 'complex',
    trainingTime: 'slow',
    accuracy: 'best',
    interpretability: 'medium',
    scalability: 'better',
    recommendedUse: 'Final production model combining strengths of different approaches'
  }
];

// Evaluation Metrics for Model Performance
export interface EvaluationMetrics {
  // Accuracy metrics
  precision: number; // True positives / (True positives + False positives)
  recall: number; // True positives / (True positives + False negatives)
  f1Score: number; // Harmonic mean of precision and recall
  accuracy: number; // Overall correct predictions
  
  // Ranking metrics (for recommendation systems)
  ndcg: number; // Normalized Discounted Cumulative Gain
  map: number; // Mean Average Precision
  mrr: number; // Mean Reciprocal Rank
  
  // Business metrics
  clickThroughRate: number; // Users clicking on recommended matches
  conversionRate: number; // Users completing orders from recommendations
  userSatisfactionScore: number; // User feedback scores
  
  // A/B testing metrics
  liftOverBaseline: number; // Improvement over rule-based system
  statisticalSignificance: number; // P-value of improvement
}

// A/B Testing Framework
export interface ABTestConfig {
  testName: string;
  description: string;
  trafficAllocation: {
    control: number; // Percentage using rule-based system
    treatment: number; // Percentage using ML system
  };
  duration: number; // Test duration in days
  minimumSampleSize: number; // Minimum interactions needed
  successMetrics: string[]; // Primary metrics to evaluate
  guardrailMetrics: string[]; // Metrics that must not degrade
}

// Data Pipeline Architecture
export interface DataPipelineStage {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  dependencies: string[];
}

export const ML_DATA_PIPELINE: DataPipelineStage[] = [
  {
    name: 'raw_data_collection',
    description: 'Collect interaction logs and listing data',
    inputs: ['user_interactions', 'listings', 'orders', 'user_profiles'],
    outputs: ['raw_interaction_dataset'],
    frequency: 'hourly',
    dependencies: []
  },
  {
    name: 'data_cleaning_validation',
    description: 'Clean, validate, and standardize collected data',
    inputs: ['raw_interaction_dataset'],
    outputs: ['cleaned_dataset'],
    frequency: 'daily',
    dependencies: ['raw_data_collection']
  },
  {
    name: 'feature_engineering',
    description: 'Calculate features from cleaned data',
    inputs: ['cleaned_dataset'],
    outputs: ['feature_matrix'],
    frequency: 'daily',
    dependencies: ['data_cleaning_validation']
  },
  {
    name: 'model_training',
    description: 'Train and validate ML models',
    inputs: ['feature_matrix'],
    outputs: ['trained_model', 'model_metrics'],
    frequency: 'weekly',
    dependencies: ['feature_engineering']
  },
  {
    name: 'model_deployment',
    description: 'Deploy model to production with A/B testing',
    inputs: ['trained_model'],
    outputs: ['production_model'],
    frequency: 'weekly',
    dependencies: ['model_training']
  },
  {
    name: 'performance_monitoring',
    description: 'Monitor model performance and data drift',
    inputs: ['production_model', 'realtime_interactions'],
    outputs: ['performance_alerts', 'drift_reports'],
    frequency: 'realtime',
    dependencies: ['model_deployment']
  }
];

// Implementation Roadmap
export const ML_IMPLEMENTATION_ROADMAP = {
  phase1: {
    name: 'Foundation (Months 1-2)',
    goals: ['Collect sufficient interaction data', 'Implement basic feature engineering', 'Set up data pipelines'],
    deliverables: ['1000+ user interactions', 'Feature engineering pipeline', 'Data quality monitoring'],
    prerequisites: ['Interaction logging active', 'Basic analytics dashboard']
  },
  phase2: {
    name: 'Initial ML Model (Months 3-4)', 
    goals: ['Train first ML model', 'Implement A/B testing framework', 'Basic model evaluation'],
    deliverables: ['Random Forest model', 'A/B testing infrastructure', 'Performance baselines'],
    prerequisites: ['Phase 1 complete', 'Sufficient training data']
  },
  phase3: {
    name: 'Advanced Models (Months 5-6)',
    goals: ['Implement advanced algorithms', 'Optimize feature selection', 'Production deployment'],
    deliverables: ['XGBoost/Neural Network models', 'Feature importance analysis', 'Production ML pipeline'],
    prerequisites: ['Phase 2 validation complete', 'Model performance targets met']
  },
  phase4: {
    name: 'Optimization & Scale (Months 7+)',
    goals: ['Continuous learning', 'Personalization', 'Advanced features'],
    deliverables: ['Real-time personalization', 'Automated retraining', 'Advanced recommendation features'],
    prerequisites: ['Phase 3 deployed successfully', 'Performance monitoring active']
  }
};

// Export design document
export const ML_FRAMEWORK_DESIGN_DOCUMENT = {
  objectives: 'Enhance matching accuracy through machine learning based on user behavior patterns',
  dataRequirements: 'User interactions, listing data, order outcomes, external market data',
  framework: 'Scikit-learn/XGBoost for initial implementation, TensorFlow/PyTorch for advanced models',
  features: FEATURE_DEFINITIONS,
  architectureOptions: MODEL_ARCHITECTURE_OPTIONS,
  evaluationApproach: 'A/B testing against rule-based baseline with business metrics focus',
  implementation: ML_IMPLEMENTATION_ROADMAP,
  timeline: '6-12 months from sufficient data collection',
  resources: 'Data scientist, ML engineer, additional compute resources for training'
};