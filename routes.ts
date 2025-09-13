import type { Express, Request, Response } from "express";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertListingSchema, 
  insertOrderSchema, 
  insertCannabisProductSchema,
  insertBuySignalSchema,
  insertSignalResponseSchema,
  insertOrganizationSchema,
  insertDocumentSchema,
  BuySignal,
  SignalResponse
} from "@shared/schema";
import blockchainService, { requireBlockchainVerification } from "./blockchain";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  parseObjectPath,
  objectStorageClient,
} from "./objectStorage";
import { TAXONOMY } from "./taxonomy.js";
import { normaliseCategoryPayload, subcategoryBelongs } from "./lib/categoryNormalizer";
import { computePublishBlockingIssues, subcategoryValid } from './publish-validation';

// Configure multer for file uploads (memory storage for server-side processing)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ 
    error: "Authentication required",
    message: "Please log in to access this resource"
  });
};

// Middleware factory for role-based access control
const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Please log in to access this resource"
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Access denied",
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        currentRole: req.user.role
      });
    }
    
    next();
  };
};

// Convenience middleware for common role combinations  
const requireSeller = requireRole('seller', 'admin'); // Sellers only
const requireSellerOrBroker = requireRole('seller', 'broker', 'admin'); // Sellers + brokers
const requireAdmin = requireRole('admin');

// Broker mandate checking middleware
const checkBrokerMandate = (requiredAction: string) => {
  return async (req: Request, res: Response, next: any) => {
    const user = req.user!;
    
    // If not a broker, skip mandate check
    if (user.role !== 'broker') {
      return next();
    }
    
    // For brokers, check if they have mandate to act for the seller
    const sellerId = req.body.sellerId || req.body.seller_id;
    if (!sellerId) {
      return res.status(400).json({
        error: "Broker operations require seller_id",
        message: "Brokers must specify which seller they are acting for"
      });
    }
    
    try {
      // Check for active mandate
      const mandate = await storage.getActiveBrokerMandate(user.id, sellerId);
      if (!mandate) {
        return res.status(403).json({
          error: "No valid mandate",
          message: "You don't have authorization to act for this seller"
        });
      }
      
      // With the new schema, all active mandates allow basic operations
      // Scope restrictions (commodities, regions) would be checked in business logic
      
      // Store mandate info for later use
      req.brokerMandate = mandate;
      next();
    } catch (error) {
      console.error('Error checking broker mandate:', error);
      res.status(500).json({ error: "Failed to verify broker authorization" });
    }
  };
};

// Input validation schemas
const listingInputSchema = z.object({
  title: z.string().nullable().optional().transform(val => val === "" ? null : val),
  description: z.string().nullable().optional().transform(val => val === "" ? null : val),
  category_code: z.string().nullable().optional().transform(val => val === "" ? null : val),
  subcategory_code: z.string().nullable().optional().transform(val => val === "" ? null : val),
  quantity: z.coerce.number().positive().nullable().optional(),
  unit: z.string().nullable().optional().transform(val => val === "" ? null : val),
  minOrderQuantity: z.coerce.number().positive().nullable().optional(),
  location: z.string().nullable().optional().transform(val => val === "" ? null : val),
  supplyFrequency: z.string().nullable().optional().transform(val => val === "" ? null : val),
  pricePerUnit: z.coerce.number().positive().nullable().optional(),
  currency: z.string().nullable().optional().transform(val => val === "" ? null : val),
  paymentMethod: z.string().nullable().optional().transform(val => val === "" ? null : val),
  coaDocument: z.string().nullable().optional().transform(val => val === "" ? null : val),
  certificatesDocuments: z.array(z.string()).nullable().optional(),
  images: z.array(z.string()).nullable().optional(),
  isAnonymous: z.boolean().nullable().optional(),
  tradingName: z.string().nullable().optional().transform(val => val === "" ? null : val),
  // Legacy field mappings for backward compatibility
  moq: z.coerce.number().positive().nullable().optional(), 
  region: z.string().nullable().optional().transform(val => val === "" ? null : val),
  frequency: z.string().nullable().optional().transform(val => val === "" ? null : val),
  price_per_unit: z.coerce.number().positive().nullable().optional(),
  payment_method: z.string().nullable().optional().transform(val => val === "" ? null : val)
}); // Remove strict mode to allow additional fields

// Validation middleware factory
const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: any) => {
    try {
      console.log('Validating input:', JSON.stringify(req.body, null, 2));
      const result = schema.parse(req.body);
      req.body = result; // Replace with validated/transformed data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation failed:', error.errors);
        const errorResponse = {
          error: "Invalid input",
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
        console.log('Sending error response:', errorResponse);
        return res.status(400).json(errorResponse);
      }
      next(error);
    }
  };
};


// helper
function subcategoryValid(category?: string | null, sub?: string | null): boolean {
  if (!category || !sub) return true; // allow drafts / missing
  const list = TAXONOMY.map[category] || [];
  return list.includes(sub);
}

