/**
 * External Data Connectors Module
 * Week 6 Implementation: Mock External APIs and Crawler Prototype
 * 
 * This module provides a framework for connecting to external data sources,
 * normalizing their data into a unified format, and supporting the matching engine
 * with diverse data inputs from multiple partners and suppliers.
 */

// Simple logging function for external connectors
const log = (message: string, service: string) => {
  console.log(`[${new Date().toISOString()}] ${service}: ${message}`);
};

// Unified data format that all external sources must be normalized to
export interface UnifiedListingData {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  description: string;
  category: 'hemp' | 'cannabis' | 'extract' | 'seed' | 'carbon_credit' | 'other';
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  location: string;
  latitude?: number;
  longitude?: number;
  minOrderQuantity?: number;
  qualityGrade?: string;
  certifications?: string[];
  socialImpactScore?: number;
  socialImpactCategory?: string;
  contactInfo: {
    company: string;
    email?: string;
    phone?: string;
  };
  lastUpdated: Date;
}

// Abstract base class for all external connectors
export abstract class ExternalConnector {
  protected sourceName: string;
  protected baseUrl: string;
  protected credentials?: any;
  
  constructor(sourceName: string, baseUrl: string, credentials?: any) {
    this.sourceName = sourceName;
    this.baseUrl = baseUrl;
    this.credentials = credentials;
  }

  // Each connector must implement these methods
  abstract connect(): Promise<boolean>;
  abstract fetchListings(filters?: any): Promise<any[]>;
  abstract normalizeData(rawData: any[]): Promise<UnifiedListingData[]>;
  
  // Common method to get normalized listings
  async getUnifiedListings(filters?: any): Promise<UnifiedListingData[]> {
    try {
      const connected = await this.connect();
      if (!connected) {
        throw new Error(`Failed to connect to ${this.sourceName}`);
      }
      
      const rawData = await this.fetchListings(filters);
      const normalizedData = await this.normalizeData(rawData);
      
      log(`Successfully fetched ${normalizedData.length} listings from ${this.sourceName}`, "crawler");
      return normalizedData;
    } catch (error) {
      log(`Error fetching from ${this.sourceName}: ${error}`, "crawler");
      return [];
    }
  }
}

// Mock Hemp Supplier Connector (Simulates external hemp supplier API)
export class MockHempSupplierConnector extends ExternalConnector {
  constructor() {
    super("Hemp Suppliers Network", "https://api.hemp-suppliers.co.za", { apiKey: "mock-key" });
  }

  async connect(): Promise<boolean> {
    // Simulate connection check
    return true;
  }

  async fetchListings(filters?: any): Promise<any[]> {
    // Mock data from external hemp supplier
    return [
      {
        product_id: "HS001",
        name: "Organic Hemp Flower - Premium Grade",
        desc: "High-quality hemp flowers from sustainable farms",
        type: "flower",
        qty: 200,
        unit_type: "kg",
        price_per_unit: 145.50,
        currency_code: "USD",
        supplier_location: "Western Cape, South Africa",
        coordinates: { lat: -33.9249, lng: 18.4241 },
        min_order: 10,
        quality_cert: "Organic",
        impact_score: 85,
        impact_type: "Environmental",
        vendor: {
          company_name: "Green Valley Hemp Co",
          contact_email: "orders@greenvalley.co.za",
          phone: "+27-21-555-0123"
        },
        updated_at: "2024-12-08T10:00:00Z"
      },
      {
        product_id: "HS002", 
        name: "Hemp Seeds for Cultivation",
        desc: "Certified hemp seeds with high germination rate",
        type: "seeds",
        qty: 150,
        unit_type: "kg",
        price_per_unit: 220.00,
        currency_code: "USD",
        supplier_location: "Eastern Cape, South Africa",
        coordinates: { lat: -32.2968, lng: 26.4194 },
        min_order: 5,
        quality_cert: "Certified",
        impact_score: 78,
        impact_type: "Job Creation",
        vendor: {
          company_name: "Coastal Seeds Ltd",
          contact_email: "info@coastalseeds.co.za"
        },
        updated_at: "2024-12-08T09:30:00Z"
      }
    ];
  }

