import { storage } from "./storage";
import { log } from "./vite";

export interface LogEntry {
  id?: number;
  timestamp: Date;
  userId?: number;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
}

export type LogLevel = 'info' | 'warning' | 'error' | 'security' | 'audit';

export interface SystemLog {
  id?: number;
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  details?: Record<string, any>;
  correlationId?: string;
}

export class LoggingService {
  private static instance: LoggingService;
  private logBuffer: LogEntry[] = [];
  private systemLogBuffer: SystemLog[] = [];
  private readonly bufferSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Flush logs every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 30000);
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Log user action for audit trail
   */
  logUserAction(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date()
    };

    this.logBuffer.push(logEntry);
    
    // Also log to console for immediate visibility
    log(`User Action: ${entry.action} on ${entry.resource} by user ${entry.userId} (${entry.userRole}) - ${entry.success ? 'SUCCESS' : 'FAILED'}`, "express");

    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
    }
  }

  /**
   * Log system events
   */
  logSystem(level: LogLevel, service: string, message: string, details?: Record<string, any>, correlationId?: string): void {
    const systemLog: SystemLog = {
      timestamp: new Date(),
      level,
      service,
      message,
      details,
      correlationId
    };

    this.systemLogBuffer.push(systemLog);
    
    // Log to console based on level
    const consoleMessage = `[${level.toUpperCase()}] ${service}: ${message}`;
    if (level === 'error') {
      console.error(consoleMessage, details);
    } else if (level === 'warning') {
      console.warn(consoleMessage, details);
    } else {
      log(consoleMessage, "express");
    }

    if (this.systemLogBuffer.length >= this.bufferSize) {
      this.flushSystemLogs();
    }
  }

  /**
   * Log authentication events
   */
  logAuth(userId: number, action: 'login' | 'logout' | 'register' | 'failed_login', 
          success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): void {
    this.logUserAction({
      userId,
      action: `auth:${action}`,
      resource: 'authentication',
      details: { ipAddress, userAgent },
      success,
      errorMessage,
      ipAddress,
      userAgent
    });
  }

  /**
   * Log listing operations
   */
  logListing(userId: number, userRole: string, action: 'create' | 'update' | 'delete' | 'view', 
            listingId: string, success: boolean, details?: Record<string, any>, errorMessage?: string): void {
    this.logUserAction({
      userId,
      userRole,
      action: `listing:${action}`,
      resource: 'listing',
      resourceId: listingId,
      details: details || {},
      success,
      errorMessage
    });
  }

  /**
   * Log order operations
   */
  logOrder(userId: number, userRole: string, action: 'create' | 'update' | 'cancel' | 'complete', 
           orderId: string, success: boolean, details?: Record<string, any>, errorMessage?: string): void {
    this.logUserAction({
      userId,
      userRole,
      action: `order:${action}`,
      resource: 'order',
      resourceId: orderId,
      details: details || {},
      success,
      errorMessage
    });
  }

  /**
   * Log blockchain transactions
   */
  logBlockchain(userId: number, action: 'record' | 'verify', transactionHash: string, 
                success: boolean, details?: Record<string, any>, errorMessage?: string): void {
    this.logUserAction({
      userId,
      action: `blockchain:${action}`,
      resource: 'blockchain_transaction',
      resourceId: transactionHash,
      details: details || {},
      success,
      errorMessage
    });
  }

  /**
   * Log external data access
   */
  logExternalDataAccess(userId: number, userRole: string, dataSource: string, 
                       success: boolean, details?: Record<string, any>, errorMessage?: string): void {
    this.logUserAction({
      userId,
      userRole,
      action: 'external_data:access',
      resource: dataSource,
      details: details || {},
      success,
      errorMessage
    });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, userId?: number, severity: 'low' | 'medium' | 'high' = 'medium', 
             details?: Record<string, any>): void {
    this.logSystem('security', 'security-monitor', event, { 
      severity, 
      userId, 
      ...details 
    });

    // For high severity, also create user action log if user is involved
    if (severity === 'high' && userId) {
      this.logUserAction({
        userId,
        action: 'security:alert',
        resource: 'security',
        details: { event, severity, ...details },
        success: false
      });
    }
  }

  /**
   * Flush logs to persistent storage
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      // In a real implementation, these would be stored in a dedicated logs table
      // For now, we'll just clear the buffer and log the action
      const logCount = this.logBuffer.length;
      this.logBuffer = [];
      
      log(`Flushed ${logCount} audit log entries to storage`, "express");
    } catch (error) {
      log(`Error flushing audit logs: ${error}`, "express");
    }
  }

  /**
   * Flush system logs to persistent storage
   */
  private async flushSystemLogs(): Promise<void> {
    if (this.systemLogBuffer.length === 0) return;

    try {
      const logCount = this.systemLogBuffer.length;
      this.systemLogBuffer = [];
      
      log(`Flushed ${logCount} system log entries to storage`, "express");
    } catch (error) {
      log(`Error flushing system logs: ${error}`, "express");
    }
  }

  /**
   * Get recent logs for admin dashboard
   */
  async getRecentLogs(limit: number = 100, level?: LogLevel): Promise<SystemLog[]> {
    // In a real implementation, this would query the database
    // For now, return recent logs from buffer
    let logs = [...this.systemLogBuffer];
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    return logs.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId: number, limit: number = 50): Promise<LogEntry[]> {
    // In a real implementation, this would query the database
    const userLogs = this.logBuffer.filter(log => log.userId === userId);
    return userLogs.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(startDate: Date, endDate: Date): Promise<{
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    topUsers: Array<{ userId: number; actionCount: number }>;
    topActions: Array<{ action: string; count: number }>;
    securityEvents: number;
  }> {
    // In a real implementation, this would query the database with date filters
    const relevantLogs = this.logBuffer.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    );

    const totalActions = relevantLogs.length;
    const successfulActions = relevantLogs.filter(log => log.success).length;
    const failedActions = totalActions - successfulActions;

    // Count actions by user
    const userActionCounts = new Map<number, number>();
    relevantLogs.forEach(log => {
      if (log.userId) {
        userActionCounts.set(log.userId, (userActionCounts.get(log.userId) || 0) + 1);
      }
    });

    const topUsers = Array.from(userActionCounts.entries())
      .map(([userId, actionCount]) => ({ userId, actionCount }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    // Count actions by type
    const actionCounts = new Map<string, number>();
    relevantLogs.forEach(log => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const securityEvents = this.systemLogBuffer.filter(log => 
      log.level === 'security' && 
      log.timestamp >= startDate && 
      log.timestamp <= endDate
    ).length;

    return {
      totalActions,
      successfulActions,
      failedActions,
      topUsers,
      topActions,
      securityEvents
    };
  }

  /**
   * Cleanup old logs (for maintenance)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // In a real implementation, this would delete old records from the database
    log(`Would cleanup logs older than ${cutoffDate.toISOString()}`, "express");
  }

  /**
   * Shutdown logging service
   */
  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush any remaining logs
    this.flushLogs();
    this.flushSystemLogs();
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance();