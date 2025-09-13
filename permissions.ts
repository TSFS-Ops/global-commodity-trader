import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";
import { log } from "./vite";

export type Permission = 
  | 'listings:create'
  | 'listings:edit_own'
  | 'listings:edit_all'
  | 'listings:delete_own'
  | 'listings:delete_all'
  | 'listings:view'
  | 'orders:create'
  | 'orders:view_own'
  | 'orders:view_all'
  | 'orders:update_own'
  | 'orders:update_all'
  | 'users:view_own'
  | 'users:view_all'
  | 'users:edit_own'
  | 'users:edit_all'
  | 'admin:access'
  | 'blockchain:verify'
  | 'certificates:create'
  | 'certificates:verify'
  | 'messages:send'
  | 'messages:view_own'
  | 'external_data:access'
  | 'logs:view'
  | 'logs:export';

export type Role = 'buyer' | 'seller' | 'admin';

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  buyer: [
    'listings:view',
    'orders:create',
    'orders:view_own',
    'orders:update_own',
    'users:view_own',
    'users:edit_own',
    'messages:send',
    'messages:view_own',
    'certificates:create'
  ],
  seller: [
    'listings:create',
    'listings:edit_own',
    'listings:delete_own',
    'listings:view',
    'orders:view_own',
    'orders:update_own',
    'users:view_own',
    'users:edit_own',
    'messages:send',
    'messages:view_own',
    'certificates:create',
    'certificates:verify',
    'blockchain:verify',
    'external_data:access'
  ],
  admin: [
    'listings:create',
    'listings:edit_own',
    'listings:edit_all',
    'listings:delete_own',
    'listings:delete_all',
    'listings:view',
    'orders:create',
    'orders:view_own',
    'orders:view_all',
    'orders:update_own',
    'orders:update_all',
    'users:view_own',
    'users:view_all',
    'users:edit_own',
    'users:edit_all',
    'admin:access',
    'blockchain:verify',
    'certificates:create',
    'certificates:verify',
    'messages:send',
    'messages:view_own',
    'external_data:access',
    'logs:view',
    'logs:export'
  ]
};

export class PermissionsModule {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(user: User, permission: Permission): boolean {
    const userRole = user.role as Role;
    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if a user can access a resource they own
   */
  static canAccessOwnResource(user: User, resourceOwnerId: number, permission: Permission): boolean {
    // Check if user owns the resource
    if (user.id === resourceOwnerId) {
      return this.hasPermission(user, permission);
    }

    // Check if user has permission to access all resources of this type
    const allAccessPermission = permission.replace('_own', '_all') as Permission;
    return this.hasPermission(user, allAccessPermission);
  }

  /**
   * Get all permissions for a user
   */
  static getUserPermissions(user: User): Permission[] {
    const userRole = user.role as Role;
    return rolePermissions[userRole] || [];
  }

  /**
   * Log permission check for audit trail
   */
  private static logPermissionCheck(
    user: User, 
    permission: Permission, 
    granted: boolean, 
    resource?: string
  ): void {
    log(`Permission check: User ${user.username} (${user.role}) ${granted ? 'GRANTED' : 'DENIED'} ${permission}${resource ? ` on ${resource}` : ''}`, "express");
  }
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const hasPermission = PermissionsModule.hasPermission(req.user, permission);
    
    PermissionsModule['logPermissionCheck'](req.user, permission, hasPermission);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        required: permission,
        userRole: req.user.role
      });
    }

    next();
  };
}

/**
 * Middleware to require ownership or admin access
 */
export function requireOwnershipOrPermission(
  getResourceOwnerId: (req: Request) => Promise<number | null>,
  permission: Permission
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (resourceOwnerId === null) {
        return res.status(404).json({ error: "Resource not found" });
      }

      const canAccess = PermissionsModule.canAccessOwnResource(
        req.user, 
        resourceOwnerId, 
        permission
      );

      PermissionsModule['logPermissionCheck'](
        req.user, 
        permission, 
        canAccess, 
        `resource:${resourceOwnerId}`
      );

      if (!canAccess) {
        return res.status(403).json({ 
          error: "Access denied",
          required: permission,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      log(`Permission check error: ${error}`, "express");
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

/**
 * Middleware for admin-only routes
 */
export const requireAdmin = requirePermission('admin:access');

/**
 * Middleware for seller-only routes
 */
export function requireSeller(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: "Seller access required",
      userRole: req.user.role
    });
  }

  next();
}

/**
 * Check data access permissions for external integrations
 */
export function checkDataAccessPermission(user: User, dataSource: string): boolean {
  const hasExternalAccess = PermissionsModule.hasPermission(user, 'external_data:access');
  
  if (!hasExternalAccess) {
    return false;
  }

  // Additional checks could be added here for specific data sources
  // For example, regulatory data might require additional verification
  
  return true;
}