  async normalizeData(rawData: any[]): Promise<UnifiedListingData[]> {
    return rawData.map(item => ({
      id: item.product_id,
      sourceId: "hemp-suppliers-network",
      sourceName: this.sourceName,
      title: item.name,
      description: item.desc,
      category: item.type === 'flower' ? 'hemp' : 'seed' as any,
      quantity: item.qty,
      unit: item.unit_type,
      pricePerUnit: item.price_per_unit,
      currency: item.currency_code,
      location: item.supplier_location,
      latitude: item.coordinates?.lat,
      longitude: item.coordinates?.lng,
      minOrderQuantity: item.min_order,
      qualityGrade: item.quality_cert,
      certifications: item.quality_cert ? [item.quality_cert] : [],
      socialImpactScore: item.impact_score,
      socialImpactCategory: item.impact_type,
      contactInfo: {
        company: item.vendor.company_name,
        email: item.vendor.contact_email,
        phone: item.vendor.phone
      },
      lastUpdated: new Date(item.updated_at)
    }));
  }
}

// Mock Cannabis Trading Platform Connector
export class MockCannabisExchangeConnector extends ExternalConnector {
  constructor() {
    super("SA Cannabis Exchange", "https://api.sa-cannabis-exchange.com", { token: "mock-token" });
  }

  async connect(): Promise<boolean> {
    return true;
  }

  async fetchListings(filters?: any): Promise<any[]> {
    return [
      {
        listing_id: "SCE-001",
        product_title: "Premium Cannabis Extract - Full Spectrum",
        product_description: "High-quality full-spectrum cannabis extract for medical use",
        category: "extract",
        available_quantity: 50,
        unit_measurement: "liters",
        unit_price: 580.00,
        currency: "USD",
        seller_region: "Gauteng, South Africa",
        geo_coordinates: [-26.2041, 28.0473],
        minimum_purchase: 2,
        grade: "Premium",
        sustainability_score: 92,
        sustainability_focus: "Healthcare",
        seller_details: {
          business_name: "Medical Cannabis Solutions",
          email_contact: "sales@medcannabis.co.za",
          phone_number: "+27-11-555-0456"
        },
        last_modified: "2024-12-08T11:15:00Z"
      }
    ];
  }

  async normalizeData(rawData: any[]): Promise<UnifiedListingData[]> {
    return rawData.map(item => ({
      id: item.listing_id,
      sourceId: "sa-cannabis-exchange",
      sourceName: this.sourceName,
      title: item.product_title,
      description: item.product_description,
      category: item.category as any,
      quantity: item.available_quantity,
      unit: item.unit_measurement,
      pricePerUnit: item.unit_price,
      currency: item.currency,
      location: item.seller_region,
      latitude: item.geo_coordinates?.[0],
      longitude: item.geo_coordinates?.[1],
      minOrderQuantity: item.minimum_purchase,
      qualityGrade: item.grade,
      socialImpactScore: item.sustainability_score,
      socialImpactCategory: item.sustainability_focus,
      contactInfo: {
        company: item.seller_details.business_name,
        email: item.seller_details.email_contact,
        phone: item.seller_details.phone_number
      },
      lastUpdated: new Date(item.last_modified)
    }));
  }
}

// Crawler Service that aggregates data from multiple connectors
export class DataCrawlerService {
  private connectors: ExternalConnector[] = [];
  private lastCrawlTime?: Date;

  constructor() {
    // Mock connectors disabled for clean testing environment
    // Users requested to remove all placeholder/mock data for real data testing
    this.connectors = [];
  }

  // Add a new connector
  addConnector(connector: ExternalConnector): void {
    this.connectors.push(connector);
  }

  // Crawl all connected sources and return unified data
  async crawlAllSources(filters?: any): Promise<UnifiedListingData[]> {
    log(`Starting data crawl from ${this.connectors.length} sources`, "crawler");
    
    const allListings: UnifiedListingData[] = [];
    
    // Fetch from all connectors in parallel
    const crawlPromises = this.connectors.map(connector => 
      connector.getUnifiedListings(filters)
    );
    
    try {
      const results = await Promise.allSettled(crawlPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allListings.push(...result.value);
        } else {
          log(`Crawler ${index} failed: ${result.reason}`, "crawler");
        }
      });
      
      this.lastCrawlTime = new Date();
      log(`Crawl completed. Total listings: ${allListings.length}`, "crawler");
      
      return allListings;
    } catch (error) {
      log(`Crawl error: ${error}`, "crawler");
      return [];
    }
  }

  // Get listings from specific source
  async crawlSource(sourceName: string, filters?: any): Promise<UnifiedListingData[]> {
    const connector = this.connectors.find(c => c['sourceName'] === sourceName);
    if (!connector) {
      throw new Error(`Source ${sourceName} not found`);
    }
    
    return connector.getUnifiedListings(filters);
  }

  // Get crawl status
  getStatus() {
    return {
      connectorCount: this.connectors.length,
      connectorSources: this.connectors.map(c => c['sourceName']),
      lastCrawlTime: this.lastCrawlTime
    };
  }
}

// Export singleton instance
export const dataCrawler = new DataCrawlerService();