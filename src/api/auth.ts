import { Router, Request, Response } from 'express';
import { AuthManager } from '../core/auth';

export function createAuthRoutes(authManager: AuthManager): Router {
  const router = Router();

  // POST /api/login - Login with username/password
  router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const isValid = await authManager.authenticate(username, password);
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const sessionId = authManager.createSession(username);
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      });

      res.json({ 
        success: true, 
        message: 'Login successful',
        sessionId 
      });
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // POST /api/logout - Logout and invalidate session
  router.post('/logout', (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionId) {
      authManager.invalidateSession(sessionId);
    }

    // Clear session cookie
    res.clearCookie('sessionId');
    
    res.json({ success: true, message: 'Logout successful' });
  });

  // GET /api/auth/status - Check authentication status
  router.get('/status', (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionId && authManager.validateSession(sessionId)) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  return router;
} 