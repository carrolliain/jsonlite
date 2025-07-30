const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Simple config loader
function loadConfig() {
  try {
    const configData = fs.readFileSync('./litejson.config.json', 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load config:', error.message);
    process.exit(1);
  }
}

// Simple file manager
class FileManager {
  constructor(dataDir = './data', historyDir = './.history') {
    this.dataDir = dataDir;
    this.historyDir = historyDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
  }

  getFilePath(filename) {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.dataDir, `${sanitizedFilename}.json`);
  }

  readFile(filename) {
    try {
      const filePath = this.getFilePath(filename);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(data);
      
      return { success: true, data: jsonData };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to read file: ${error.message}` 
      };
    }
  }

  writeFile(filename, data) {
    try {
      const filePath = this.getFilePath(filename);
      const tempPath = `${filePath}.tmp`;
      
      // Write to temporary file first
      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, jsonString, 'utf8');
      
      // Atomic move from temp to actual file
      fs.renameSync(tempPath, filePath);
      
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to write file: ${error.message}` 
      };
    }
  }

  listFiles() {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      return { success: true, data: files };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to list files: ${error.message}` 
      };
    }
  }
}

// Simple auth manager
class AuthManager {
  constructor(config) {
    this.config = config;
    this.sessions = new Map();
  }

  async authenticate(username, password) {
    if (username !== this.config.admin.username) {
      return false;
    }
    return await bcrypt.compare(password, this.config.admin.passwordHash);
  }

  createSession(username) {
    const sessionId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    const session = {
      username,
      authenticated: true,
      timestamp: Date.now()
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    const now = Date.now();
    const sessionAge = now - session.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (sessionAge > maxAge) {
      this.sessions.delete(sessionId);
      return false;
    }
    return session.authenticated;
  }

  requireAuth() {
    return (req, res, next) => {
      const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionId || !this.validateSession(sessionId)) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      next();
    };
  }

  optionalAuth() {
    return (req, res, next) => {
      const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
      
      if (sessionId && this.validateSession(sessionId)) {
        req.isAuthenticated = true;
      } else {
        req.isAuthenticated = false;
      }
      next();
    };
  }
}

// Main server
function createServer() {
  const app = express();
  const config = loadConfig();
  const fileManager = new FileManager(config.dataDir);
  const authManager = new AuthManager(config);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Public data routes
  app.get('/data/:filename', (req, res) => {
    const { filename } = req.params;
    const result = fileManager.readFile(filename);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    res.json(result.data);
  });

  // API routes
  app.get('/api/file/:filename', authManager.optionalAuth(), (req, res) => {
    const { filename } = req.params;
    const result = fileManager.readFile(filename);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    res.json(result.data);
  });

  app.post('/api/file/:filename', authManager.requireAuth(), (req, res) => {
    const { filename } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const result = fileManager.writeFile(filename, data);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ success: true, data: result.data });
  });

  app.get('/api/files', (req, res) => {
    const result = fileManager.listFiles();
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ files: result.data });
  });

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
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
      
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
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

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'LiteJSON',
      version: '1.0.0',
      description: 'A lightweight, self-hosted, JSON-based backend for static sites',
      endpoints: {
        'GET /data/:filename': 'Public read access to JSON files',
        'GET /api/file/:filename': 'API read access to JSON files',
        'POST /api/file/:filename': 'Create or replace JSON file (requires auth)',
        'GET /api/files': 'List all available files',
        'POST /api/auth/login': 'Login with username/password',
        'GET /health': 'Health check endpoint'
      }
    });
  });

  return app;
}

// Start server
const app = createServer();
const config = loadConfig();
const port = config.port;

app.listen(port, () => {
  console.log(`🚀 LiteJSON server running on http://localhost:${port}`);
  console.log(`📁 Data directory: ${config.dataDir}`);
  console.log(`📁 Schemas directory: ${config.schemasDir}`);
  console.log(`👤 Admin user: ${config.admin.username}`);
  console.log('\n📖 API Documentation: http://localhost:' + port);
  console.log('💚 Health check: http://localhost:' + port + '/health');
}); 