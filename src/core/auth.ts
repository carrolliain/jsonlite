import * as bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { LiteJSONConfig } from './config';

export interface AuthSession {
  username: string;
  authenticated: boolean;
  timestamp: number;
}

export class AuthManager {
  private config: LiteJSONConfig;
  private sessions: Map<string, AuthSession> = new Map();

  constructor(config: LiteJSONConfig) {
    this.config = config;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    if (username !== this.config.admin.username) {
      return false;
    }

    return await this.verifyPassword(password, this.config.admin.passwordHash);
  }

  createSession(username: string): string {
    const sessionId = this.generateSessionId();
    const session: AuthSession = {
      username,
      authenticated: true,
      timestamp: Date.now()
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Check if session is expired (24 hours)
    const now = Date.now();
    const sessionAge = now - session.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      this.sessions.delete(sessionId);
      return false;
    }

    return session.authenticated;
  }

  invalidateSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Express middleware for authentication
  requireAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionId || !this.validateSession(sessionId)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      next();
    };
  }

  // Express middleware for optional authentication
  optionalAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
      
      if (sessionId && this.validateSession(sessionId)) {
        req.isAuthenticated = true;
      } else {
        req.isAuthenticated = false;
      }

      next();
    };
  }

  // Check if file requires admin access
  requiresAdmin(filename: string): boolean {
    const permission = this.config.permissions?.[filename];
    return permission === 'admin';
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      isAuthenticated?: boolean;
    }
  }
} 