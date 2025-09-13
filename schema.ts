import { pgTable, text, serial, integer, boolean, timestamp, json, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['buyer', 'seller', 'broker', 'admin']);
export const listingStatusEnum = pgEnum('listing_status', ['active', 'pending', 'sold', 'expired', 'draft']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'completed', 'cancelled']);
export const messageStatusEnum = pgEnum('message_status', ['unread', 'read']);
export const productCategoryEnum = pgEnum('product_category', ['cannabis-raw', 'cannabis-extracts', 'cannabis-infused', 'cannabis-medical', 'cannabis-cpg', 'hemp-industrial', 'wellness-lifestyle', 'byproducts-secondary', 'tech-ancillary']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'approved', 'rejected']);
export const supplyFrequencyEnum = pgEnum('supply_frequency', ['one-time', 'weekly', 'monthly', 'quarterly', 'on-demand', 'continuous']);
export const paymentMethodEnum = pgEnum('payment_method', ['bank-transfer', 'credit-card', 'cryptocurrency', 'cash', 'escrow', 'payment-on-delivery']);
export const mandateStatusEnum = pgEnum('mandate_status', ['pending', 'active', 'revoked', 'expired']);
export const commissionTypeEnum = pgEnum('commission_type', ['percent', 'flat']);
export const createdViaEnum = pgEnum('created_via', ['seller', 'broker']);
export const sellerTypeEnum = pgEnum('seller_type', ['direct_seller', 'broker']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default('buyer'),
  company: text("company"),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  bio: text("bio"),
  profileImage: text("profile_image"),
  isVerified: boolean("is_verified").default(false),
  verificationLevel: integer("verification_level").default(1),
  rating: real("rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organizations table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region"),
  sellerType: sellerTypeEnum("seller_type").notNull().default('direct_seller'),
  description: text("description"),
  website: text("website"),
  phone: text("phone"),
  address: text("address"),
  adminUserId: integer("admin_user_id").references(() => users.id),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table for audit logging
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // mandate_invited, mandate_accepted, etc.
  userId: integer("user_id").references(() => users.id),
  mandateId: integer("mandate_id").references(() => mandates.id),
  listingId: integer("listing_id").references(() => listings.id),
  dealAttributionId: integer("deal_attribution_id").references(() => dealAttributions.id),
  metadata: json("metadata"), // Additional event-specific data
  createdAt: timestamp("created_at").defaultNow(),
});

// Mandates - broker authority to act for sellers  
export const mandates = pgTable("mandates", {
  id: serial("id").primaryKey(),
  brokerId: integer("broker_user_id").notNull().references(() => users.id),
  sellerOrgId: integer("seller_org_id").notNull().references(() => organizations.id),
  status: mandateStatusEnum("status").notNull().default('pending'),
  // Scope controls
  scopeCommodities: text("scope_commodities").array(), // Specific commodities the broker can trade
  scopeRegions: text("scope_regions").array(), // Geographic regions the broker can operate in
  exclusive: boolean("exclusive").notNull().default(false), // Whether this is an exclusive mandate
  // Commission terms
  commissionType: commissionTypeEnum("commission_type").notNull().default('percent'),
  commissionRate: real("commission_rate"), // e.g. 5.00 for 5%, or flat amount
  // Evidence and legal
  docUrl: text("doc_url"), // URL to mandate document/contract
  // Validity period
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  activatedAt: timestamp("activated_at"), // When mandate was accepted
  // Audit trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Listings table
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  sellerOrgId: integer("seller_org_id").references(() => organizations.id),
  // Broker attribution fields
  createdByUserId: integer("created_by_user_id").references(() => users.id), // Who actually created the listing
  brokerUserId: integer("broker_user_id").references(() => users.id), // If created by broker on behalf
  createdVia: createdViaEnum("created_via").notNull().default('seller'), // How listing was created
  // Commission snapshot (captured at listing creation for audit)
  commissionTypeSnapshot: commissionTypeEnum("commission_type_snapshot"),
  commissionRateSnapshot: real("commission_rate_snapshot"),
  title: text("title").notNull(), // Keep title required - sellers should provide at least a title
  description: text("description"), // Optional - can be added later
  category: productCategoryEnum("category"), // Allow null for drafts - LEGACY
  subcategory: text("subcategory"), // Sub-category dependent on category - LEGACY
  categoryCode: productCategoryEnum("category_code"), // New code-based category
  subcategoryCode: text("subcategory_code"), // New code-based subcategory
  quantity: real("quantity"), // Optional - can negotiate quantity later
  unit: text("unit"), // Optional - can be specified later
  pricePerUnit: real("price_per_unit"), // Optional - pricing can be discussed later
  price: real("price"), // Optional - total price can be calculated later
  currency: text("currency").default("USD"),
  location: text("location"), // Optional - can be estimated or added later
  latitude: real("latitude"),
  longitude: real("longitude"),
  minOrderQuantity: real("min_order_quantity"),
  images: text("images").array(), // Optional - can be added later (though reduces listing quality)
  status: listingStatusEnum("status").default("active"),
  specifications: json("specifications"),
  qualityGrade: text("quality_grade").default("Standard"),
  isVerified: boolean("is_verified").default(false),
  availableUntil: timestamp("available_until"),
  isFeatured: boolean("is_featured").default(false),
  socialImpactScore: integer("social_impact_score").default(0),
  socialImpactCategory: text("social_impact_category").default(""),
  // Compliance fields now optional - can be uploaded later
  coaDocument: text("coa_document"), // Optional - Certificate of Analysis can be uploaded later
  supplyFrequency: supplyFrequencyEnum("supply_frequency"), // Optional - can be negotiated later
  paymentMethod: paymentMethodEnum("payment_method"), // Optional - can be negotiated later
  certificatesDocuments: text("certificates_documents").array(), // Optional - certificates can be uploaded later
  // Anonymity fields
  isAnonymous: boolean("is_anonymous").default(false), // Trade anonymously option
  tradingName: text("trading_name"), // Public trading name when anonymous
  createdAt: timestamp("created_at").defaultNow(),
});