export async function registerRoutes(app: Express): Promise<void> {
  console.log("Starting route registration...");
  
  // Add /api/auth/me endpoint for explicit auth checking
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      if (req.isAuthenticated() && req.user) {
        const { password, ...userWithoutPassword } = req.user;
        
        // Get document status for this user (single source of truth)
        const docStatus = await storage.getUserDocumentStatus(userWithoutPassword.id);
        
        res.status(200).json({ 
          ok: true, 
          user: {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            role: userWithoutPassword.role,
            username: userWithoutPassword.username,
            fullName: userWithoutPassword.fullName
          },
          // Document status fields - single source of truth
          has_required_docs: docStatus.has_required_docs,
          doc_status: docStatus.doc_status,
          missing_doc_types: docStatus.missing_doc_types,
          total_docs: docStatus.total_docs
        });
      } else {
        res.status(401).json({ ok: false });
      }
    } catch (error) {
      console.error('[AUTH] Error getting user document status:', error);
      // Return safe fallback if document status fails
      if (req.isAuthenticated() && req.user) {
        const { password, ...userWithoutPassword } = req.user;
        res.status(200).json({ 
          ok: true, 
          user: {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
            role: userWithoutPassword.role,
            username: userWithoutPassword.username,
            fullName: userWithoutPassword.fullName
          },
          // Safe fallback document status
          has_required_docs: false,
          doc_status: "missing",
          missing_doc_types: ["license", "coa"],
          total_docs: 0
        });
      } else {
        res.status(401).json({ ok: false });
      }
    }
  });
  
  // Use imported taxonomy for fast access
  
  // Taxonomy endpoint moved to server/index.ts for faster access
  
  // Load expensive imports dynamically to avoid blocking startup
  const { setupAdminRoutes } = await import("./admin");
  const { requirePermission, requireOwnershipOrPermission, requireAdmin } = await import("./permissions");
  const { loggingService } = await import("./logging-service");
  const { externalDataService } = await import("./external-data");
  // DISABLED: Excel import functionality removed to prevent phantom data
  // const { excelImportRouter } = await import("./excel-import-api");
  
  console.log("Setting up authentication routes...");
  // Health check endpoints are now registered in index.ts for immediate availability

  // Password gate for site access
  app.post("/api/verify-access", async (req, res) => {
    const { password } = req.body;
    const correctPassword = process.env.SITE_ACCESS_PASSWORD || "preview2025";
    
    if (password === correctPassword) {
      // Set a cookie to remember authentication
      res.cookie("site_access", "granted", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "strict"
      });
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.get("/api/check-access", (req, res) => {
    const hasAccess = req.cookies?.site_access === "granted";
    res.status(200).json({ hasAccess });
  });

  // Set up authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);
  
  // Set up admin routes
  setupAdminRoutes(app);
  
  // Object storage endpoints for protected file uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user?.id?.toString();
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: "read" as any,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint for getting upload URL for object entities
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Server-side file upload endpoint to avoid CORS issues
  app.post("/api/objects/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    const userId = req.user?.id?.toString();
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      
      // Get upload URL for our server to use
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload file from our server to Google Cloud Storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: req.file.buffer,
        headers: {
          'Content-Type': req.file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to storage: ${uploadResponse.statusText}`);
      }

      // Set ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL.split('?')[0], // Remove query parameters
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.json({ 
        objectPath,
        objectURL: uploadURL.split('?')[0],
        fileName: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });
    } catch (error) {
      console.error("Server upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Keep the old endpoint for backward compatibility (now deprecated)
  app.post("/api/objects/upload-url", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Endpoint for setting ACL policy after upload
  app.put("/api/objects/set-acl", isAuthenticated, async (req, res) => {
    if (!req.body.objectURL) {
      return res.status(400).json({ error: "objectURL is required" });
    }

    const userId = req.user?.id?.toString();

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.objectURL,
        {
          owner: userId,
          visibility: "private", // Default to private for documents
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting object ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Combined dashboard overview endpoint for better performance
  app.get("/api/dashboard/overview", async (req, res) => {
    try {
      // Set longer cache headers for better performance
      res.set('Cache-Control', 'public, max-age=120'); // Cache for 2 minutes
      
      // Fetch all data in parallel for better performance
      const [listings, orders, featuredListings] = await Promise.all([
        storage.getListings(),
        storage.getOrders(),
        storage.getFeaturedListings(4)
      ]);
      
      // Filter for cannabis-related categories using the proper taxonomy
      const cannabisCategories = ['cannabis-raw', 'cannabis-extracts', 'cannabis-infused', 'cannabis-medical', 'cannabis-cpg', 'hemp-industrial'];
      const cannabisListings = listings.filter(l => l.category && cannabisCategories.includes(l.category) && l.status === 'active');
      
      const stats = {
        cannabisListings: cannabisListings.length,
        totalQuantity: cannabisListings.reduce((sum, l) => sum + (l.quantity || 0), 0),
        avgPrice: cannabisListings.length > 0 ? Math.round(cannabisListings.reduce((sum, l) => sum + (l.pricePerUnit || 0), 0) / cannabisListings.length) : 0,
        activeSuppliers: new Set(cannabisListings.map(l => l.sellerId)).size
      };
      
      const activityData = orders.slice(0, 10).map((order: any) => ({
        id: `ORD-${order.id}`,
        type: order.status === 'completed' ? 'purchase' : order.status === 'cancelled' ? 'cancelled' : 'contract',
        title: `Cannabis Order ${order.status === 'completed' ? 'Completed' : order.status === 'cancelled' ? 'Cancelled' : 'Processing'}`,
        subtitle: `ID: #ORD-${order.id}`,
        amount: `R${order.totalPrice || 0}`,
        quantity: `${order.quantity || 0}kg`,
        status: order.status,
        date: new Date(order.createdAt || Date.now())
      }));

      res.json({
        stats,
        activity: activityData,
        featuredListings,
        success: true
      });
    } catch (error) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch dashboard data',
        retry: true,
        success: false
      });
    }
  });

  // Keep original endpoints for backward compatibility but with longer cache
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      const listings = await storage.getListings();
      // Filter for cannabis-related categories using the proper taxonomy
      const cannabisCategories = ['cannabis-raw', 'cannabis-extracts', 'cannabis-infused', 'cannabis-medical', 'cannabis-cpg', 'hemp-industrial'];
      const cannabisListings = listings.filter(l => l.category && cannabisCategories.includes(l.category) && l.status === 'active');
      
      const stats = {
        cannabisListings: cannabisListings.length,
        totalQuantity: cannabisListings.reduce((sum, l) => sum + (l.quantity || 0), 0),
        avgPrice: cannabisListings.length > 0 ? Math.round(cannabisListings.reduce((sum, l) => sum + (l.pricePerUnit || 0), 0) / cannabisListings.length) : 0,
        activeSuppliers: new Set(cannabisListings.map(l => l.sellerId)).size
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics', retry: true });
    }
  });

  app.get("/api/dashboard/activity", async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=180'); // Cache for 3 minutes
      const orders = await storage.getOrders();
      const activityData = orders.slice(0, 10).map((order: any) => ({
        id: `ORD-${order.id}`,
        type: order.status === 'completed' ? 'purchase' : order.status === 'cancelled' ? 'cancelled' : 'contract',
        title: `Cannabis Order ${order.status === 'completed' ? 'Completed' : order.status === 'cancelled' ? 'Cancelled' : 'Processing'}`,
        subtitle: `ID: #ORD-${order.id}`,
        amount: `R${order.totalPrice || 0}`,
        quantity: `${order.quantity || 0}kg`,
        status: order.status,
        date: new Date(order.createdAt || Date.now())
      }));
      
      res.json(activityData);
    } catch (error) {
      console.error('Dashboard activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity data', retry: true });
    }
  });
  
  // DISABLED: Excel import API routes removed to prevent phantom data
  // app.use(excelImportRouter);
  
  // Automatic seeding disabled for clean testing environment
  // Users requested to remove all placeholder/mock data for real data testing
  // To re-enable seeding, uncomment the code below:
  /*
  if (process.env.NODE_ENV === 'development') {
    setImmediate(async () => {
      try {
        console.log("Starting database seeding...");
        const { seedDefaultUsers } = await import("./seed");
        await seedDefaultUsers();
        console.log('Database seeding completed');
      } catch (error) {
        console.error('Database seeding failed:', error);
      }
    });
  }
  */
  
  // User Profile Routes
  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }
      
      // Remove sensitive information
      const { password, ...userInfo } = user;
      res.status(200).json(userInfo);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.patch("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to update their own profile, unless admin
      if (req.user && (userId !== req.user.id && req.user.role !== 'admin')) {
        return res.status(403).send("Unauthorized to update this profile");
      }
      
      // Never allow updating password through this endpoint
      const { password, ...updateData } = req.body;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).send("User not found");
      }
      
      // Remove sensitive information from response
      const { password: _, ...userInfo } = updatedUser;
      res.status(200).json(userInfo);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  // Note: Browse listings endpoint moved to separate router (server/routes/listings-browse.ts)
  
  app.get("/api/listings/featured", async (req, res) => {
    try {
      // Cache for 10 minutes
      res.set('Cache-Control', 'public, max-age=600');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const featuredListings = await storage.getFeaturedListings(limit);
      res.status(200).json(featuredListings);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.get("/api/listings/geo", async (req, res) => {
    try {
      const { location, radius, category } = req.query;
      
      // Get all listings first
      const allListings = await storage.getListings();
      
      // Filter listings with coordinates
      const geoListings = allListings.filter(listing => 
        listing.latitude !== null && 
        listing.longitude !== null
      );
      
      // If a location is specified, filter by distance
      if (location && radius) {
        // For now, we're returning all geo-listings
        // In a real app, you would use a geocoding service to get the coordinates from the location string
        // and then calculate the distance between each listing and the location
      }
      
      // If a category is specified, filter by category
      let filteredListings = geoListings;
      if (category) {
        filteredListings = geoListings.filter(listing => 
          listing.category === category
        );
      }
      
      res.status(200).json(filteredListings);
    } catch (error) {
      console.error('Error fetching geo listings:', error);
      res.status(500).json({ message: 'Failed to fetch geo listings' });
    }
  });
  
  app.get("/api/listings/:id", isAuthenticated, async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getListingById(listingId);
      
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      // Visibility rules: 
      // - Active listings can be viewed by anyone (buyers can see seller listings)
      // - Draft listings can only be viewed by owner or admin
      const isOwner = req.user!.id === listing.sellerId;
      const isAdmin = req.user!.role === 'admin';
      const isActive = listing.status === 'active';
      
      if (!isActive && !isOwner && !isAdmin) {
        return res.status(403).json({ 
          error: "Access denied", 
          message: "This listing is not publicly available" 
        });
      }
      
      // Add category labels for frontend display
      const category = TAXONOMY.categories.find(cat => cat.code === listing.categoryCode);
      const enrichedListing = {
        ...listing,
        category_label: category?.label || listing.categoryCode || listing.category,
        category_code: listing.categoryCode || listing.category
      };
      
      // Add cache headers for active listings
      if (isActive) {
        res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      }
      
      res.status(200).json(enrichedListing);
    } catch (error) {
      console.error('Error fetching listing details:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Mandate API Endpoints
  
  // POST /api/mandates - Invite broker (sellers only)
  app.post("/api/mandates", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only sellers and admins can invite brokers
      if (!['seller', 'admin'].includes(user.role)) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only sellers can invite brokers"
        });
      }
      
      const { brokerId, sellerOrgId, scopeCommodities, scopeRegions, exclusiveMandate, commissionType, commissionRate } = req.body;
      
      // Validate inputs
      if (!brokerId || !sellerOrgId) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "brokerId and sellerOrgId are required"
        });
      }
      
      // Check if broker exists and has broker role
      const broker = await storage.getUser(brokerId);
      if (!broker || broker.role !== 'broker') {
        return res.status(400).json({
          error: "Invalid broker",
          message: "User must exist and have broker role"
        });
      }
      
      // Check if organization exists
      const organization = await storage.getOrganizationById(sellerOrgId);
      if (!organization) {
        return res.status(400).json({
          error: "Invalid organization",
          message: "Organization not found"
        });
      }
      
      // Check if user has admin access to organization
      if (user.role !== 'admin' && organization.adminUserId !== user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only invite brokers for organizations you admin"
        });
      }
      
      // Create the mandate
      const mandate = await storage.createMandate({
        brokerId,
        sellerOrgId,
        scopeCommodities: scopeCommodities || [],
        scopeRegions: scopeRegions || [],
        exclusive: exclusiveMandate || false,
        commissionType: commissionType || 'percent',
        commissionRate: commissionRate || 5.0,
        // status defaults to 'pending'
      });
      
      // Log the mandate invitation event
      await storage.createEvent({
        eventType: 'mandate_invited',
        userId: user.id,
        mandateId: mandate.id,
        metadata: {
          brokerId,
          sellerOrgId,
          invitedBy: user.id
        }
      });
      
      res.json({
        success: true,
        mandate
      });
      
    } catch (error) {
      console.error('Error creating mandate:', error);
      res.status(500).json({ error: "Failed to create mandate" });
    }
  });
  
  // GET /api/mandates - List mandates (filtered by role)
  app.get("/api/mandates", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { status } = req.query;
      
      let mandates = [];
      
      if (user.role === 'broker') {
        // Brokers see mandates where they are the broker
        mandates = await storage.getMandatesByBrokerId(user.id);
      } else if (user.role === 'seller') {
        // Sellers see mandates for their organizations
        const userOrgs = await storage.getOrganizationsByAdminUserId(user.id);
        if (userOrgs.length > 0) {
          const allMandates = await storage.getMandates();
          mandates = allMandates.filter(mandate => 
            userOrgs.some(org => org.id === mandate.sellerOrgId)
          );
        }
      } else if (user.role === 'admin') {
        // Admins see all mandates
        mandates = await storage.getMandates();
      }
      
      // Filter by status if provided
      if (status) {
        mandates = mandates.filter(mandate => mandate.status === status);
      }
      
      res.json(mandates);
      
    } catch (error) {
      console.error('Error fetching mandates:', error);
      res.status(500).json({ error: "Failed to fetch mandates" });
    }
  });
  
  // PUT /api/mandates/:id/accept - Accept mandate (brokers only)
  app.put("/api/mandates/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const mandateId = parseInt(req.params.id);
      
      // Only brokers can accept mandates
      if (user.role !== 'broker') {
        return res.status(403).json({
          error: "Access denied",
          message: "Only brokers can accept mandates"
        });
      }
      
      const mandate = await storage.getMandateById(mandateId);
      if (!mandate) {
        return res.status(404).json({ error: "Mandate not found" });
      }
      
      // Check if this mandate is for this broker
      if (mandate.brokerId !== user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only accept mandates assigned to you"
        });
      }
      
      // Check if mandate is in pending status
      if (mandate.status !== 'pending') {
        return res.status(400).json({
          error: "Invalid status",
          message: "Only pending mandates can be accepted"
        });
      }
      
      // Update mandate status to active
      const updatedMandate = await storage.updateMandate(mandateId, {
        status: 'active',
        activatedAt: new Date()
      });
      
      // Log the acceptance event
      await storage.createEvent({
        eventType: 'mandate_accepted',
        userId: user.id,
        mandateId,
        metadata: {
          acceptedBy: user.id,
          acceptedAt: new Date()
        }
      });
      
      res.json({
        success: true,
        mandate: updatedMandate
      });
      
    } catch (error) {
      console.error('Error accepting mandate:', error);
      res.status(500).json({ error: "Failed to accept mandate" });
    }
  });
  
  // PUT /api/mandates/:id/revoke - Revoke mandate (sellers/admins only)
  app.put("/api/mandates/:id/revoke", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const mandateId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const mandate = await storage.getMandateById(mandateId);
      if (!mandate) {
        return res.status(404).json({ error: "Mandate not found" });
      }
      
      // Check permissions: sellers can revoke their org's mandates, admins can revoke any
      if (user.role === 'seller') {
        const organization = await storage.getOrganizationById(mandate.sellerOrgId);
        if (!organization || organization.adminUserId !== user.id) {
          return res.status(403).json({
            error: "Access denied",
            message: "You can only revoke mandates for organizations you admin"
          });
        }
      } else if (user.role !== 'admin') {
        return res.status(403).json({
          error: "Access denied",
          message: "Only sellers and admins can revoke mandates"
        });
      }
      
      // Check if mandate can be revoked
      if (!['pending', 'active'].includes(mandate.status)) {
        return res.status(400).json({
          error: "Invalid status",
          message: "Only pending or active mandates can be revoked"
        });
      }
      
      // Revoke the mandate
      const success = await storage.revokeMandate(mandateId, user.id, reason);
      
      if (success) {
        // Log the revocation event
        await storage.createEvent({
          eventType: 'mandate_revoked',
          userId: user.id,
          mandateId,
          metadata: {
            revokedBy: user.id,
            reason: reason || 'No reason provided',
            revokedAt: new Date()
          }
        });
        
        res.json({
          success: true,
          message: "Mandate revoked successfully"
        });
      } else {
        res.status(500).json({ error: "Failed to revoke mandate" });
      }
      
    } catch (error) {
      console.error('Error revoking mandate:', error);
      res.status(500).json({ error: "Failed to revoke mandate" });
    }
  });
  
  // GET /api/mandates/:id - Get specific mandate details
  app.get("/api/mandates/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const mandateId = parseInt(req.params.id);
      
      const mandate = await storage.getMandateById(mandateId);
      if (!mandate) {
        return res.status(404).json({ error: "Mandate not found" });
      }
      
      // Check access permissions
      let hasAccess = false;
      
      if (user.role === 'admin') {
        hasAccess = true;
      } else if (user.role === 'broker' && mandate.brokerId === user.id) {
        hasAccess = true;
      } else if (user.role === 'seller') {
        const organization = await storage.getOrganizationById(mandate.sellerOrgId);
        if (organization && organization.adminUserId === user.id) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have permission to view this mandate"
        });
      }
      
      res.json(mandate);
      
    } catch (error) {
      console.error('Error fetching mandate:', error);
      res.status(500).json({ error: "Failed to fetch mandate" });
    }
  });
  
  // Reporting API Endpoints
  
  // GET /api/reports/mandates - Mandate performance reports (brokers/sellers/admins)
  app.get("/api/reports/mandates", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { timeframe = '30d' } = req.query;
      
      let mandates: any[] = [];
      
      // Role-based access control
      if (user.role === 'broker') {
        mandates = await storage.getMandatesByBrokerId(user.id);
      } else if (user.role === 'seller') {
        const userOrgs = await storage.getOrganizationsByAdminUserId(user.id);
        if (userOrgs.length > 0) {
          const allMandates = await storage.getMandates();
          mandates = allMandates.filter(mandate => 
            userOrgs.some(org => org.id === mandate.sellerOrgId)
          );
        }
      } else if (user.role === 'admin') {
        mandates = await storage.getMandates();
      } else {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Calculate timeframe
      const now = new Date();
      const timeframeStart = new Date();
      switch (timeframe) {
        case '7d':
          timeframeStart.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeframeStart.setDate(now.getDate() - 30);
          break;
        case '90d':
          timeframeStart.setDate(now.getDate() - 90);
          break;
        case '1y':
          timeframeStart.setFullYear(now.getFullYear() - 1);
          break;
        default:
          timeframeStart.setDate(now.getDate() - 30);
      }
      
      // Filter mandates by timeframe
      const filteredMandates = mandates.filter(mandate => 
        new Date(mandate.createdAt!) >= timeframeStart
      );
      
      // Calculate metrics
      const metrics = {
        totalMandates: filteredMandates.length,
        activeMandates: filteredMandates.filter(m => m.status === 'active').length,
        pendingMandates: filteredMandates.filter(m => m.status === 'pending').length,
        revokedMandates: filteredMandates.filter(m => m.status === 'revoked').length,
        avgCommissionRate: filteredMandates.length > 0 
          ? Math.round((filteredMandates.reduce((sum, m) => sum + (m.commissionRate || 0), 0) / filteredMandates.length) * 100) / 100
          : 0,
        mandatesByStatus: {
          active: filteredMandates.filter(m => m.status === 'active').length,
          pending: filteredMandates.filter(m => m.status === 'pending').length,
          revoked: filteredMandates.filter(m => m.status === 'revoked').length,
          expired: filteredMandates.filter(m => m.status === 'expired').length,
        }
      };
      
      res.json({
        metrics,
        mandates: filteredMandates,
        timeframe
      });
      
    } catch (error) {
      console.error('Error generating mandate report:', error);
      res.status(500).json({ error: "Failed to generate mandate report" });
    }
  });
  
  // GET /api/reports/commissions - Commission tracking reports (brokers/sellers/admins)
  app.get("/api/reports/commissions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { timeframe = '30d' } = req.query;
      
      let dealAttributions: any[] = [];
      
      // Role-based access control
      if (user.role === 'broker') {
        dealAttributions = await storage.getDealAttributionsByBrokerId(user.id);
      } else if (user.role === 'seller') {
        const userOrgs = await storage.getOrganizationsByAdminUserId(user.id);
        if (userOrgs.length > 0) {
          const allAttributions = await Promise.all(
            userOrgs.map(org => storage.getDealAttributionsBySellerOrgId(org.id))
          );
          dealAttributions = allAttributions.flat();
        }
      } else if (user.role === 'admin') {
        dealAttributions = await storage.getDealAttributions();
      } else {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Calculate timeframe
      const now = new Date();
      const timeframeStart = new Date();
      switch (timeframe) {
        case '7d':
          timeframeStart.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeframeStart.setDate(now.getDate() - 30);
          break;
        case '90d':
          timeframeStart.setDate(now.getDate() - 90);
          break;
        case '1y':
          timeframeStart.setFullYear(now.getFullYear() - 1);
          break;
        default:
          timeframeStart.setDate(now.getDate() - 30);
      }
      
      // Filter attributions by timeframe
      const filteredAttributions = dealAttributions.filter(attr => 
        new Date(attr.createdAt!) >= timeframeStart
      );
      
      // Calculate commission metrics
      const totalCommissionEarned = filteredAttributions.reduce((sum, attr) => 
        sum + (attr.calculatedCommission || 0), 0
      );
      
      const totalGMV = filteredAttributions.reduce((sum, attr) => 
        sum + (attr.gmv || 0), 0
      );
      
      const avgCommissionPerDeal = filteredAttributions.length > 0 
        ? totalCommissionEarned / filteredAttributions.length 
        : 0;
      
      const metrics = {
        totalDeals: filteredAttributions.length,
        totalCommissionEarned: Math.round(totalCommissionEarned * 100) / 100,
        totalGMV: Math.round(totalGMV * 100) / 100,
        avgCommissionPerDeal: Math.round(avgCommissionPerDeal * 100) / 100,
        commissionByType: {
          percent: filteredAttributions.filter(attr => attr.commissionType === 'percent').length,
          flat: filteredAttributions.filter(attr => attr.commissionType === 'flat').length,
        }
      };
      
      res.json({
        metrics,
        dealAttributions: filteredAttributions,
        timeframe
      });
      
    } catch (error) {
      console.error('Error generating commission report:', error);
      res.status(500).json({ error: "Failed to generate commission report" });
    }
  });
  
  // GET /api/reports/broker-performance - Detailed broker performance metrics (admins)
  app.get("/api/reports/broker-performance", requireRole('admin'), async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      
      // Get all brokers
      const allUsers = await storage.getUsers();
      const brokers = allUsers.filter((user: any) => user.role === 'broker');
      
      // Calculate timeframe
      const now = new Date();
      const timeframeStart = new Date();
      switch (timeframe) {
        case '7d':
          timeframeStart.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeframeStart.setDate(now.getDate() - 30);
          break;
        case '90d':
          timeframeStart.setDate(now.getDate() - 90);
          break;
        case '1y':
          timeframeStart.setFullYear(now.getFullYear() - 1);
          break;
        default:
          timeframeStart.setDate(now.getDate() - 30);
      }
      
      // Calculate performance for each broker
      const brokerPerformance = await Promise.all(
        brokers.map(async (broker) => {
          const mandates = await storage.getMandatesByBrokerId(broker.id);
          const dealAttributions = await storage.getDealAttributionsByBrokerId(broker.id);
          
          const filteredMandates = mandates.filter(mandate => 
            new Date(mandate.createdAt!) >= timeframeStart
          );
          
          const filteredAttributions = dealAttributions.filter(attr => 
            new Date(attr.createdAt!) >= timeframeStart
          );
          
          const totalCommission = filteredAttributions.reduce((sum, attr) => 
            sum + (attr.calculatedCommission || 0), 0
          );
          
          const totalGMV = filteredAttributions.reduce((sum, attr) => 
            sum + (attr.gmv || 0), 0
          );
          
          return {
            brokerId: broker.id,
            brokerName: broker.fullName,
            brokerEmail: broker.email,
            activeMandates: filteredMandates.filter(m => m.status === 'active').length,
            totalMandates: filteredMandates.length,
            completedDeals: filteredAttributions.length,
            totalCommissionEarned: Math.round(totalCommission * 100) / 100,
            totalGMVGenerated: Math.round(totalGMV * 100) / 100,
            avgDealSize: filteredAttributions.length > 0 ? Math.round((totalGMV / filteredAttributions.length) * 100) / 100 : 0
          };
        })
      );
      
      // Sort by total commission earned
      brokerPerformance.sort((a: any, b: any) => b.totalCommissionEarned - a.totalCommissionEarned);
      
      res.json({
        brokerPerformance,
        timeframe,
        summary: {
          totalBrokers: brokers.length,
          activeBrokers: brokerPerformance.filter((bp: any) => bp.activeMandates > 0).length,
          totalCommissions: Math.round(brokerPerformance.reduce((sum: any, bp: any) => sum + bp.totalCommissionEarned, 0) * 100) / 100,
          totalGMV: Math.round(brokerPerformance.reduce((sum: any, bp: any) => sum + bp.totalGMVGenerated, 0) * 100) / 100
        }
      });
      
    } catch (error) {
      console.error('Error generating broker performance report:', error);
      res.status(500).json({ error: "Failed to generate broker performance report" });
    }
  });

  app.post("/api/listings", requireSellerOrBroker, checkBrokerMandate('create_listings'), validateInput(listingInputSchema), async (req, res) => {
    try {
      const user = req.user!;
      const isBroker = user.role === 'broker';
      const sellerId = isBroker ? req.body.sellerId || req.body.seller_id : user.id;
      
      console.log(`[LISTING] User ${user.id} (${user.role}) creating listing${isBroker ? ` for seller ${sellerId}` : ''}`);
      
      const { category_code, subcategory_code } = normaliseCategoryPayload(req.body);

      // For drafts: allow nulls; if both present but invalid combo, return 400
      if (category_code && subcategory_code && !subcategoryBelongs(category_code, subcategory_code)) {
        return res.status(400).json({ ok: false, error: `Sub-category is not valid for selected Category` });
      }

      // Calculate total price from pricePerUnit and quantity
      const totalPrice = (req.body.pricePerUnit || 0) * (req.body.quantity || 0);
      
      // Create draft-friendly schema for backend validation
      const draftListingSchema = insertListingSchema.extend({
        // Override strict validations for drafts
        pricePerUnit: z.number().optional(), // Remove .positive() requirement
        price: z.number().optional(), // Remove .positive() requirement
        subcategory: z.string().nullable().optional(), // Allow null
        quantity: z.number().optional(), // Remove .positive() requirement
        minOrderQuantity: z.number().optional(), // Remove .positive() requirement
      });

      const validation = draftListingSchema.safeParse({
        ...req.body,
        categoryCode: category_code,
        subcategoryCode: subcategory_code,
        category: category_code, // Legacy compatibility
        subcategory: subcategory_code, // Legacy compatibility
        price: totalPrice || undefined, // Use undefined instead of 0 for drafts
        pricePerUnit: req.body.pricePerUnit || undefined, // Use undefined instead of 0
        quantity: req.body.quantity || undefined, // Use undefined instead of 0
        minOrderQuantity: req.body.minOrderQuantity || undefined, // Use undefined instead of 0
        socialImpactScore: req.body.socialImpactScore || 0,
        socialImpactCategory: req.body.socialImpactCategory || "",
        sellerId: sellerId, // Use determined sellerId (actual seller)
        // New broker attribution fields
        createdByUserId: user.id, // Who actually created the listing
        brokerUserId: isBroker ? user.id : null, // If created by broker
        createdVia: isBroker ? 'broker' : 'seller', // How it was created
        // Snapshot commission terms from mandate
        commissionTypeSnapshot: isBroker && req.brokerMandate ? req.brokerMandate.commissionType : null,
        commissionRateSnapshot: isBroker && req.brokerMandate ? req.brokerMandate.commissionRate : null,
      });
      
      if (!validation.success) {
        console.error('Listing validation failed:', validation.error.format());
        return res.status(400).json({ errors: validation.error.format() });
      }
      
      const listingData = validation.data;
      const newListing = await storage.createListing(listingData);
      
      // Log broker action for audit trail
      if (isBroker && req.brokerMandate) {
        console.log(`[BROKER-ACTION] Broker ${user.id} created listing ${newListing.id} for seller ${sellerId} under mandate ${req.brokerMandate.id}`);
      }
      
      console.log(`[LISTING] User ${user.id} successfully created listing ${newListing.id} as draft`);
      
      return res.status(200).json({ ok: true, id: newListing.id, status: "draft" });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ ok: false, error: "Failed to save draft" });
    }
  });
  
  app.patch("/api/listings/:id", requireSellerOrBroker, checkBrokerMandate('edit_listings'), validateInput(listingInputSchema), async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getListingById(listingId);
      
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      // Check if user is the seller or admin (ownership-based access)
      if (listing.sellerId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ 
          error: "Access denied",
          message: "You can only modify your own listings"
        });
      }
      
      const { category_code, subcategory_code } = normaliseCategoryPayload(req.body);
      
      if (category_code && subcategory_code && !subcategoryBelongs(category_code, subcategory_code)) {
        return res.status(400).json({ ok: false, error: `Sub-category is not valid for selected Category` });
      }
      
      const updatedListing = await storage.updateListing(listingId, {
        ...req.body,
        categoryCode: category_code,
        subcategoryCode: subcategory_code,
        category: category_code, // Legacy compatibility
        subcategory: subcategory_code, // Legacy compatibility
      });
      
      return res.json({ ok: true });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ ok: false, error: "Update failed" });
    }
  });
  
  app.delete("/api/listings/:id", isAuthenticated, async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getListingById(listingId);
      
      if (!listing) {
        return res.status(404).send("Listing not found");
      }
      
      // Check if user is the seller or admin
      if (listing.sellerId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).send("Unauthorized to delete this listing");
      }
      
      const deleted = await storage.deleteListing(listingId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).send("Failed to delete listing");
      }
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  // Publish listing endpoint with validation checklist
  app.post("/api/listings/:id/publish", requireSeller, async (req, res) => {
    try {
      console.log(`[LISTING] User ${req.user!.id} (${req.user!.role}) attempting to publish listing ${req.params.id}`);
      const id = parseInt(req.params.id);
      const listing = await storage.getListingById(id);
      
      if (!listing) {
        return res.status(404).json({ ok: false, error: "Listing not found" });
      }
      
      // Check ownership
      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ ok: false, error: "Not authorized" });
      }
      
      // Normalize and validate category/subcategory for publishing (strict)
      const { category_code, subcategory_code } = normaliseCategoryPayload({
        category_code: listing.categoryCode,
        subcategory_code: listing.subcategoryCode,
        category: listing.category,
        subcategory: listing.subcategory
      });
      
      // For publishing: require valid category and subcategory combination
      if (!category_code || !subcategory_code || !subcategoryBelongs(category_code, subcategory_code)) {
        return res.status(400).json({ 
          ok: false, 
          error: "Sub-category is not valid for selected Category" 
        });
      }
      
      // Count documents for checklist (mock counts for now - implement document counting later)
      const photoCount = listing.images?.length || 0;
      const coaCount = listing.coaDocument ? 1 : 0;
      const licenceOrCertCount = listing.certificatesDocuments?.length || 0;
      
      const issues = computePublishBlockingIssues({
        category: listing.category,
        subcategory: listing.subcategory,
        supplyFrequency: listing.supplyFrequency,
        paymentMethod: listing.paymentMethod,
        photoCount,
        coaCount,
        licenceOrCertCount
      });
      
      if (issues.length > 0) {
        return res.status(400).json({ 
          ok: false, 
          error: "Cannot publish yet", 
          checklist: issues 
        });
      }
      
      // Mark as published (active status)
      await storage.updateListing(id, { status: "active" });
      
      res.status(200).json({ ok: true, status: "live" });
    } catch (error: any) {
      console.error('Publish listing error:', error);
      res.status(500).json({ ok: false, error: "Publish failed" });
    }
  });

  // Order Routes
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      let orders;
      
      // Return only orders related to the current user, unless admin
      if (req.user!.role === 'admin') {
        orders = await storage.getOrders();
      } else if (req.user!.role === 'seller') {
        orders = await storage.getOrdersBySellerId(req.user!.id);
      } else {
        orders = await storage.getOrdersByBuyerId(req.user!.id);
      }
      
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).send("Order not found");
      }
      
      // Check if user is involved in the order, or is admin
      if (
        order.buyerId !== req.user!.id && 
        order.sellerId !== req.user!.id && 
        req.user!.role !== 'admin'
      ) {
        return res.status(403).send("Unauthorized to view this order");
      }
      
      res.status(200).json(order);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const validation = insertOrderSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.format() });
      }
      
      const orderData = validation.data;
      orderData.buyerId = req.user!.id;
      
      // Verify the listing exists and is active
      const listing = await storage.getListingById(orderData.listingId);
      
      if (!listing) {
        return res.status(404).send("Listing not found");
      }
      
      if (listing.status !== 'active') {
        return res.status(400).send("Listing is not available for purchase");
      }
      
      // Set the seller ID from the listing
      orderData.sellerId = listing.sellerId;
      
      // Calculate total price based on quantity and listing price
      orderData.totalPrice = orderData.quantity * listing.pricePerUnit;
      
      const newOrder = await storage.createOrder(orderData);
      res.status(201).json(newOrder);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.patch("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).send("Order not found");
      }
      
      // Only seller or admin can update order status
      if (order.sellerId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).send("Unauthorized to update this order");
      }
      
      // Check if order is being marked as completed and needs deal attribution
      const isBeingCompleted = req.body.status === 'completed' && order.status !== 'completed';
      
      const updatedOrder = await storage.updateOrder(orderId, req.body);
      
      // Handle deal attribution for completed deals with broker involvement
      if (isBeingCompleted && updatedOrder) {
        try {
          // Get the listing to check for broker involvement
          const listing = await storage.getListingById(order.listingId);
          
          if (listing && listing.brokerUserId && listing.commissionTypeSnapshot && listing.commissionRateSnapshot) {
            console.log(`[DEAL-ATTRIBUTION] Creating attribution for completed order ${orderId} with broker ${listing.brokerUserId}`);
            
            // Calculate commission
            const gmv = updatedOrder.totalPrice || 0;
            let calculatedCommission = 0;
            
            if (listing.commissionTypeSnapshot === 'percent') {
              calculatedCommission = (gmv * (listing.commissionRateSnapshot || 0)) / 100;
            } else if (listing.commissionTypeSnapshot === 'flat') {
              calculatedCommission = listing.commissionRateSnapshot || 0;
            }
            
            // Create deal attribution record
            const dealAttribution = await storage.createDealAttribution({
              listingId: listing.id,
              brokerUserId: listing.brokerUserId,
              sellerOrgId: listing.sellerOrgId || 1, // Default to organization 1 if not set
              buyerUserId: order.buyerId,
              commissionType: listing.commissionTypeSnapshot,
              commissionRate: listing.commissionRateSnapshot,
              calculatedCommission,
              gmv,
              orderId: orderId
            });
            
            // Log the deal completion event
            await storage.createEvent({
              eventType: 'deal_completed',
              userId: req.user!.id,
              listingId: listing.id,
              dealAttributionId: dealAttribution.id,
              metadata: {
                orderId,
                brokerUserId: listing.brokerUserId,
                gmv,
                calculatedCommission,
                commissionType: listing.commissionTypeSnapshot,
                commissionRate: listing.commissionRateSnapshot,
                completedBy: req.user!.id
              }
            });
            
            console.log(`[DEAL-ATTRIBUTION] Created attribution ${dealAttribution.id} for broker ${listing.brokerUserId} with commission ${calculatedCommission}`);
          }
        } catch (attributionError) {
          console.error('Error creating deal attribution:', attributionError);
          // Don't fail the order update, just log the error
        }
      }
      
      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).send("Server error");
    }
  });
  
  // Message Routes
  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesByUserId(req.user!.id);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.get("/api/messages/:userId", isAuthenticated, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const conversation = await storage.getConversation(req.user!.id, otherUserId);
      res.status(200).json(conversation);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const { receiverId, content, relatedListingId, relatedOrderId } = req.body;
      
      if (!receiverId || !content) {
        return res.status(400).send("Receiver ID and content are required");
      }
      
      const newMessage = await storage.createMessage({
        senderId: req.user!.id,
        receiverId,
        content,
        relatedListingId,
        relatedOrderId,
        status: 'unread'
      });
      
      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.patch("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      // Get messages for this user
      const messages = await storage.getMessagesByUserId(req.user?.id || 0);
      // Find the specific message
      const message = messages.find(msg => msg.id === messageId);
      
      if (!message) {
        return res.status(404).send("Message not found");
      }
      
      // Only the recipient can mark a message as read
      if (message.receiverId !== req.user?.id) {
        return res.status(403).send("Unauthorized to update this message");
      }
      
      const success = await storage.markMessageAsRead(messageId);
      
      if (success) {
        res.status(200).json({ status: 'read' });
      } else {
        res.status(500).send("Failed to mark message as read");
      }
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  // Cannabis Products Routes
  app.get("/api/cannabis-products", async (req, res) => {
    try {
      const cannabisProducts = await storage.getCannabisProducts();
      res.status(200).json(cannabisProducts);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.get("/api/cannabis-products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getCannabisProductById(productId);
      
      if (!product) {
        return res.status(404).send("Cannabis product not found");
      }
      
      res.status(200).json(product);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.post("/api/cannabis-products", isAuthenticated, async (req, res) => {
    try {
      const validation = insertCannabisProductSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.format() });
      }
      
      const productData = validation.data;
      productData.ownerId = req.user!.id;
      
      const newProduct = await storage.createCannabisProduct(productData);
      res.status(201).json(newProduct);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.patch("/api/cannabis-products/:id", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getCannabisProductById(productId);
      
      if (!product) {
        return res.status(404).send("Cannabis product not found");
      }
      
      // Check if user is the owner or admin
      if (product.ownerId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).send("Unauthorized to update this cannabis product");
      }
      
      const updatedProduct = await storage.updateCannabisProduct(productId, req.body);
      res.status(200).json(updatedProduct);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  // Search & Matching Routes - Enhanced with crawler integration
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query) {
        return res.status(400).send("Search query is required");
      }
      
      // Search in both listings and cannabis products
      const queryLower = query.toLowerCase();
      const listings = await storage.getListings();
      
      // Basic text search implementation (can be enhanced later)
      const results = listings.filter(listing => {
        const titleMatch = listing.title?.toLowerCase().includes(queryLower);
        const descMatch = listing.description?.toLowerCase().includes(queryLower);
        const categoryMatch = listing.category?.toLowerCase().includes(queryLower);
        const locationMatch = listing.location?.toLowerCase().includes(queryLower);
        
        return titleMatch || descMatch || categoryMatch || locationMatch;
      });
      
      res.status(200).json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).send("Server error during search");
    }
  });

  // Enhanced search with optional signals support
  app.post("/api/search", async (req, res) => {
    try {
      const {
        query = '',
        category = '',
        region = '',
        priceMin = null,
        priceMax = null,
        useListings = true,
        useSignals = false,
        connectors = {},
        options = {}
      } = req.body;

      // Import feature flags  
      const flagsModule = await import('../config/flags.js');
      const flags = flagsModule.default || flagsModule;
      
      // Server-side cannabis/hemp allow-list for security
      const allowedCommodities = new Set(['cannabis', 'hemp', 'cbd']);
      const normalizedCategory = (category || '').trim().toLowerCase();

      // Enforce category allow-list - if blank, default to cannabis/hemp  
      const restrictTo = normalizedCategory && allowedCommodities.has(normalizedCategory)
        ? [normalizedCategory] 
        : ['cannabis', 'hemp'];
      
      // Build connectors object explicitly
      let searchConnectors: any = {};
      if (useListings !== false) {
        searchConnectors.internalDB = '';
      }
      if (flags.ENABLE_SIGNALS && useSignals === true) {
        searchConnectors.internalSignals = '';
      }
      
      // If connectors explicitly provided, use those instead
      if (Object.keys(connectors).length > 0) {
        searchConnectors = connectors;
      }
      
      // Ensure we have at least one connector or return error
      if (Object.keys(searchConnectors).length === 0) {
        return res.status(400).json({ 
          ok: false, 
          error: 'No connectors specified. For this demo, pass { "connectors": { "internalDB": "" } }.' 
        });
      }
      
      // Use crawler service to get results from configured connectors
      const crawlerModule = await import('../services/crawlerService.js');
      const { fetchFromConnectors } = crawlerModule;
      const crawlerResults = await fetchFromConnectors({
        connectors: searchConnectors,
        criteria: { 
          query, 
          category, 
          region, 
          priceMin, 
          priceMax
        },
        options: { noCache: true, timeoutMs: 3000, ...options }
      });
      
      // Extract results from crawler response
      let allResults = crawlerResults.results || [];
      
      // Apply server-side filters after crawler returns
      let filteredResults = allResults.filter((item: any) => {
        // Server-side commodity allow-list enforcement
        const category = (item.category || item.commodityType || '').toLowerCase();
        
        // Hard filter to allowed commodities only
        const hasAllowedCommodity = Array.from(allowedCommodities).some(allowed => 
          category.includes(allowed)
        );
        if (!hasAllowedCommodity) {
          return false;
        }
        
        // Region filter
        if (region) {
          const itemRegion = item.location || item.region || '';
          if (!itemRegion.toLowerCase().includes(region.toLowerCase())) {
            return false;
          }
        }
        
        // Price range filters
        if (priceMin != null && item.pricePerUnit && item.pricePerUnit < Number(priceMin)) {
          return false;
        }
        
        if (priceMax != null && item.pricePerUnit && item.pricePerUnit > Number(priceMax)) {
          return false;
        }
        
        return true;
      });
      
      // Apply ranking service
      const rankingModule = await import('../services/rankingService.js');
      const { rankItems } = rankingModule;
      const rankedResults = await rankItems(filteredResults, { query, category, region });

      const meta = crawlerResults.meta || {
        successes: [{ name: 'internalDB', count: rankedResults.length, cached: false }],
        failures: []
      };

      console.log(`Search completed: category="${category}", allowedCheck passed, results=${rankedResults.length}`);
      res.json({ ok: true, meta, count: rankedResults.length, results: rankedResults });
    } catch (err: any) {
      console.error('Enhanced search error:', err);
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  });

  // Search suggestions endpoint for smart search
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const query = (req.query.q as string || '').trim().toLowerCase();
      if (!query || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      // Get listings for generating suggestions
      const listings = await storage.getListings({ status: 'active' });
      
      const suggestions: any[] = [];
      const addedTexts = new Set<string>();

      // Category suggestions
      const categories = new Set<string>();
      listings.forEach(listing => {
        if (listing.category && listing.category.toLowerCase().includes(query)) {
          categories.add(listing.category.toLowerCase());
        }
      });
      
      categories.forEach(category => {
        const count = listings.filter(l => l.category?.toLowerCase() === category).length;
        if (!addedTexts.has(category)) {
          suggestions.push({
            id: `category-${category}`,
            text: category,
            type: 'category',
            metadata: { category, count }
          });
          addedTexts.add(category);
        }
      });

      // Location suggestions
      const locations = new Set<string>();
      listings.forEach(listing => {
        if (listing.location && listing.location.toLowerCase().includes(query)) {
          locations.add(listing.location.toLowerCase());
        }
      });
      
      locations.forEach(location => {
        if (!addedTexts.has(location)) {
          suggestions.push({
            id: `location-${location}`,
            text: location,
            type: 'location',
            metadata: { region: location }
          });
          addedTexts.add(location);
        }
      });

      // Title/product name suggestions
      listings.forEach(listing => {
        if (listing.title && listing.title.toLowerCase().includes(query)) {
          const title = listing.title.toLowerCase();
          if (!addedTexts.has(title) && suggestions.length < 8) {
            suggestions.push({
              id: `title-${listing.id}`,
              text: listing.title,
              type: 'popular',
              metadata: { count: 1 }
            });
            addedTexts.add(title);
          }
        }
      });

      // Limit to top 8 suggestions
      res.json({ suggestions: suggestions.slice(0, 8) });
    } catch (error) {
      console.error("Search suggestions error:", error);
      res.status(500).json({ suggestions: [] });
    }
  });
  
  app.post("/api/listings/search", isAuthenticated, async (req, res) => {
    try {
      const { searchQuery, filters } = req.body;
      
      // Get all active listings
      const allListings = await storage.getListings({ status: 'active' });
      
      // Apply filters
      let filteredListings = allListings;
      
      // Text search if query provided
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        filteredListings = filteredListings.filter(listing => {
          const titleMatch = listing.title?.toLowerCase().includes(queryLower);
          const descMatch = listing.description?.toLowerCase().includes(queryLower);
          const categoryMatch = listing.category?.toLowerCase().includes(queryLower);
          const locationMatch = listing.location?.toLowerCase().includes(queryLower);
          
          return titleMatch || descMatch || categoryMatch || locationMatch;
        });
      }
      
      // Filter by product type if specified
      if (filters.productType && filters.productType.length > 0) {
        filteredListings = filteredListings.filter(listing => 
          filters.productType.includes(listing.category)
        );
      }
      
      // Filter by price range
      if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
        filteredListings = filteredListings.filter(listing => 
          listing.price >= filters.priceMin && listing.price <= filters.priceMax
        );
      }
      
      // Filter by location
      if (filters.location) {
        const locationLower = filters.location.toLowerCase();
        filteredListings = filteredListings.filter(listing => 
          listing.location.toLowerCase().includes(locationLower)
        );
      }
      
      // Filter by quality grade
      if (filters.qualityGrade && filters.qualityGrade.length > 0) {
        filteredListings = filteredListings.filter(listing => 
          filters.qualityGrade.includes(listing.qualityGrade || '')
        );
      }
      
      res.status(200).json(filteredListings);
    } catch (error) {
      console.error("Advanced search error:", error);
      res.status(500).send("Server error during advanced search");
    }
  });
  
  app.post("/api/listings/match", isAuthenticated, async (req, res) => {
    try {
      const { connectors = {}, criteria = {}, options = {}, ...legacyFields } = req.body;
      const buyerId = req.user!.id;
      
      // Support legacy format for backward compatibility
      const matchCriteria = {
        productType: criteria.productType || legacyFields.productType,
        quantity: criteria.quantity || legacyFields.quantity,
        maxPrice: criteria.maxPrice || legacyFields.maxPrice,
        location: criteria.location || legacyFields.location,
        region: criteria.region || legacyFields.region,
        projectType: criteria.projectType || legacyFields.projectType,
        ...criteria
      };
      
      if (!matchCriteria.productType || !matchCriteria.quantity) {
        return res.status(400).json({ 
          error: "Product type and quantity are required",
          format: "Use { connectors: {}, criteria: { productType, quantity }, options: {} }"
        });
      }
      
      // Fetch external listings first using crawler service
      let externalCandidates: any[] = [];
      let meta = { successes: [], failures: [] };
      
      try {
        // Use internal database only - no external connectors for authentic data
        const internalListings = await storage.getListings({ status: 'active' });
        
        // Apply strict commodity filtering for cannabis/hemp only
        externalCandidates = internalListings.filter(listing => {
          const category = listing.category?.toLowerCase() || '';
          const isCannabiHemp = category.includes('cannabis') || 
                               category.includes('hemp') || 
                               category.includes('cbd') || 
                               category.includes('thc');
          
          // Additional commodity type filter if specified
          if (matchCriteria.productType) {
            const commodityLower = matchCriteria.productType.toLowerCase();
            return isCannabiHemp && category.includes(commodityLower);
          }
          
          return isCannabiHemp;
        });
        
        meta = {
          successes: [{ name: 'internalDB', count: externalCandidates.length, cached: false }] as any[],
          failures: [] as any[]
        };
        
        console.log(`Match engine: Found ${externalCandidates.length} cannabis/hemp candidates from internal database`);
      } catch (internalError) {
        console.warn('Internal database failed for matching:', internalError);
        (meta.failures as any[]).push({ name: 'internal-db', error: String(internalError) });
        externalCandidates = [];
      }
      
      // Apply same cannabis/hemp allow-list filter to matching candidates
      const allowedCommodities = new Set(['cannabis', 'hemp', 'cbd', 'thc']);
      const internalCandidates = await storage.getListings({ status: 'active' });
      const filteredInternalCandidates = internalCandidates.filter(listing => {
        const category = listing.category?.toLowerCase() || '';
        
        // Hard filter to allowed commodities only
        const hasAllowedCommodity = Array.from(allowedCommodities).some(allowed => 
          category.includes(allowed)
        );
        if (!hasAllowedCommodity) {
          return false;
        }
        
        if (matchCriteria.productType) {
          const commodityLower = matchCriteria.productType.toLowerCase();
          return category.includes(commodityLower);
        }
        
        return true;
      });
      
      // Use only filtered internal candidates (externalCandidates are already filtered cannabis/hemp)
      const combined = filteredInternalCandidates.map(listing => ({ ...listing, source: 'internal' }));
      
      // Use enhanced matching service to rank combined results
      const { matchingService } = await import('./matching-service');
      const ranked = matchingService.rank(matchCriteria, combined);
      
      // Add metadata about the matching process
      const matchingMeta = {
        totalCandidates: combined.length,
        internalCandidates: internalCandidates.length,
        externalCandidates: externalCandidates.length,
        rankedResults: ranked.length,
        crawlerMeta: meta
      };
      
      res.status(200).json({ 
        ranked: ranked.map((r: any) => ({ 
          ...r.listing, 
          matchScore: r.matchScore,
          matchQuality: r.matchQuality,
          matchingFactors: r.matchingFactors,
          priceCompetitiveness: r.priceCompetitiveness,
          distanceScore: r.distanceScore,
          qualityScore: r.qualityScore,
          socialImpactScore: r.socialImpactScore
        })), 
        meta: matchingMeta 
      });
    } catch (error) {
      console.error("Matching error:", error);
      res.status(500).send("Server error during matching");
    }
  });
  
  // Batch processing for multiple matching requests
  app.post("/api/listings/batch-match", isAuthenticated, async (req, res) => {
    try {
      const { batchRequests } = req.body;
      
      if (!Array.isArray(batchRequests) || batchRequests.length === 0) {
        return res.status(400).send("Batch requests must be a non-empty array");
      }
      
      // Cap the number of batch requests to avoid overload
      const maxBatchSize = 5;
      const processableBatch = batchRequests.slice(0, maxBatchSize);
      
      // Process each request in parallel using Promise.all
      const batchResults = await Promise.all(
        processableBatch.map(async (request, index) => {
          try {
            // Validate each request
            if (!request.productType || !request.quantity) {
              return {
                batchIndex: index,
                status: 'error',
                error: 'Product type and quantity are required',
                matches: []
              };
            }
            
            // Get all active listings
            const allListings = await storage.getListings({ status: 'active' });
            
            // Filter for basic criteria first (for performance)
            const basicMatches = allListings.filter(listing => {
              // Must match product type/category
              if (listing.category !== request.productType) return false;
              
              // Must have sufficient quantity
              if (listing.quantity < request.quantity) return false;
              
              // Price check if provided
              if (request.priceRangeMin && request.priceRangeMax) {
                if (listing.price < request.priceRangeMin || listing.price > request.priceRangeMax) {
                  return false;
                }
              }
              
              return true;
            });
            
            // Return basic matches with batch metadata
            return {
              batchIndex: index,
              status: 'success',
              batchRequest: request,
              matches: basicMatches,
              matchCount: basicMatches.length
            };
          } catch (error) {
            console.error(`Error processing batch request ${index}:`, error);
            return {
              batchIndex: index,
              status: 'error',
              error: 'Error processing request', 
              matches: []
            };
          }
        })
      );
      
      // Return all batch results
      res.status(200).json({
        totalProcessed: processableBatch.length,
        totalRequested: batchRequests.length,
        batchResults
      });
    } catch (error) {
      console.error("Batch matching error:", error);
      res.status(500).send("Server error during batch matching");
    }
  });
  
  // Market Trends Routes
  app.get("/api/market-trends", async (req, res) => {
    try {
      const marketTrends = await storage.getMarketTrends();
      res.status(200).json(marketTrends);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.get("/api/market-trends/latest", async (req, res) => {
    try {
      // Cache for 15 minutes
      res.set('Cache-Control', 'public, max-age=900');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const latestTrends = await storage.getLatestMarketTrends(limit);
      res.status(200).json(latestTrends);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });

  // Blockchain Transaction Routes
  app.post("/api/blockchain/transactions", isAuthenticated, async (req, res) => {
    try {
      const { productId, sellerId, quantity, price } = req.body;
      
      if (!productId || !sellerId || !quantity || !price) {
        return res.status(400).send("Missing required transaction details");
      }
      
      // Record transaction on the blockchain
      const transactionHash = await blockchainService.recordTransaction(
        productId.toString(),
        req.user!.id.toString(),
        sellerId.toString(),
        quantity,
        price
      );
      
      res.status(201).json({ 
        transactionHash,
        timestamp: Date.now(),
        buyer: req.user!.id,
        seller: sellerId,
        productId,
        quantity,
        price
      });
    } catch (error) {
      console.error("Error recording blockchain transaction:", error);
      res.status(500).send("Failed to record transaction on blockchain");
    }
  });
  
  app.get("/api/blockchain/transactions/:txHash", async (req, res) => {
    try {
      const { txHash } = req.params;
      
      if (!txHash) {
        return res.status(400).send("Transaction hash is required");
      }
      
      const transaction = await blockchainService.getTransaction(txHash);
      
      if (!transaction) {
        return res.status(404).send("Transaction not found");
      }
      
      res.status(200).json(transaction);
    } catch (error) {
      console.error("Error retrieving blockchain transaction:", error);
      res.status(500).send("Failed to retrieve blockchain transaction");
    }
  });
  
  app.get("/api/blockchain/verify/:txHash", async (req, res) => {
    try {
      const { txHash } = req.params;
      
      if (!txHash) {
        return res.status(400).send("Transaction hash is required");
      }
      
      const isVerified = await blockchainService.verifyTransaction(txHash);
      
      res.status(200).json({ 
        transactionHash: txHash,
        verified: isVerified
      });
    } catch (error) {
      console.error("Error verifying blockchain transaction:", error);
      res.status(500).send("Failed to verify blockchain transaction");
    }
  });
  
  // Integrate blockchain verification with order creation
  app.post("/api/orders/with-verification", [isAuthenticated, requireBlockchainVerification], async (req: any, res: any) => {
    try {
      const validation = insertOrderSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.format() });
      }
      
      const orderData = validation.data;
      orderData.buyerId = req.user!.id;
      
      // Save transaction hash from blockchain
      orderData.transactionId = req.body.transactionHash;
      
      // Create the order with blockchain verification
      const newOrder = await storage.createOrder(orderData);
      res.status(201).json(newOrder);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });

  // ===== NEW ARCHITECTURAL COMPONENTS API ENDPOINTS =====
  
  // Matching Engine API
  app.post("/api/matching/find", requirePermission('listings:view'), async (req, res) => {
    try {
      const { productCategory, maxDistance, priceRange, qualityRequirements, minimumQuantity, preferredRegions } = req.body;
      
      const criteria = {
        productCategory,
        maxDistance,
        priceRange,
        qualityRequirements,
        minimumQuantity,
        preferredRegions
      };
      
      // Get all active listings and rank them using the matching service
      const allListings = await storage.getListings({ status: 'active' });
      const { matchingService } = await import('./matching-service');
      const ranked = matchingService.rank(criteria, allListings);
      const matches = ranked.map((r: any) => r.listing);
      
      loggingService.logUserAction({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'matching:find',
        resource: 'matching_engine',
        details: { criteria, matchCount: matches.length },
        success: true
      });
      
      res.status(200).json(matches);
    } catch (error) {
      loggingService.logUserAction({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'matching:find',
        resource: 'matching_engine',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: "Matching service error" });
    }
  });

  app.get("/api/matching/suggestions", requirePermission('listings:view'), async (req, res) => {
    try {
      // Generate suggestions using the matching service  
      const allListings = await storage.getListings({ status: 'active' });
      const { matchingService } = await import('./matching-service');
      const basicCriteria = { productType: 'cannabis' }; // Default criteria
      const ranked = matchingService.rank(basicCriteria, allListings);
      const suggestions = ranked.slice(0, 10).map((r: any) => r.listing); // Top 10 suggestions
      
      loggingService.logUserAction({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'matching:suggestions',
        resource: 'matching_engine',
        details: { suggestionCount: suggestions.length },
        success: true
      });
      
      res.status(200).json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // External Data API
  app.post("/api/external-data/market-prices", requirePermission('external_data:access'), async (req, res) => {
    try {
      const { symbols } = req.body;
      
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: "Symbols array is required" });
      }
      
      const marketData = await externalDataService.getMarketPriceData(req.user!, symbols);
      res.status(200).json(marketData);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Market data service error" });
    }
  });

  app.post("/api/external-data/regulatory", requirePermission('external_data:access'), async (req, res) => {
    try {
      const { regions } = req.body;
      
      if (!Array.isArray(regions) || regions.length === 0) {
        return res.status(400).json({ error: "Regions array is required" });
      }
      
      const regulatoryData = await externalDataService.getRegulatoryData(req.user!, regions);
      res.status(200).json(regulatoryData);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Regulatory data service error" });
    }
  });

  app.post("/api/external-data/partner-system", requirePermission('external_data:access'), async (req, res) => {
    try {
      const { partnerId, query } = req.body;
      
      if (!partnerId) {
        return res.status(400).json({ error: "Partner ID is required" });
      }
      
      const partnerData = await externalDataService.getPartnerSystemData(req.user!, partnerId, query || {});
      res.status(200).json(partnerData);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Partner system error" });
    }
  });

  app.post("/api/external-data/public-registry", requirePermission('external_data:access'), async (req, res) => {
    try {
      const { licenseNumbers } = req.body;
      
      if (!Array.isArray(licenseNumbers) || licenseNumbers.length === 0) {
        return res.status(400).json({ error: "License numbers array is required" });
      }
      
      const registryData = await externalDataService.getPublicRegistryData(req.user!, licenseNumbers);
      res.status(200).json(registryData);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Public registry error" });
    }
  });

  // Logging and Audit API
  app.get("/api/logs/recent", requirePermission('logs:view'), async (req, res) => {
    try {
      const { limit = 100, level } = req.query;
      const logs = await loggingService.getRecentLogs(parseInt(limit as string), level as any);
      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve logs" });
    }
  });

  app.get("/api/logs/user-activity/:userId", requireOwnershipOrPermission(
    async (req) => parseInt(req.params.userId),
    'logs:view'
  ), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { limit = 50 } = req.query;
      const logs = await loggingService.getUserActivityLogs(userId, parseInt(limit as string));
      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve user activity logs" });
    }
  });

  app.post("/api/logs/audit-report", requirePermission('logs:export'), async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
      
      const report = await loggingService.generateAuditReport(new Date(startDate), new Date(endDate));
      
      loggingService.logUserAction({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'audit:report_generated',
        resource: 'audit_system',
        details: { startDate, endDate, reportSize: report.totalActions },
        success: true
      });
      
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate audit report" });
    }
  });

  // Permissions API
  app.get("/api/permissions/my-permissions", isAuthenticated, async (req, res) => {
    try {
      const { PermissionsModule } = await import("./permissions");
      const permissions = PermissionsModule.getUserPermissions(req.user!);
      res.status(200).json({ permissions, role: req.user!.role });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve permissions" });
    }
  });

  // ===== WEEK 5-12 INFRASTRUCTURE COMPONENTS API ENDPOINTS =====

  // Permissions and Consent Flow API (Week 5: External Data Source Permissions)
  app.get("/api/data-sources/available", isAuthenticated, async (req, res) => {
    try {
      const { permissionsConsentFlow } = await import("./permissions-consent-flow");
      const sources = permissionsConsentFlow.getAvailableDataSources();
      res.status(200).json(sources);
    } catch (error) {
      res.status(500).send("Error fetching available data sources");
    }
  });

  app.post("/api/data-sources/request-consent", isAuthenticated, async (req, res) => {
    try {
      const { permissionsConsentFlow } = await import("./permissions-consent-flow");
      const result = await permissionsConsentFlow.requestConsent({
        userId: req.user!.id,
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).send("Error processing consent request");
    }
  });

  app.post("/api/data-sources/test-connection", isAuthenticated, async (req, res) => {
    try {
      const { permissionsConsentFlow } = await import("./permissions-consent-flow");
      const { dataSourceId } = req.body;
      const result = await permissionsConsentFlow.testConnection(req.user!.id, dataSourceId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).send("Error testing connection");
    }
  });

  app.delete("/api/data-sources/:dataSourceId/consent", isAuthenticated, async (req, res) => {
    try {
      const { permissionsConsentFlow } = await import("./permissions-consent-flow");
      const result = await permissionsConsentFlow.withdrawConsent(req.user!.id, req.params.dataSourceId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).send("Error withdrawing consent");
    }
  });

  app.get("/api/data-sources/my-consents", isAuthenticated, async (req, res) => {
    try {
      const { permissionsConsentFlow } = await import("./permissions-consent-flow");
      const consents = await permissionsConsentFlow.getUserConsents(req.user!.id);
      res.status(200).json(consents);
    } catch (error) {
      res.status(500).send("Error fetching user consents");
    }
  });

  // External Data Sources API (Week 6: Crawler and Mock Connectors)
  app.get("/api/external-sources", isAuthenticated, async (req, res) => {
    try {
      const { dataCrawler } = await import("./external-connectors/index");
      const status = dataCrawler.getStatus();
      res.status(200).json(status);
    } catch (error) {
      res.status(500).send("Error fetching external sources status");
    }
  });

  app.post("/api/external-sources/crawl", isAuthenticated, async (req, res) => {
    try {
      const { dataCrawler } = await import("./external-connectors/index");
      const { sourceName, filters } = req.body;
      
      // External data crawling disabled for clean testing environment
      // Users requested to remove all placeholder/mock data for real data testing
      const results: any[] = [];
      
      res.status(200).json({ 
        success: true, 
        count: results.length, 
        data: results,
        message: "External data crawling disabled for clean testing"
      });
    } catch (error) {
      res.status(500).json({ error: `Crawl failed: ${error}` });
    }
  });

  // Interaction Analytics API (Week 8: ML Data Collection)
  app.get("/api/analytics/interactions", requireAdmin, async (req, res) => {
    try {
      const { interactionLogger } = await import("./interaction-logger");
      const { userId, days } = req.query;
      const analytics = await interactionLogger.getInteractionAnalytics(
        userId ? parseInt(userId as string) : undefined,
        days ? parseInt(days as string) : 30
      );
      res.status(200).json(analytics);
    } catch (error) {
      res.status(500).send("Error fetching interaction analytics");
    }
  });

  // System Health and Monitoring API (Week 10: Security & Performance)
  app.get("/api/health", async (req, res) => {
    try {
      const { healthChecker } = await import("./security-monitoring");
      const healthStatus = await healthChecker.getHealthStatus();
      res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  });

  app.get("/api/performance", requireAdmin, async (req, res) => {
    try {
      const { performanceMonitor } = await import("./security-monitoring");
      const summary = performanceMonitor.getPerformanceSummary();
      const alerts = performanceMonitor.checkAlerts();
      res.status(200).json({ summary, alerts });
    } catch (error) {
      res.status(500).send("Error fetching performance metrics");
    }
  });

  // ML Framework Status API (Week 9: ML Pipeline Design)
  app.get("/api/ml/status", requireAdmin, async (req, res) => {
    try {
      const { ML_FRAMEWORK_DESIGN_DOCUMENT } = await import("./ml-framework-design");
      res.status(200).json({
        status: 'designed',
        ready: false,
        dataCollectionActive: true,
        minDataPoints: 1000,
        currentDataPoints: 0, // Would be calculated from actual interactions
        framework: ML_FRAMEWORK_DESIGN_DOCUMENT
      });
    } catch (error) {
      res.status(500).send("Error fetching ML framework status");
    }
  });

  // Privacy and Data Management API (Week 8: Privacy Compliance)
  app.delete("/api/privacy/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user can delete their own data or is admin
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        return res.status(403).send("Unauthorized to delete user data");
      }

      const { interactionLogger } = await import("./interaction-logger");
      await interactionLogger.anonymizeUserData(userId);
      
      res.status(200).json({ success: true, message: "User data anonymized" });
    } catch (error) {
      res.status(500).send("Error anonymizing user data");
    }
  });

  // Enhanced matching with external data integration
  app.post("/api/listings/match-enhanced", isAuthenticated, async (req, res) => {
    try {
      const { interactionLogger } = await import("./interaction-logger");
      const { dataCrawler } = await import("./external-connectors/index");
      
      // Log the match request for ML learning
      await interactionLogger.logMatchRequest({
        userId: req.user!.id,
        sessionId: req.sessionID,
        interactionType: 'match_request',
        ...req.body,
        userAgent: req.get('user-agent'),
        metadata: { enhanced: true, includesExternalData: true }
      });

      // External data fetching disabled for clean testing environment
      const externalListings: any[] = [];
      
      // Get internal listings using matching service
      const matchCriteria = req.body;
      const allListings = await storage.getListings({ status: 'active' });
      const { matchingService } = await import('./matching-service');
      const rankedMatches = matchingService.rank(matchCriteria, allListings);
      const internalMatches = rankedMatches.map((r: any) => r.listing);
      
      // Combine and rank results
      const combinedResults = [...internalMatches, ...externalListings.map((listing: any) => ({
        ...listing,
        isExternal: true,
        score: listing.socialImpactScore || 0
      }))];
      
      // Sort by combined score
      combinedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      // Log results for ML learning
      await interactionLogger.logMatchRequest({
        userId: req.user!.id,
        sessionId: req.sessionID,
        interactionType: 'match_request',
        resultsShown: combinedResults.slice(0, 20).map((item: any) => ({
          listingId: item.id,
          score: item.score || 0,
          socialImpactScore: item.socialImpactScore || 0,
          pricePerUnit: item.pricePerUnit,
          location: item.location
        })),
        totalResultsCount: combinedResults.length
      });

      res.status(200).json(combinedResults.slice(0, 20));
    } catch (error) {
      res.status(500).send("Error in enhanced matching");
    }
  });

  // Buy Signals routes - for buyers to post want ads
  
  // Get buy signals with filtering
  app.get("/api/buy-signals", async (req, res) => {
    try {
      const { category, isActive, limit = '20', offset = '0' } = req.query;
      
      const filters: Partial<BuySignal> = {};
      if (category) filters.category = category as any;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const signals = await storage.getBuySignals(
        filters,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json({ ok: true, signals });
    } catch (error) {
      console.error("Error fetching buy signals:", error);
      res.status(500).json({ error: "Failed to fetch buy signals" });
    }
  });

  // Get buy signal by ID (increments view count)
  app.get("/api/buy-signals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const signal = await storage.getBuySignalById(id);
      
      if (!signal) {
        return res.status(404).json({ error: "Buy signal not found" });
      }
      
      // Increment view count if someone else is viewing
      if (!req.user || req.user.id !== signal.buyerId) {
        await storage.incrementBuySignalViews(id);
      }
      
      res.json({ ok: true, signal });
    } catch (error) {
      console.error("Error fetching buy signal:", error);
      res.status(500).json({ error: "Failed to fetch buy signal" });
    }
  });

  // Create buy signal (authenticated buyers only)
  app.post("/api/buy-signals", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Validate input
      const validatedData = insertBuySignalSchema.parse({
        ...req.body,
        buyerId: user.id
      });
      
      const signal = await storage.createBuySignal(validatedData);
      
      res.status(201).json({ ok: true, signal });
    } catch (error) {
      console.error("Error creating buy signal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create buy signal" });
    }
  });

  // Get user's own buy signals
  app.get("/api/my-buy-signals", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const signals = await storage.getBuySignalsByBuyerId(user.id);
      
      res.json({ ok: true, signals });
    } catch (error) {
      console.error("Error fetching user buy signals:", error);
      res.status(500).json({ error: "Failed to fetch buy signals" });
    }
  });

  // Create response to buy signal (authenticated sellers)
  app.post("/api/buy-signals/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const signalId = parseInt(req.params.id);
      const user = req.user as any;
      
      const signal = await storage.getBuySignalById(signalId);
      if (!signal) {
        return res.status(404).json({ error: "Buy signal not found" });
      }
      
      if (!signal.isActive) {
        return res.status(400).json({ error: "This buy signal is no longer active" });
      }
      
      // Prevent buyers from responding to their own signals
      if (signal.buyerId === user.id) {
        return res.status(400).json({ error: "Cannot respond to your own buy signal" });
      }
      
      const validatedData = insertSignalResponseSchema.parse({
        ...req.body,
        buySignalId: signalId,
        sellerId: user.id
      });
      
      const response = await storage.createSignalResponse(validatedData);
      res.status(201).json({ ok: true, response });
    } catch (error) {
      console.error("Error creating signal response:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create response" });
    }
  });

  // Get responses for a buy signal (only by signal owner)
  app.get("/api/buy-signals/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;
      
      const signal = await storage.getBuySignalById(id);
      if (!signal) {
        return res.status(404).json({ error: "Buy signal not found" });
      }
      
      if (signal.buyerId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const responses = await storage.getSignalResponses(id);
      res.json({ ok: true, responses });
    } catch (error) {
      console.error("Error fetching signal responses:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // Organization endpoints
  
  // Create organization
  app.post("/api/organizations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only sellers can create organizations
      if (user.role !== 'seller') {
        return res.status(403).json({
          error: "Access denied",
          message: "Only sellers can create organizations"
        });
      }
      
      // Validate input data
      const validatedData = insertOrganizationSchema.parse({
        ...req.body,
        adminUserId: user.id // Set current user as admin
      });
      
      // Create the organization
      const organization = await storage.createOrganization(validatedData);
      
      res.status(201).json({
        success: true,
        organization
      });
      
    } catch (error) {
      console.error('Error creating organization:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create organization" });
    }
  });
  
  // Get organizations for current user
  app.get("/api/organizations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      let organizations = [];
      
      if (user.role === 'seller') {
        // Sellers see organizations they admin
        organizations = await storage.getOrganizationsByAdminUserId(user.id);
      } else if (user.role === 'admin') {
        // Admins see all organizations
        organizations = await storage.getOrganizations();
      }
      
      res.json({ organizations });
      
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  // Get seller organization (for onboarding)
  app.get("/api/seller/organization", isAuthenticated, requireSeller, async (req, res) => {
    try {
      const user = req.user!;
      
      const organizations = await storage.getOrganizationsByAdminUserId(user.id);
      const organization = organizations[0]; // Get first organization
      
      if (!organization) {
        return res.status(404).json({ 
          error: "No organization found",
          message: "Please create an organization first" 
        });
      }
      
      res.json(organization);
      
    } catch (error) {
      console.error('Error fetching seller organization:', error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Get seller organization stats
  app.get("/api/seller/organization/stats", isAuthenticated, requireSeller, async (req, res) => {
    try {
      const user = req.user!;
      
      const organizations = await storage.getOrganizationsByAdminUserId(user.id);
      if (organizations.length === 0) {
        return res.json({
          totalListings: 0,
          activeMandates: 0,
          pendingInvitations: 0,
          totalCommissionsPaid: 0
        });
      }
      
      const orgId = organizations[0].id;
      
      // Get listings count for this seller
      const listings = await storage.getListings({ sellerId: user.id });
      const totalListings = listings.length;
      
      // Get mandates for this organization
      const allMandates = await storage.getMandates();
      const orgMandates = allMandates.filter(m => m.sellerOrgId === orgId);
      const activeMandates = orgMandates.filter(m => m.status === 'active').length;
      const pendingInvitations = orgMandates.filter(m => m.status === 'pending').length;
      
      // Calculate total commissions paid (simplified)
      const totalCommissionsPaid = 0; // TODO: Implement commission tracking
      
      res.json({
        totalListings,
        activeMandates,
        pendingInvitations,
        totalCommissionsPaid
      });
      
    } catch (error) {
      console.error('Error fetching organization stats:', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Document Management API Endpoints

  // GET /api/documents - Get user's documents
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { documentType } = req.query;
      
      const filters: any = { userId: user.id };
      if (documentType && typeof documentType === 'string') {
        filters.documentType = documentType;
      }
      
      console.log(`[DOCUMENT LIST] User ${user.id} requesting documents with filters:`, JSON.stringify(filters));
      const documents = await storage.getDocuments(filters);
      console.log(`[DOCUMENT LIST] User ${user.id} has ${documents.length} documents returned`);
      res.json(documents);
      
    } catch (error) {
      console.error('[DOCUMENT LIST] Error fetching documents:', error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // GET /api/documents/:id - Get specific document
  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const documentId = parseInt(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Only allow users to access their own documents or admin
      if (document.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only access your own documents" 
        });
      }
      
      res.json(document);
      
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // POST /api/documents - Create document record
  app.post("/api/documents", isAuthenticated, validateInput(insertDocumentSchema), async (req, res) => {
    try {
      const user = req.user!;
      console.log(`[DOCUMENT UPLOAD] User ${user.id} attempting to create document:`, JSON.stringify(req.body, null, 2));
      
      // Add userId to validated data
      const documentData = {
        ...req.body,
        userId: user.id
      };
      
      console.log(`[DOCUMENT UPLOAD] Creating document with data:`, JSON.stringify(documentData, null, 2));
      const document = await storage.createDocument(documentData);
      console.log(`[DOCUMENT UPLOAD] Successfully created document with ID: ${document.id}, user_id: ${document.userId}, doc_type: ${document.documentType}, storage_url: ${document.objectPath}`);
      res.status(201).json(document);
      
    } catch (error) {
      console.error('[DOCUMENT UPLOAD] Error creating document:', error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // PATCH /api/documents/:id - Update document
  app.patch("/api/documents/:id", isAuthenticated, validateInput(insertDocumentSchema.partial()), async (req, res) => {
    try {
      const user = req.user!;
      const documentId = parseInt(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Only allow users to update their own documents or admin
      if (document.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only update your own documents" 
        });
      }
      
      // Don't allow userId to be updated
      const { userId, ...updateData } = req.body;
      
      const updatedDocument = await storage.updateDocument(documentId, updateData);
      res.json(updatedDocument);
      
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // DELETE /api/documents/:id - Delete document
  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const documentId = parseInt(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Only allow users to delete their own documents or admin
      if (document.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only delete your own documents" 
        });
      }
      
      // First, try to delete the file from object storage
      if (document.objectPath) {
        try {
          const objectStorageService = new ObjectStorageService();
          const objectFile = await objectStorageService.getObjectEntityFile(document.objectPath);
          
          // Check if user can access this file before deletion
          const canAccess = await objectStorageService.canAccessObjectEntity({
            objectFile,
            userId: user.id.toString(),
            requestedPermission: "write" as any,
          });
          
          if (canAccess) {
            // Delete the actual file from object storage
            await objectStorageService.deleteObject(objectFile);
          }
        } catch (storageError) {
          console.warn(`Warning: Could not delete object storage file for document ${documentId}:`, storageError);
          // Continue with database deletion even if file deletion fails
        }
      }
      
      // Delete the document record from database
      const success = await storage.deleteDocument(documentId);
      if (success) {
        res.json({ success: true, message: "Document deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete document from database" });
      }
      
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // GET /api/documents/:id/download - Download document via object storage
  app.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const documentId = parseInt(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Only allow users to download their own documents or admin
      if (document.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only download your own documents" 
        });
      }
      
      // Download from object storage
      const objectStorageService = new ObjectStorageService();
      try {
        // Build full object path for private directory
        const privateDir = objectStorageService.getPrivateObjectDir();
        const fullObjectPath = `${privateDir}/${document.objectPath}`;
        
        // Parse the object path to get bucket and object name
        const { bucketName, objectName } = parseObjectPath(fullObjectPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const objectFile = bucket.file(objectName);
        
        // Check if file exists
        const [exists] = await objectFile.exists();
        if (!exists) {
          return res.status(404).json({ error: "Document file not found in storage" });
        }
        
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: user.id.toString(),
          requestedPermission: "read" as any,
        });
        
        if (!canAccess) {
          return res.status(403).json({ error: "Access denied to document file" });
        }
        
        // Set content disposition for download
        res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
        res.setHeader('Content-Type', document.mimeType);
        
        objectStorageService.downloadObject(objectFile, res);
      } catch (storageError) {
        console.error("Error accessing document file:", storageError);
        if (storageError instanceof ObjectNotFoundError) {
          return res.status(404).json({ error: "Document file not found" });
        }
        return res.status(500).json({ error: "Failed to access document file" });
      }
      
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });


  // Note: HTTP server and WebSocket setup is now handled in index.ts
}
