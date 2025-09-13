import { 
  User, InsertUser, 
  Listing, InsertListing, 
  Order, InsertOrder, 
  Message, InsertMessage, 
  CannabisProduct, InsertCannabisProduct, 
  MarketTrend, InsertMarketTrend,
  QualityCertificate, InsertQualityCertificate,
  BuySignal, InsertBuySignal,
  SignalResponse, InsertSignalResponse,
  Mandate, InsertMandate,
  DealAttribution, InsertDealAttribution,
  Organization, InsertOrganization,
  Event, InsertEvent,
  Document, InsertDocument,
  users, listings, orders, messages, cannabisProducts, marketTrends, qualityCertificates, buySignals, signalResponses, mandates, dealAttributions, organizations, events, documents
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // Listing operations
  getListings(filters?: Partial<Listing>, limit?: number, offset?: number): Promise<Listing[]>;
  getListingById(id: number): Promise<Listing | undefined>;
  getListingsBySellerId(sellerId: number): Promise<Listing[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: number, data: Partial<Listing>): Promise<Listing | undefined>;
  deleteListing(id: number): Promise<boolean>;
  getFeaturedListings(limit?: number): Promise<Listing[]>;
  
  // Order operations
  getOrders(filters?: Partial<Order>): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersByBuyerId(buyerId: number): Promise<Order[]>;
  getOrdersBySellerId(sellerId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined>;
  
  // Message operations
  getMessagesByUserId(userId: number): Promise<Message[]>;
  getConversation(user1Id: number, user2Id: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  
  // Cannabis product operations
  getCannabisProducts(filters?: Partial<CannabisProduct>): Promise<CannabisProduct[]>;
  getCannabisProductById(id: number): Promise<CannabisProduct | undefined>;
  getCannabisProductsByOwnerId(ownerId: number): Promise<CannabisProduct[]>;
  createCannabisProduct(cannabisProduct: InsertCannabisProduct): Promise<CannabisProduct>;
  updateCannabisProduct(id: number, data: Partial<CannabisProduct>): Promise<CannabisProduct | undefined>;
  
  // Market trends operations
  getMarketTrends(): Promise<MarketTrend[]>;
  getLatestMarketTrends(limit?: number): Promise<MarketTrend[]>;
  createMarketTrend(trend: InsertMarketTrend): Promise<MarketTrend>;
  
  // Quality certificate operations
  getQualityCertificates(filters?: Partial<QualityCertificate>): Promise<QualityCertificate[]>;
  getQualityCertificateById(id: number): Promise<QualityCertificate | undefined>;
  getQualityCertificatesByListingId(listingId: number): Promise<QualityCertificate[]>;
  getQualityCertificatesByProductId(productId: number): Promise<QualityCertificate[]>;
  getQualityCertificatesBySellerId(sellerId: number): Promise<QualityCertificate[]>;
  createQualityCertificate(certificate: InsertQualityCertificate): Promise<QualityCertificate>;
  updateQualityCertificate(id: number, data: Partial<QualityCertificate>): Promise<QualityCertificate | undefined>;
  verifyQualityCertificate(id: number, verifierId: number, status: 'approved' | 'rejected'): Promise<QualityCertificate | undefined>;

  // Buy Signal operations
  getBuySignals(filters?: Partial<BuySignal>, limit?: number, offset?: number): Promise<BuySignal[]>;
  getBuySignalById(id: number): Promise<BuySignal | undefined>;
  getBuySignalsByBuyerId(buyerId: number): Promise<BuySignal[]>;
  createBuySignal(buySignal: InsertBuySignal): Promise<BuySignal>;
  updateBuySignal(id: number, data: Partial<BuySignal>): Promise<BuySignal | undefined>;
  incrementBuySignalViews(id: number): Promise<boolean>;
  incrementBuySignalResponses(id: number): Promise<boolean>;
  deactivateBuySignal(id: number): Promise<boolean>;
  
  // Signal Response operations
  getSignalResponses(buySignalId: number): Promise<SignalResponse[]>;
  getSignalResponseById(id: number): Promise<SignalResponse | undefined>;
  getSignalResponsesBySellerId(sellerId: number): Promise<SignalResponse[]>;
  createSignalResponse(response: InsertSignalResponse): Promise<SignalResponse>;
  markSignalResponseAsRead(id: number): Promise<boolean>;
  
  // Mandate operations
  getMandates(filters?: Partial<Mandate>): Promise<Mandate[]>;
  getMandateById(id: number): Promise<Mandate | undefined>;
  getMandatesByBrokerId(brokerId: number): Promise<Mandate[]>;
  getMandatesBySellerOrgId(sellerOrgId: number): Promise<Mandate[]>;
  getActiveBrokerMandate(brokerId: number, sellerId: number): Promise<Mandate | undefined>;
  createMandate(mandate: InsertMandate): Promise<Mandate>;
  updateMandate(id: number, data: Partial<Mandate>): Promise<Mandate | undefined>;
  revokeMandate(id: number, revokedBy: number, reason?: string): Promise<boolean>;
  
  // Deal Attribution operations
  getDealAttributions(filters?: Partial<DealAttribution>): Promise<DealAttribution[]>;
  getDealAttributionById(id: number): Promise<DealAttribution | undefined>;
  getDealAttributionsByListingId(listingId: number): Promise<DealAttribution[]>;
  getDealAttributionsByBrokerId(brokerId: number): Promise<DealAttribution[]>;
  getDealAttributionsBySellerOrgId(sellerOrgId: number): Promise<DealAttribution[]>;
  createDealAttribution(dealAttribution: InsertDealAttribution): Promise<DealAttribution>;
  
  // Organization operations
  getOrganizations(filters?: Partial<Organization>): Promise<Organization[]>;
  getOrganizationById(id: number): Promise<Organization | undefined>;
  getOrganizationsByAdminUserId(adminUserId: number): Promise<Organization[]>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined>;
  
  // Event operations
  getEvents(filters?: Partial<Event>): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  getEventsByUserId(userId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // Document operations
  getDocuments(filters?: { userId?: number, documentType?: string }): Promise<Document[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  getDocumentsByUserId(userId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  getUserDocumentStatus(userId: number): Promise<{
    has_required_docs: boolean;
    doc_status: "missing" | "uploaded" | "verified" | "expired";
    missing_doc_types: string[];
    total_docs: number;
  }>;
  
  // Session store
  sessionStore: any; // Using any for session store since the type is not properly exposed
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Listing operations
  async getListings(filters?: Partial<Listing>, limit?: number, offset?: number): Promise<Listing[]> {
    // Note: Cannabis/hemp filtering is handled at the application level in routes.ts
    // This allows for more flexible filtering without complex SQL
    
    const conditions = [];
    
    // Add filters if provided
    if (filters?.category) {
      conditions.push(eq(listings.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(listings.status, filters.status));
    }
    if (filters?.sellerId) {
      conditions.push(eq(listings.sellerId, filters.sellerId));
    }

    let query = db.select().from(listings);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Add pagination
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }
    
    // Order by newest first for consistent pagination
    query = query.orderBy(desc(listings.createdAt));

    return query;
  }

  async getListingById(id: number): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing;
  }

  async getListingsBySellerId(sellerId: number): Promise<Listing[]> {
    return db.select().from(listings).where(eq(listings.sellerId, sellerId));
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const [listing] = await db.insert(listings).values(insertListing).returning();
    return listing;
  }

  async updateListing(id: number, data: Partial<Listing>): Promise<Listing | undefined> {
    const [updatedListing] = await db
      .update(listings)
      .set(data)
      .where(eq(listings.id, id))
      .returning();
    return updatedListing;
  }

  async deleteListing(id: number): Promise<boolean> {
    const result = await db.delete(listings).where(eq(listings.id, id)).returning({ id: listings.id });
    return result.length > 0;
  }

  async getFeaturedListings(limit = 4): Promise<Listing[]> {
    return db
      .select()
      .from(listings)
      .where(eq(listings.isFeatured, true))
      .limit(limit);
  }

  // Order operations
  async getOrders(filters?: Partial<Order>): Promise<Order[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return db.select().from(orders);
    }

    // Build dynamic where conditions
    const conditions = [];
    if (filters.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    if (filters.buyerId) {
      conditions.push(eq(orders.buyerId, filters.buyerId));
    }
    if (filters.sellerId) {
      conditions.push(eq(orders.sellerId, filters.sellerId));
    }
    if (filters.listingId) {
      conditions.push(eq(orders.listingId, filters.listingId));
    }

    if (conditions.length === 0) {
      return db.select().from(orders);
    }

    return db.select().from(orders).where(and(...conditions));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByBuyerId(buyerId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.buyerId, buyerId));
  }

  async getOrdersBySellerId(sellerId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.sellerId, sellerId));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Message operations
  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async getConversation(user1Id: number, user2Id: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, user1Id),
            eq(messages.receiverId, user2Id)
          ),
          and(
            eq(messages.senderId, user2Id),
            eq(messages.receiverId, user1Id)
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(messages)
      .set({ status: 'read' })
      .where(eq(messages.id, id))
      .returning({ id: messages.id });
    return result.length > 0;
  }

  // Cannabis products operations
  async getCannabisProducts(filters?: Partial<CannabisProduct>): Promise<CannabisProduct[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return db.select().from(cannabisProducts);
    }

    // Build dynamic where conditions
    const conditions = [];
    if (filters.ownerId) {
      conditions.push(eq(cannabisProducts.ownerId, filters.ownerId));
    }
    // Add more conditions as needed

    if (conditions.length === 0) {
      return db.select().from(cannabisProducts);
    }

    return db.select().from(cannabisProducts).where(and(...conditions));
  }

  async getCannabisProductById(id: number): Promise<CannabisProduct | undefined> {
    const [product] = await db.select().from(cannabisProducts).where(eq(cannabisProducts.id, id));
    return product;
  }

  async getCannabisProductsByOwnerId(ownerId: number): Promise<CannabisProduct[]> {
    return db.select().from(cannabisProducts).where(eq(cannabisProducts.ownerId, ownerId));
  }

  async createCannabisProduct(insertCannabisProduct: InsertCannabisProduct): Promise<CannabisProduct> {
    const [product] = await db.insert(cannabisProducts).values(insertCannabisProduct).returning();
    return product;
  }

  async updateCannabisProduct(id: number, data: Partial<CannabisProduct>): Promise<CannabisProduct | undefined> {
    const [updatedProduct] = await db
      .update(cannabisProducts)
      .set(data)
      .where(eq(cannabisProducts.id, id))
      .returning();
    return updatedProduct;
  }

  // Market trends operations
  async getMarketTrends(): Promise<MarketTrend[]> {
    return db.select().from(marketTrends);
  }

  async getLatestMarketTrends(limit = 4): Promise<MarketTrend[]> {
    return db
      .select()
      .from(marketTrends)
      .orderBy(desc(marketTrends.recordedAt))
      .limit(limit);
  }

  async createMarketTrend(insertTrend: InsertMarketTrend): Promise<MarketTrend> {
    const [trend] = await db.insert(marketTrends).values(insertTrend).returning();
    return trend;
  }

  // Quality certificate operations
  async getQualityCertificates(filters?: Partial<QualityCertificate>): Promise<QualityCertificate[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return db.select().from(qualityCertificates);
    }

    // Build dynamic where conditions
    const conditions = [];
    if (filters.sellerId) {
      conditions.push(eq(qualityCertificates.sellerId, filters.sellerId));
    }
    if (filters.listingId) {
      conditions.push(eq(qualityCertificates.listingId, filters.listingId));
    }
    if (filters.productId) {
      conditions.push(eq(qualityCertificates.productId, filters.productId));
    }
    if (filters.verificationStatus) {
      conditions.push(eq(qualityCertificates.verificationStatus, filters.verificationStatus));
    }

    if (conditions.length === 0) {
      return db.select().from(qualityCertificates);
    }

    return db.select().from(qualityCertificates).where(and(...conditions));
  }

  async getQualityCertificateById(id: number): Promise<QualityCertificate | undefined> {
    const [certificate] = await db.select().from(qualityCertificates).where(eq(qualityCertificates.id, id));
    return certificate;
  }

  async getQualityCertificatesByListingId(listingId: number): Promise<QualityCertificate[]> {
    return db.select().from(qualityCertificates).where(eq(qualityCertificates.listingId, listingId));
  }

  async getQualityCertificatesByProductId(productId: number): Promise<QualityCertificate[]> {
    return db.select().from(qualityCertificates).where(eq(qualityCertificates.productId, productId));
  }

  async getQualityCertificatesBySellerId(sellerId: number): Promise<QualityCertificate[]> {
    return db.select().from(qualityCertificates).where(eq(qualityCertificates.sellerId, sellerId));
  }

  async createQualityCertificate(insertCertificate: InsertQualityCertificate): Promise<QualityCertificate> {
    const [certificate] = await db.insert(qualityCertificates).values(insertCertificate).returning();
    return certificate;
  }

  async updateQualityCertificate(id: number, data: Partial<QualityCertificate>): Promise<QualityCertificate | undefined> {
    const [updatedCertificate] = await db
      .update(qualityCertificates)
      .set(data)
      .where(eq(qualityCertificates.id, id))
      .returning();
    return updatedCertificate;
  }

  async verifyQualityCertificate(id: number, verifierId: number, status: 'approved' | 'rejected'): Promise<QualityCertificate | undefined> {
    const [verifiedCertificate] = await db
      .update(qualityCertificates)
      .set({
        verificationStatus: status,
        verifiedBy: verifierId,
        verificationDate: new Date()
      })
      .where(eq(qualityCertificates.id, id))
      .returning();
    
    // If the certificate is approved and associated with a listing, update the listing's verification status
    if (status === 'approved' && verifiedCertificate && verifiedCertificate.listingId) {
      await db
        .update(listings)
        .set({ isVerified: true })
        .where(eq(listings.id, verifiedCertificate.listingId));
    }
    
    return verifiedCertificate;
  }

  // Buy Signal operations
  async getBuySignals(filters?: Partial<BuySignal>, limit?: number, offset?: number): Promise<BuySignal[]> {
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(buySignals.category, filters.category));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(buySignals.isActive, filters.isActive));
    }

    if (filters?.buyerId) {
      conditions.push(eq(buySignals.buyerId, filters.buyerId));
    }

    let query = db.select().from(buySignals);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(buySignals.createdAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }

    return await query;
  }

  async getBuySignalById(id: number): Promise<BuySignal | undefined> {
    const [buySignal] = await db.select().from(buySignals).where(eq(buySignals.id, id));
    return buySignal;
  }

  async getBuySignalsByBuyerId(buyerId: number): Promise<BuySignal[]> {
    return await db.select()
      .from(buySignals)
      .where(eq(buySignals.buyerId, buyerId))
      .orderBy(desc(buySignals.createdAt));
  }

  async createBuySignal(insertBuySignal: InsertBuySignal): Promise<BuySignal> {
    const [buySignal] = await db.insert(buySignals).values(insertBuySignal).returning();
    return buySignal;
  }

  async updateBuySignal(id: number, data: Partial<BuySignal>): Promise<BuySignal | undefined> {
    const [updatedBuySignal] = await db
      .update(buySignals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(buySignals.id, id))
      .returning();
    return updatedBuySignal;
  }

  async incrementBuySignalViews(id: number): Promise<boolean> {
    const result = await db
      .update(buySignals)
      .set({ viewCount: sql`${buySignals.viewCount} + 1` })
      .where(eq(buySignals.id, id));
    return result.rowsAffected > 0;
  }

  async incrementBuySignalResponses(id: number): Promise<boolean> {
    const result = await db
      .update(buySignals)
      .set({ responseCount: sql`${buySignals.responseCount} + 1` })
      .where(eq(buySignals.id, id));
    return result.rowsAffected > 0;
  }

  async deactivateBuySignal(id: number): Promise<boolean> {
    const result = await db
      .update(buySignals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(buySignals.id, id));
    return result.rowsAffected > 0;
  }

  // Signal Response operations
  async getSignalResponses(buySignalId: number): Promise<SignalResponse[]> {
    return await db.select()
      .from(signalResponses)
      .where(eq(signalResponses.buySignalId, buySignalId))
      .orderBy(desc(signalResponses.createdAt));
  }

  async getSignalResponseById(id: number): Promise<SignalResponse | undefined> {
    const [signalResponse] = await db.select().from(signalResponses).where(eq(signalResponses.id, id));
    return signalResponse;
  }

  async getSignalResponsesBySellerId(sellerId: number): Promise<SignalResponse[]> {
    return await db.select()
      .from(signalResponses)
      .where(eq(signalResponses.sellerId, sellerId))
      .orderBy(desc(signalResponses.createdAt));
  }

  async createSignalResponse(insertSignalResponse: InsertSignalResponse): Promise<SignalResponse> {
    const [signalResponse] = await db.insert(signalResponses).values(insertSignalResponse).returning();
    
    // Also increment the response count on the buy signal
    await this.incrementBuySignalResponses(insertSignalResponse.buySignalId);
    
    return signalResponse;
  }

  async markSignalResponseAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(signalResponses)
      .set({ isRead: true })
      .where(eq(signalResponses.id, id));
    return result.rowsAffected > 0;
  }

  // Mandate operations
  async getMandates(filters?: Partial<Mandate>): Promise<Mandate[]> {
    let query = db.select().from(mandates);
    
    if (filters) {
      const conditions = [];
      if (filters.brokerId) conditions.push(eq(mandates.brokerId, filters.brokerId));
      if (filters.sellerOrgId) conditions.push(eq(mandates.sellerOrgId, filters.sellerOrgId));
      if (filters.status) conditions.push(eq(mandates.status, filters.status));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(mandates.createdAt));
  }

  async getMandateById(id: number): Promise<Mandate | undefined> {
    const [mandate] = await db.select().from(mandates).where(eq(mandates.id, id));
    return mandate;
  }

  async getMandatesByBrokerId(brokerId: number): Promise<Mandate[]> {
    return await db.select()
      .from(mandates)
      .where(eq(mandates.brokerId, brokerId))
      .orderBy(desc(mandates.createdAt));
  }

  async getMandatesBySellerOrgId(sellerOrgId: number): Promise<Mandate[]> {
    return await db.select()
      .from(mandates)
      .where(eq(mandates.sellerOrgId, sellerOrgId))
      .orderBy(desc(mandates.createdAt));
  }

  async getActiveBrokerMandate(brokerId: number, sellerId: number): Promise<Mandate | undefined> {
    // Find active mandate for this broker with organization that contains this seller
    const [mandate] = await db.select()
      .from(mandates)
      .leftJoin(organizations, eq(mandates.sellerOrgId, organizations.id))
      .where(and(
        eq(mandates.brokerId, brokerId),
        eq(organizations.adminUserId, sellerId), // Organization admin matches seller
        eq(mandates.status, 'active')
      ));
    return mandate ? mandate.mandates : undefined;
  }

  async createMandate(insertMandate: InsertMandate): Promise<Mandate> {
    const [mandate] = await db.insert(mandates).values(insertMandate).returning();
    return mandate;
  }

  async updateMandate(id: number, data: Partial<Mandate>): Promise<Mandate | undefined> {
    const [updatedMandate] = await db
      .update(mandates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mandates.id, id))
      .returning();
    return updatedMandate;
  }

  async revokeMandate(id: number, revokedBy: number, reason?: string): Promise<boolean> {
    const result = await db
      .update(mandates)
      .set({
        status: 'revoked',
        updatedAt: new Date()
      })
      .where(eq(mandates.id, id));
    return result.rowsAffected > 0;
  }

  // Deal Attribution operations
  async getDealAttributions(filters?: Partial<DealAttribution>): Promise<DealAttribution[]> {
    let query = db.select().from(dealAttributions);
    
    if (filters) {
      const conditions = [];
      if (filters.listingId) conditions.push(eq(dealAttributions.listingId, filters.listingId));
      if (filters.brokerUserId) conditions.push(eq(dealAttributions.brokerUserId, filters.brokerUserId));
      if (filters.sellerUserId) conditions.push(eq(dealAttributions.sellerUserId, filters.sellerUserId));
      if (filters.buyerUserId) conditions.push(eq(dealAttributions.buyerUserId, filters.buyerUserId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(dealAttributions.createdAt));
  }

  async getDealAttributionById(id: number): Promise<DealAttribution | undefined> {
    const [dealAttribution] = await db.select().from(dealAttributions).where(eq(dealAttributions.id, id));
    return dealAttribution;
  }

  async getDealAttributionsByListingId(listingId: number): Promise<DealAttribution[]> {
    return await db.select()
      .from(dealAttributions)
      .where(eq(dealAttributions.listingId, listingId))
      .orderBy(desc(dealAttributions.createdAt));
  }

  async getDealAttributionsByBrokerId(brokerId: number): Promise<DealAttribution[]> {
    return await db.select()
      .from(dealAttributions)
      .where(eq(dealAttributions.brokerUserId, brokerId))
      .orderBy(desc(dealAttributions.createdAt));
  }

  async getDealAttributionsBySellerOrgId(sellerOrgId: number): Promise<DealAttribution[]> {
    return await db.select()
      .from(dealAttributions)
      .where(eq(dealAttributions.sellerOrgId, sellerOrgId))
      .orderBy(desc(dealAttributions.createdAt));
  }

  async createDealAttribution(insertDealAttribution: InsertDealAttribution): Promise<DealAttribution> {
    const [dealAttribution] = await db.insert(dealAttributions).values(insertDealAttribution).returning();
    return dealAttribution;
  }

  // Organization operations
  async getOrganizations(filters?: Partial<Organization>): Promise<Organization[]> {
    let query = db.select().from(organizations);
    
    if (filters) {
      const conditions = [];
      if (filters.name) conditions.push(eq(organizations.name, filters.name));
      if (filters.adminUserId) conditions.push(eq(organizations.adminUserId, filters.adminUserId));
      if (filters.isVerified !== undefined) conditions.push(eq(organizations.isVerified, filters.isVerified));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(organizations.createdAt));
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }

  async getOrganizationsByAdminUserId(adminUserId: number): Promise<Organization[]> {
    return await db.select()
      .from(organizations)
      .where(eq(organizations.adminUserId, adminUserId))
      .orderBy(desc(organizations.createdAt));
  }

  async createOrganization(insertOrganization: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(insertOrganization).returning();
    return organization;
  }

  async updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined> {
    const [updatedOrganization] = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updatedOrganization;
  }

  // Event operations
  async getEvents(filters?: Partial<Event>): Promise<Event[]> {
    let query = db.select().from(events);
    
    if (filters) {
      const conditions = [];
      if (filters.eventType) conditions.push(eq(events.eventType, filters.eventType));
      if (filters.userId) conditions.push(eq(events.userId, filters.userId));
      if (filters.mandateId) conditions.push(eq(events.mandateId, filters.mandateId));
      if (filters.listingId) conditions.push(eq(events.listingId, filters.listingId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(events.createdAt));
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventsByUserId(userId: number): Promise<Event[]> {
    return await db.select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(desc(events.createdAt));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  // Document operations
  async getDocuments(filters?: { userId?: number, documentType?: string }): Promise<Document[]> {
    let query = db.select().from(documents).orderBy(desc(documents.createdAt));
    
    if (filters) {
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(documents.userId, filters.userId));
      }
      if (filters.documentType) {
        conditions.push(eq(documents.documentType, filters.documentType));
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query;
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values({
      ...document,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newDocument;
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return result.rowCount > 0;
  }

  async getUserDocumentStatus(userId: number): Promise<{
    has_required_docs: boolean;
    doc_status: "missing" | "uploaded" | "verified" | "expired";
    missing_doc_types: string[];
    total_docs: number;
  }> {
    try {
      // Get user to determine role-based requirements
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const userDocs = await this.getDocumentsByUserId(userId);
      console.log(`[DOCUMENT STATUS] User ${userId} (${user.role}) has ${userDocs.length} documents`);
      
      // Role-based document requirements
      const requiredTypes = user.role === 'buyer' 
        ? ["id_doc", "proof_of_address"] // Buyer requirements: ID + Proof of Address
        : ["license", "coa"];             // Seller requirements: License + COA
      
      if (userDocs.length === 0) {
        return {
          has_required_docs: false,
          doc_status: "missing",
          missing_doc_types: requiredTypes,
          total_docs: 0
        };
      }
      
      // Check for expired documents
      const now = new Date();
      const expiredDocs = userDocs.filter(doc => 
        doc.expiryDate && new Date(doc.expiryDate) < now
      );
      const hasExpired = expiredDocs.length > 0;
      
      // Check verification status (using correct enum values: pending, approved, rejected)
      const hasApproved = userDocs.some(doc => doc.verificationStatus === 'approved');
      const hasPending = userDocs.some(doc => doc.verificationStatus === 'pending');
      
      // Determine status
      let doc_status: "missing" | "uploaded" | "verified" | "expired";
      if (hasExpired) {
        doc_status = "expired";
      } else if (hasApproved) {
        doc_status = "verified";
      } else if (hasPending) {
        doc_status = "uploaded";
      } else {
        doc_status = "missing";
      }
      
      // Check for missing required document types (include expired ones as missing)
      // requiredTypes already set based on user role above
      const validDocs = userDocs.filter(doc => 
        !doc.expiryDate || new Date(doc.expiryDate) >= now // Not expired
      );
      const validDocTypes = validDocs.map(doc => doc.documentType);
      const missing_doc_types = requiredTypes.filter(type => !validDocTypes.includes(type));
      
      // Add expired document types to missing list
      const expiredDocTypes = expiredDocs.map(doc => doc.documentType);
      for (const expiredType of expiredDocTypes) {
        if (requiredTypes.includes(expiredType) && !missing_doc_types.includes(expiredType)) {
          missing_doc_types.push(expiredType);
        }
      }
      
      const has_required_docs = missing_doc_types.length === 0 && !hasExpired;
      
      console.log(`[DOCUMENT STATUS] User ${userId} status: has_required=${has_required_docs}, status=${doc_status}, missing=${JSON.stringify(missing_doc_types)}, expired=${expiredDocs.length}`);
      
      return {
        has_required_docs,
        doc_status,
        missing_doc_types,
        total_docs: userDocs.length
      };
    } catch (error) {
      console.error(`[DOCUMENT STATUS] Error getting document status for user ${userId}:`, error);
      // Return safe fallback
      return {
        has_required_docs: false,
        doc_status: "missing",
        missing_doc_types: ["id_doc", "proof_of_address"], // Safe fallback for buyers
        total_docs: 0
      };
    }
  }
}

export const storage = new DatabaseStorage();