// Deal Attributions - track commission and deal info when deals complete
export const dealAttributions = pgTable("deal_attributions", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listings.id),
  brokerUserId: integer("broker_user_id").references(() => users.id),
  sellerOrgId: integer("seller_org_id").notNull().references(() => organizations.id),
  buyerUserId: integer("buyer_user_id").references(() => users.id),
  commissionType: commissionTypeEnum("commission_type"),
  commissionRate: real("commission_rate"), // e.g. 5.00 for 5%
  calculatedCommission: real("calculated_commission"), // Actual commission amount
  currency: text("currency").default("USD"),
  gmv: real("gmv"), // Gross Merchandise Value (deal value)
  orderId: integer("order_id"), // Reference to the completed order
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  listingId: integer("listing_id").notNull().references(() => listings.id),
  quantity: real("quantity").notNull(),
  totalPrice: real("total_price").notNull(),
  status: orderStatusEnum("status").default("pending"),
  deliveryAddress: text("delivery_address"),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  relatedListingId: integer("related_listing_id").references(() => listings.id),
  relatedOrderId: integer("related_order_id").references(() => orders.id),
  status: messageStatusEnum("status").default("unread"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cannabis Products
export const cannabisProducts = pgTable("cannabis_products", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  productName: text("product_name").notNull(),
  strain: text("strain").notNull(),
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  quantity: real("quantity").notNull(),
  pricePerUnit: real("price_per_unit"),
  thcContent: real("thc_content"),
  cbdContent: real("cbd_content"),
  description: text("description"),
  certificationStandard: text("certification_standard"),
  harvestDate: timestamp("harvest_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Market Trends
export const marketTrends = pgTable("market_trends", {
  id: serial("id").primaryKey(),
  category: productCategoryEnum("category").notNull(),
  productName: text("product_name").notNull(),
  price: real("price").notNull(),
  unit: text("unit").notNull(),
  currency: text("currency").default("USD"),
  changePercentage: real("change_percentage"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Buy Signals - buyer wants ads
export const buySignals = pgTable("buy_signals", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: productCategoryEnum("category").notNull(),
  targetQuantity: real("target_quantity"),
  unit: text("unit"),
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  currency: text("currency").default("USD"),
  preferredLocation: text("preferred_location"),
  specifications: json("specifications"),
  urgency: text("urgency").default("normal"), // low, normal, high, urgent
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  responseCount: integer("response_count").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Signal Responses - seller responses to buy signals
export const signalResponses = pgTable("signal_responses", {
  id: serial("id").primaryKey(),
  buySignalId: integer("buy_signal_id").notNull().references(() => buySignals.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  offerPrice: real("offer_price"),
  offerQuantity: real("offer_quantity"),
  availableQuantity: real("available_quantity"),
  deliveryTime: text("delivery_time"),
  listingId: integer("listing_id").references(() => listings.id), // Optional link to existing listing
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table - tracks all uploaded files for users
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull(),
  documentType: text("document_type").notNull(), // 'coa', 'license', 'certificate', 'insurance', 'registration'
  objectPath: text("object_path").notNull(), // Path in object storage
  description: text("description"),
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  expiryDate: timestamp("expiry_date"), // For documents with expiration dates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quality Verification Certificates
export const qualityCertificates = pgTable("quality_certificates", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id),
  productId: integer("product_id").references(() => cannabisProducts.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  certifierName: text("certifier_name").notNull(),
  certifierCompany: text("certifier_company"),
  certifierContact: text("certifier_contact"),
  certificateNumber: text("certificate_number").notNull().unique(),
  issuedDate: timestamp("issued_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  qualityGrade: text("quality_grade").notNull(),
  thcContent: real("thc_content"),
  cbdContent: real("cbd_content"),
  otherCannabinoids: json("other_cannabinoids"),
  terpeneProfile: json("terpene_profile"),
  contaminantsTested: text("contaminants_tested").array(),
  pesticideFree: boolean("pesticide_free").default(false),
  heavyMetalFree: boolean("heavy_metal_free").default(false),
  microbiologicallyClean: boolean("microbiologically_clean").default(false),
  testResults: json("test_results"),
  certificateDocument: text("certificate_document"), // URL to document
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema Validation with Zod
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertListingSchema = createInsertSchema(listings).omit({ id: true, createdAt: true }).extend({
  // Keep title and category required
  title: z.string().min(1, "Product title is required"),
  category: z.enum(["cannabis-raw", "cannabis-extracts", "cannabis-infused", "cannabis-medical", "cannabis-cpg", "hemp-industrial", "wellness-lifestyle", "byproducts-secondary", "tech-ancillary"]).optional(),
  subcategory: z.string().optional(),
  sellerId: z.number().int().positive(), // sellerId is required for creating listings
  // Make previously required fields optional
  description: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  pricePerUnit: z.number().positive().optional(),
  price: z.number().positive().optional(),
  location: z.string().optional(),
  minOrderQuantity: z.number().positive().optional(), // Added missing field
  socialImpactScore: z.number().int().min(0).max(100).default(0),
  socialImpactCategory: z.string().default(""),
  images: z.array(z.string()).optional(), // Optional - no minimum required
  coaDocument: z.string().optional(), // Optional - can be uploaded later
  supplyFrequency: z.enum(["one-time", "weekly", "monthly", "quarterly", "on-demand", "continuous"]).optional(),
  paymentMethod: z.enum(["bank-transfer", "credit-card", "cryptocurrency", "cash", "escrow", "payment-on-delivery"]).optional(),
  certificatesDocuments: z.array(z.string()).optional(), // Optional - no minimum required
  // Anonymity fields - added missing fields
  isAnonymous: z.boolean().optional().default(false),
  tradingName: z.string().optional(),
});
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertCannabisProductSchema = createInsertSchema(cannabisProducts).omit({ id: true, createdAt: true });
export const insertMarketTrendSchema = createInsertSchema(marketTrends).omit({ id: true, recordedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true, 
  userId: true, // Server adds this from authenticated user
  createdAt: true, 
  updatedAt: true,
  verificationStatus: true, 
  verifiedBy: true, 
  verificationDate: true
});

export const insertQualityCertificateSchema = createInsertSchema(qualityCertificates).omit({ 
  id: true, 
  createdAt: true,
  verificationStatus: true, 
  verifiedBy: true, 
  verificationDate: true
});
export const insertBuySignalSchema = createInsertSchema(buySignals).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  responseCount: true,
  viewCount: true 
});
export const insertSignalResponseSchema = createInsertSchema(signalResponses).omit({ 
  id: true, 
  createdAt: true 
});
export const insertMandateSchema = createInsertSchema(mandates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertDealAttributionSchema = createInsertSchema(dealAttributions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertEventSchema = createInsertSchema(events).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type CannabisProduct = typeof cannabisProducts.$inferSelect;
export type InsertCannabisProduct = z.infer<typeof insertCannabisProductSchema>;

export type MarketTrend = typeof marketTrends.$inferSelect;
export type InsertMarketTrend = z.infer<typeof insertMarketTrendSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type QualityCertificate = typeof qualityCertificates.$inferSelect;
export type InsertQualityCertificate = z.infer<typeof insertQualityCertificateSchema>;

export type BuySignal = typeof buySignals.$inferSelect;
export type InsertBuySignal = z.infer<typeof insertBuySignalSchema>;

export type SignalResponse = typeof signalResponses.$inferSelect;
export type InsertSignalResponse = z.infer<typeof insertSignalResponseSchema>;

export type Mandate = typeof mandates.$inferSelect;
export type InsertMandate = z.infer<typeof insertMandateSchema>;

export type DealAttribution = typeof dealAttributions.$inferSelect;
export type InsertDealAttribution = z.infer<typeof insertDealAttributionSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// Login type
export type LoginData = Pick<InsertUser, "username" | "password">;
