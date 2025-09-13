import { db } from "./db";
import { users, listings, orders } from "@shared/schema";
import { log } from "./vite";
import { storage } from "./storage";
// DISABLED: import { seedMockOrders } from "./seed";
import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import path from "path";

export async function listUsers() {
  try {
    const allUsers = await db.select().from(users);
    console.log("===== USERS =====");
    allUsers.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
    });
    console.log("================");
    return allUsers;
  } catch (error) {
    console.error("Error listing users:", error);
    return [];
  }
}

export async function listListings() {
  try {
    const allListings = await db.select().from(listings);
    console.log("===== LISTINGS =====");
    allListings.forEach(listing => {
      console.log(`ID: ${listing.id}, Title: ${listing.title}, Category: ${listing.category}, Price: ${listing.pricePerUnit} ${listing.unit}`);
    });
    console.log("====================");
    return allListings;
  } catch (error) {
    console.error("Error listing listings:", error);
    return [];
  }
}

export async function listOrders() {
  try {
    const allOrders = await db.select().from(orders);
    console.log("===== ORDERS =====");
    allOrders.forEach(order => {
      console.log(`ID: ${order.id}, Listing: ${order.listingId}, Buyer: ${order.buyerId}, Status: ${order.status}`);
    });
    console.log("==================");
    return allOrders;
  } catch (error) {
    console.error("Error listing orders:", error);
    return [];
  }
}

export async function clearMockOrders() {
  try {
    // This is a simplified version - in a real database, you'd use proper
    // database migrations or a more controlled deletion process
    const allOrders = await db.select().from(orders);
    
    for (const order of allOrders) {
      if (order.transactionId?.startsWith('mock-transaction') || !order.transactionId) {
        await db.delete(orders).where(eq(orders.id, order.id));
      }
    }
    
    log("Mock orders cleared successfully", "express");
    return true;
  } catch (error) {
    console.error("Error clearing mock orders:", error);
    return false;
  }
}

// Add this function to your routes.ts file to access it via API (admin-only)
export function setupAdminRoutes(app: any) {
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated || !req.user || req.user.role !== 'admin') {
      return res.status(403).send("Access denied: Admin role required");
    }
    
    try {
      const allUsers = await listUsers();
      const sanitizedUsers = allUsers.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  app.get("/api/admin/listings", async (req: Request, res: Response) => {
    if (!req.isAuthenticated || !req.user || req.user.role !== 'admin') {
      return res.status(403).send("Access denied: Admin role required");
    }
    
    try {
      const allListings = await listListings();
      res.json(allListings);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  // Admin route to list all orders
  app.get("/api/admin/orders", async (req: Request, res: Response) => {
    if (!req.isAuthenticated || !req.user || req.user.role !== 'admin') {
      return res.status(403).send("Access denied: Admin role required");
    }
    
    try {
      const allOrders = await listOrders();
      res.json(allOrders);
    } catch (error) {
      res.status(500).send("Server error");
    }
  });
  
  // DISABLED: Mock order seeding route removed to prevent phantom data
  /*
  app.post("/api/admin/seed-mock-orders", async (req: Request, res: Response) => {
    try {
      // DISABLED: seedMockOrders() function removed to prevent phantom data
      res.status(410).json({ error: "Mock order seeding has been permanently disabled to ensure authentic data integrity" });
    } catch (error) {
      res.status(500).json({ error: "Failed to seed mock orders" });
    }
  });
  */
  
  // Admin route to clear mock orders - useful when going live
  app.post("/api/admin/clear-mock-orders", async (req: Request, res: Response) => {
    try {
      const success = await clearMockOrders();
      if (success) {
        res.json({ success: true, message: "Mock orders cleared successfully" });
      } else {
        res.status(500).json({ error: "Failed to clear mock orders" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to clear mock orders" });
    }
  });

  // DISABLED: Excel import route removed to prevent phantom data
  /*
  app.post("/api/admin/import-excel", async (req: Request, res: Response) => {
    try {
      const filePath = req.body?.filePath || path.join(process.cwd(), 'Izenzo Trading Platfrom V1.xlsx');
      
      // spawn a detached child process to run the import script
      const scriptPath = path.join(process.cwd(), 'scripts', 'import_excel_listings.js');
      
      const child = spawn('node', [scriptPath, '--file=' + filePath], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'] // ignore all stdio to run completely in background
      });
      
      child.unref(); // allow child to run independently
      
      // Respond immediately — import runs in background
      return res.status(202).json({ 
        ok: true, 
        message: 'Excel import started in background', 
        pid: child.pid,
        filePath: filePath
      });
    } catch (error) {
      log(`Excel import error: ${error}`, "express");
      res.status(500).json({ error: "Failed to start Excel import" });
    }
  });
  */
}