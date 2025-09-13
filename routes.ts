import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertListingSchema, insertOrderSchema, insertCannabisProductSchema } from "@shared/schema";
import blockchainService, { requireBlockchainVerification } from "./blockchain";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
};

// Middleware to check if user is a seller or admin
const isSeller = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated() && req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
    return next();
  }
  res.status(403).json({ 
    error: "Access denied: Only sellers and admins can create listings",
    currentRole: req.user?.role || 'unauthenticated'
  });
};

// Middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).send("Access denied: Admin role required");
};

export async function registerRoutes(app: Express): Promise<void> {
  console.log("Starting route registration...");
  
  // Load expensive imports dynamically to avoid blocking startup
  const { setupAdminRoutes } = await import("./admin");
  const { matchingEngine } = await import("./matching-engine");
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
  
  // Dashboard API endpoints for real statistics - no mock data
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const listings = await storage.getListings();
      const cannabisListings = listings.filter(l => l.category === 'cannabis' && l.status === 'active');
      
      const stats = {
        cannabisListings: cannabisListings.length,
        totalQuantity: cannabisListings.reduce((sum, l) => sum + (l.quantity || 0), 0),
        avgPrice: cannabisListings.length > 0 ? Math.round(cannabisListings.reduce((sum, l) => sum + (l.pricePerUnit || 0), 0) / cannabisListings.length) : 0,
        activeSuppliers: new Set(cannabisListings.map(l => l.sellerId)).size
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  app.get("/api/dashboard/activity", async (req, res) => {
    try {
      // Only return real orders/transactions - no mock data
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
      res.status(500).json({ error: 'Failed to fetch activity data' });
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
  
  // Listing Routes
  app.get("/api/listings", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      
      const filters: Record<string, any> = {};
      if (category) filters.category = category;
      if (status) filters.status = status;
      
      const listings = await storage.getListings(filters);
      res.status(200).json(listings);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
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
  
  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getListingById(listingId);
      
      if (!listing) {
        return res.status(404).send("Listing not found");
      }
      
      res.status(200).json(listing);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.post("/api/listings", isAuthenticated, isSeller, async (req, res) => {
    try {
      // Calculate total price from pricePerUnit and quantity
      const totalPrice = (req.body.pricePerUnit || 0) * (req.body.quantity || 0);
      
      const validation = insertListingSchema.safeParse({
        ...req.body,
        price: totalPrice, // Add calculated total price
        socialImpactScore: req.body.socialImpactScore || 0,
        socialImpactCategory: req.body.socialImpactCategory || "",
        sellerId: req.user!.id, // Include sellerId here
      });
      
      if (!validation.success) {
        console.error('Listing validation failed:', validation.error.format());
        return res.status(400).json({ errors: validation.error.format() });
      }
      
      const listingData = validation.data;
      const newListing = await storage.createListing(listingData);
      res.status(201).json(newListing);
    } catch (error) {
      console.error('Listing creation error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  });
  
  app.patch("/api/listings/:id", isAuthenticated, async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getListingById(listingId);
      
      if (!listing) {
        return res.status(404).send("Listing not found");
      }
      
      // Check if user is the seller or admin
      if (listing.sellerId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).send("Unauthorized to update this listing");
      }
      
      const updatedListing = await storage.updateListing(listingId, req.body);
      res.status(200).json(updatedListing);
    } catch (error) {
      res.status(500).send("Server error");
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
      
      const updatedOrder = await storage.updateOrder(orderId, req.body);
      res.status(200).json(updatedOrder);
    } catch (error) {
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

  // Enhanced search with social impact scoring and filtering (using internal database only)
  app.post("/api/search", async (req, res) => {
    try {
      const {
        query = '',
        commodityType = '',
        region = '',
        minSocialImpactScore = 0,
        socialImpactCategory = '',
        priceMin = null,
        priceMax = null,
        weights = { socialImpact: 0.15 }
      } = req.body;

      // Server-side cannabis/hemp allow-list for security
      const allowedCommodities = new Set(['cannabis', 'hemp', 'cbd', 'thc']);
      const normalizedCommodity = (commodityType || '').trim().toLowerCase();

      // If nothing provided, default to both cannabis & hemp for safety
      const restrictTo = normalizedCommodity
        ? [normalizedCommodity]
        : ['cannabis', 'hemp'];

      // Get all listings from internal database
      const allListings = await storage.getListings();
      
      // Apply search and filtering criteria with server-side allow-list
      let results = allListings.filter(listing => {
        // Text search
        if (query) {
          const queryLower = query.toLowerCase();
          const titleMatch = listing.title?.toLowerCase().includes(queryLower);
          const descMatch = listing.description?.toLowerCase().includes(queryLower);
          const categoryMatch = listing.category?.toLowerCase().includes(queryLower);
          const locationMatch = listing.location?.toLowerCase().includes(queryLower);
          
          if (!(titleMatch || descMatch || categoryMatch || locationMatch)) {
            return false;
          }
        }
        
        // Server-side commodity allow-list enforcement
        const category = listing.category?.toLowerCase() || '';
        
        // Hard filter to allowed commodities only
        const hasAllowedCommodity = Array.from(allowedCommodities).some(allowed => 
          category.includes(allowed)
        );
        if (!hasAllowedCommodity) {
          return false;
        }
        
        // If specific commodity type requested, ensure it matches restricted list
        if (restrictTo.length && !restrictTo.some(restricted => category.includes(restricted))) {
          return false;
        }
        
        // Region filter
        if (region && listing.location?.toLowerCase().indexOf(region.toLowerCase()) === -1) {
          return false;
        }
        
        // Social impact score filter
        if (minSocialImpactScore && (listing.socialImpactScore || 0) < minSocialImpactScore) {
          return false;
        }
        
        // Social impact category filter
        if (socialImpactCategory && listing.socialImpactCategory?.toLowerCase() !== socialImpactCategory.toLowerCase()) {
          return false;
        }
        
        // Price range filters
        if (priceMin != null && listing.pricePerUnit < Number(priceMin)) {
          return false;
        }
        if (priceMax != null && listing.pricePerUnit > Number(priceMax)) {
          return false;
        }
        
        return true;
      });

      // Sort by social impact score if weights are specified
      if (weights.socialImpact > 0) {
        results = results.sort((a, b) => {
          const scoreA = (a.socialImpactScore || 0) * weights.socialImpact;
          const scoreB = (b.socialImpactScore || 0) * weights.socialImpact;
          return scoreB - scoreA; // Sort descending
        });
      }

      const meta = {
        successes: [{ name: 'internalDB', count: results.length, cached: false }],
        failures: []
      };

      console.log(`Search completed: commodityType="${commodityType}", allowedCheck passed, results=${results.length}`);
      res.json({ ok: true, meta, count: results.length, results });
    } catch (err: any) {
      console.error('Enhanced search error:', err);
      res.status(500).json({ ok: false, error: err.message || String(err) });
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
          successes: [{ name: 'internalDB', count: externalCandidates.length, cached: false }],
          failures: []
        };
        
        console.log(`Match engine: Found ${externalCandidates.length} cannabis/hemp candidates from internal database`);
      } catch (internalError) {
        console.warn('Internal database failed for matching:', internalError);
        meta.failures.push({ name: 'internal-db', error: String(internalError) });
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
        ranked: ranked.map(r => ({ 
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
      
      const matches = await matchingEngine.findMatches(req.user!.id, criteria);
      
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
      const suggestions = await matchingEngine.generateMatchingSuggestions(req.user!.id);
      
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
      const results = [];
      
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
  app.get("/api/analytics/interactions", isAdmin, async (req, res) => {
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

  app.get("/api/performance", isAdmin, async (req, res) => {
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
  app.get("/api/ml/status", isAdmin, async (req, res) => {
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
      const externalListings = [];
      
      // Get internal listings
      const internalMatches = await matchingEngine.findMatches(req.user!.id, req.body);
      
      // Combine and rank results
      const combinedResults = [...internalMatches, ...externalListings.map(listing => ({
        ...listing,
        isExternal: true,
        score: matchingEngine.calculateSocialImpactScore(req.body, listing)
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

  // Note: HTTP server and WebSocket setup is now handled in index.ts
}
