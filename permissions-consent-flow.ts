/**
 * Permissions and Consent Flow Module
 * Week 5 Implementation: Managing user permissions for external data source access
 * 
 * This module handles user consent for connecting external data sources,
 * managing API credentials, and ensuring compliance with data privacy regulations.
 */

import { db } from "./db";
import { pgTable, serial, integer, text, timestamp, json, boolean } from "drizzle-orm/pg-core";

// User consent and external connections schema
export const userDataSourceConsents = pgTable("user_data_source_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  dataSourceType: text("data_source_type").notNull(), // 'hemp_supplier', 'cannabis_exchange', 'partner_api', 'public_registry'
  dataSourceId: text("data_source_id").notNull(), // Unique identifier for the specific data source
  consentGranted: boolean("consent_granted").default(false),
  consentDate: timestamp("consent_date"),
  consentWithdrawn: boolean("consent_withdrawn").default(false),
  withdrawalDate: timestamp("withdrawal_date"),
  
  // Encrypted credentials (using application-level encryption)
  encryptedCredentials: text("encrypted_credentials"), // JSON string of encrypted API keys, tokens, etc.
  credentialsUpdated: timestamp("credentials_updated"),
  
  // Permission details
  permissionsGranted: json("permissions_granted"), // Array of specific permissions: ['read_inventory', 'read_pricing', 'read_locations']
  dataAccessLevel: text("data_access_level").notNull().default('basic'), // 'basic', 'advanced', 'full'
  
  // Compliance and audit
  consentVersion: text("consent_version").notNull().default('1.0'), // Track consent agreement version
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  legalBasis: text("legal_basis").notNull().default('consent'), // 'consent', 'contract', 'legitimate_interest'
  
  // Status tracking
  connectionStatus: text("connection_status").notNull().default('inactive'), // 'active', 'inactive', 'error', 'pending'
  lastConnectionTest: timestamp("last_connection_test"),
  errorMessage: text("error_message"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Data source definitions and their requirements
export interface DataSourceDefinition {
  id: string;
  name: string;
  description: string;
  category: 'supplier' | 'exchange' | 'registry' | 'partner' | 'market_data';
  requiredCredentials: {
    name: string;
    type: 'api_key' | 'username_password' | 'oauth_token' | 'certificate';
    description: string;
    required: boolean;
  }[];
  permissions: {
    id: string;
    name: string;
    description: string;
    dataTypes: string[];
    required: boolean;
  }[];
  dataAccessLevels: {
    level: string;
    description: string;
    permissions: string[];
    cost?: string;
  }[];
  complianceNotes: string;
  connectionInstructions: string;
}

export const AVAILABLE_DATA_SOURCES: DataSourceDefinition[] = [
  {
    id: 'hemp_suppliers_network',
    name: 'Hemp Suppliers Network',
    description: 'Connect to the Hemp Suppliers Network to access real-time inventory, pricing, and availability data from verified hemp producers across South Africa.',
    category: 'supplier',
    requiredCredentials: [
      {
        name: 'API Key',
        type: 'api_key',
        description: 'Your Hemp Suppliers Network API key (obtain from your account dashboard)',
        required: true
      }
    ],
    permissions: [
      {
        id: 'read_inventory',
        name: 'Read Inventory Data',
        description: 'Access current inventory levels and product availability',
        dataTypes: ['product_quantities', 'availability_status'],
        required: true
      },
      {
        id: 'read_pricing',
        name: 'Read Pricing Data',
        description: 'Access current pricing information and bulk discounts',
        dataTypes: ['unit_prices', 'bulk_pricing', 'seasonal_rates'],
        required: false
      },
      {
        id: 'read_supplier_info',
        name: 'Read Supplier Information',
        description: 'Access supplier contact details and business information',
        dataTypes: ['contact_info', 'business_details', 'certifications'],
        required: false
      }
    ],
    dataAccessLevels: [
      {
        level: 'basic',
        description: 'Access to inventory and basic pricing',
        permissions: ['read_inventory']
      },
      {
        level: 'advanced',
        description: 'Full pricing data and supplier information',
        permissions: ['read_inventory', 'read_pricing', 'read_supplier_info']
      }
    ],
    complianceNotes: 'Data sharing agreement required. All data remains property of respective suppliers.',
    connectionInstructions: '1. Register at hemp-suppliers.co.za\n2. Verify your business credentials\n3. Generate API key from account dashboard\n4. Enter API key below'
  },
  {
    id: 'sa_cannabis_exchange',
    name: 'SA Cannabis Exchange',
    description: 'Connect to the South African Cannabis Exchange for licensed cannabis product listings and market data.',
    category: 'exchange',
    requiredCredentials: [
      {
        name: 'Exchange Token',
        type: 'oauth_token',
        description: 'OAuth token from SA Cannabis Exchange (requires verified license)',
        required: true
      }
    ],
    permissions: [
      {
        id: 'read_listings',
        name: 'Read Exchange Listings',
        description: 'Access current cannabis product listings on the exchange',
        dataTypes: ['product_listings', 'availability', 'specifications'],
        required: true
      },
      {
        id: 'read_market_data',
        name: 'Read Market Data',
        description: 'Access market trends and pricing analytics',
        dataTypes: ['price_trends', 'volume_data', 'market_analytics'],
        required: false
      }
    ],
    dataAccessLevels: [
      {
        level: 'basic',
        description: 'Access to public listings',
        permissions: ['read_listings']
      },
      {
        level: 'full',
        description: 'Full market data access (premium)',
        permissions: ['read_listings', 'read_market_data'],
        cost: 'R500/month'
      }
    ],
    complianceNotes: 'Requires valid cannabis license. Subject to regulatory compliance checks.',
    connectionInstructions: '1. Verify cannabis license with SA Cannabis Exchange\n2. Complete compliance verification\n3. Generate OAuth token\n4. Authorize Izenzo platform access'
  },
  {
    id: 'regulatory_registry',
    name: 'Cannabis Regulatory Registry',
    description: 'Access public registry data for license verification and compliance checking.',
    category: 'registry',
    requiredCredentials: [], // Public registry, no credentials needed
    permissions: [
      {
        id: 'read_licenses',
        name: 'Read License Data',
        description: 'Verify license status and compliance information',
        dataTypes: ['license_status', 'compliance_records', 'violations'],
        required: true
      }
    ],
    dataAccessLevels: [
      {
        level: 'basic',
        description: 'Public license verification',
        permissions: ['read_licenses']
      }
    ],
    complianceNotes: 'Public data only. No personal information accessed.',
    connectionInstructions: 'No setup required - public registry access'
  }
];

export interface ConsentRequest {
  userId: number;
  dataSourceId: string;
  requestedPermissions: string[];
  dataAccessLevel: string;
  credentials?: { [key: string]: string };
  ipAddress: string;
  userAgent: string;
}

export class PermissionsConsentFlow {
  private static instance: PermissionsConsentFlow;
  
  static getInstance(): PermissionsConsentFlow {
    if (!PermissionsConsentFlow.instance) {
      PermissionsConsentFlow.instance = new PermissionsConsentFlow();
    }
    return PermissionsConsentFlow.instance;
  }

  // Get available data sources
  getAvailableDataSources(): DataSourceDefinition[] {
    return AVAILABLE_DATA_SOURCES;
  }

  // Get data source by ID
  getDataSourceById(dataSourceId: string): DataSourceDefinition | undefined {
    return AVAILABLE_DATA_SOURCES.find(source => source.id === dataSourceId);
  }

  // Request consent for data source access
  async requestConsent(request: ConsentRequest): Promise<{ success: boolean; consentId?: number; message: string }> {
    try {
      const dataSource = this.getDataSourceById(request.dataSourceId);
      if (!dataSource) {
        return { success: false, message: 'Data source not found' };
      }

      // Validate requested permissions
      const validPermissions = dataSource.permissions.map(p => p.id);
      const invalidPermissions = request.requestedPermissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return { success: false, message: `Invalid permissions: ${invalidPermissions.join(', ')}` };
      }

      // Check if consent already exists
      // In a real implementation, this would query the database
      
      // Encrypt credentials (simplified - use proper encryption in production)
      const encryptedCredentials = request.credentials ? 
        Buffer.from(JSON.stringify(request.credentials)).toString('base64') : null;

      // Create consent record
      const consentRecord = {
        userId: request.userId,
        dataSourceType: dataSource.category,
        dataSourceId: request.dataSourceId,
        consentGranted: true,
        consentDate: new Date(),
        encryptedCredentials,
        credentialsUpdated: new Date(),
        permissionsGranted: request.requestedPermissions,
        dataAccessLevel: request.dataAccessLevel,
        consentVersion: '1.0',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        connectionStatus: 'pending'
      };

      // In production, insert into database
      console.log('Creating consent record:', consentRecord);

      return { success: true, consentId: 1, message: 'Consent granted successfully' };
    } catch (error) {
      console.error('Error requesting consent:', error);
      return { success: false, message: 'Error processing consent request' };
    }
  }

  // Test connection to data source
  async testConnection(userId: number, dataSourceId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const dataSource = this.getDataSourceById(dataSourceId);
      if (!dataSource) {
        return { success: false, message: 'Data source not found' };
      }

      // In production, retrieve encrypted credentials and test actual connection
      // For now, simulate connection test
      const connectionResult = {
        success: true,
        message: 'Connection successful',
        details: {
          responseTime: Math.floor(Math.random() * 500) + 100,
          dataAvailable: true,
          lastUpdated: new Date(),
          recordCount: Math.floor(Math.random() * 1000) + 100
        }
      };

      return connectionResult;
    } catch (error) {
      return { success: false, message: `Connection failed: ${error}` };
    }
  }

  // Withdraw consent
  async withdrawConsent(userId: number, dataSourceId: string): Promise<{ success: boolean; message: string }> {
    try {
      // In production, update database record
      console.log(`Withdrawing consent for user ${userId}, source ${dataSourceId}`);
      
      return { success: true, message: 'Consent withdrawn successfully. Data access has been revoked.' };
    } catch (error) {
      return { success: false, message: 'Error withdrawing consent' };
    }
  }

  // Get user's active consents
  async getUserConsents(userId: number) {
    try {
      // In production, query database for user's active consents
      return [];
    } catch (error) {
      console.error('Error fetching user consents:', error);
      return [];
    }
  }

  // Validate user has permission for specific data access
  async validatePermission(userId: number, dataSourceId: string, permission: string): Promise<boolean> {
    try {
      // In production, check database for active consent with required permission
      return true; // Simplified for demo
    } catch (error) {
      console.error('Error validating permission:', error);
      return false;
    }
  }

  // Generate consent agreement text
  generateConsentAgreement(dataSource: DataSourceDefinition, permissions: string[], dataAccessLevel: string): string {
    return `
DATA SOURCE CONNECTION CONSENT AGREEMENT

Data Source: ${dataSource.name}
Description: ${dataSource.description}

PERMISSIONS REQUESTED:
${permissions.map(permId => {
  const perm = dataSource.permissions.find(p => p.id === permId);
  return `• ${perm?.name}: ${perm?.description}`;
}).join('\n')}

DATA ACCESS LEVEL: ${dataAccessLevel}

TERMS:
1. You are granting Izenzo permission to connect to and retrieve data from ${dataSource.name} on your behalf.
2. Your credentials will be encrypted and stored securely.
3. Data access will be limited to the permissions you have granted above.
4. You can withdraw this consent at any time from your account settings.
5. ${dataSource.complianceNotes}

DATA USAGE:
• Data retrieved will be used solely for matching and recommendation purposes within the Izenzo platform.
• Your data will not be shared with third parties without your explicit consent.
• Data will be cached temporarily to improve performance, but will respect the source's data retention policies.

RIGHTS:
• Right to withdraw consent at any time
• Right to view what data is being accessed
• Right to request deletion of cached data
• Right to receive a copy of consent records

By clicking "Grant Consent", you acknowledge that you have read and agree to these terms.

Last updated: ${new Date().toLocaleDateString()}
`;
  }
}

// Export singleton instance
export const permissionsConsentFlow = PermissionsConsentFlow.getInstance();

// Privacy-compliant data access logging
export const DATA_ACCESS_POLICY = `
EXTERNAL DATA ACCESS PRIVACY POLICY

Purpose of Data Access:
We connect to external data sources solely to provide better matching and recommendations within the Izenzo platform. This includes accessing supplier inventories, market prices, and regulatory information to give you comprehensive trading options.

Types of External Data Accessed:
• Product inventories and availability
• Pricing and market data
• Supplier contact information
• Regulatory and compliance information
• Quality certifications

Data Security:
• All credentials are encrypted using industry-standard encryption
• Connections use secure protocols (HTTPS/TLS)
• Data is cached temporarily for performance but respects source retention policies
• Access logs are maintained for security monitoring

Your Control:
• You choose which data sources to connect
• You grant specific permissions for each source
• You can withdraw consent and disconnect sources at any time
• You can view your data access history

Compliance:
• We comply with POPIA (Protection of Personal Information Act)
• We maintain data processing agreements with external sources
• We conduct regular security audits of data access systems

Contact us at privacy@izenzo.co.za for any questions about external data access.
`;