import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ConfigLoader } from './core/config';
import { FileManager } from './core/fileManager';
import { AuthManager } from './core/auth';
import { SchemaValidator } from './core/schema';
import { createFileRoutes } from './api/files';
import { createAuthRoutes } from './api/auth';
import { createSchemaRoutes } from './api/schema';
import { createSchemasListRoute } from './api/schema';

export class LiteJSONServer {
  private app: express.Application;
  private config: any;
  private fileManager!: FileManager;
  private authManager!: AuthManager;
  private schemaValidator!: SchemaValidator;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.loadConfiguration();
    this.initializeComponents();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(cookieParser());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private loadConfiguration(): void {
    try {
      const configLoader = new ConfigLoader();
      this.config = configLoader.load();
      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      process.exit(1);
    }
  }

  private initializeComponents(): void {
    this.fileManager = new FileManager(this.config.dataDir);
    this.authManager = new AuthManager(this.config);
    this.schemaValidator = new SchemaValidator(this.config.schemasDir);
    
    console.log('✅ Core components initialized');
  }

  private setupRoutes(): void {
    // Public data routes (read-only)
    this.app.get('/data/:filename', (req, res) => {
      const { filename } = req.params;
      
      // Check if file requires admin access
      if (this.authManager.requiresAdmin(filename)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = this.fileManager.readFile(filename);
      
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json(result.data);
    });

    // API routes with authentication
    this.app.use('/api/file', 
      this.authManager.optionalAuth(),
      createFileRoutes(this.fileManager, this.schemaValidator, this.authManager)
    );

    // GET /api/files - List all available files
    this.app.get('/api/files', (req, res) => {
      const result = this.fileManager.listFiles();
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ files: result.data });
    });

    this.app.use('/api/auth', createAuthRoutes(this.authManager));
    this.app.use('/api/schema', createSchemaRoutes(this.schemaValidator, this.authManager, this.config.schemasDir));
    this.app.use('/api/schemas', createSchemasListRoute(this.config.schemasDir));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Root endpoint with API info
    this.app.get('/', (req, res) => {
      res.json({
        name: 'LiteJSON',
        version: '1.0.0',
        description: 'A lightweight, self-hosted, JSON-based backend for static sites',
        endpoints: {
          'GET /data/:filename': 'Public read access to JSON files',
          'GET /api/file/:filename': 'API read access to JSON files',
          'POST /api/file/:filename': 'Create or replace JSON file (requires auth)',
          'PUT /api/file/:filename': 'Replace JSON file (requires auth)',
          'PATCH /api/file/:filename': 'Partially update JSON file (requires auth)',
          'DELETE /api/file/:filename': 'Delete JSON file (requires auth)',
          'GET /api/files': 'List all available files',
          'POST /api/auth/login': 'Login with username/password',
          'POST /api/auth/logout': 'Logout and invalidate session',
          'GET /api/auth/status': 'Check authentication status',
          'GET /api/schema/:filename': 'Get JSON schema',
          'POST /api/schema/:filename': 'Create or update schema (requires auth)',
          'DELETE /api/schema/:filename': 'Delete schema (requires auth)',
          'GET /api/schemas': 'List all available schemas',
          'GET /health': 'Health check endpoint'
        }
      });
    });

    console.log('✅ Routes configured');
  }

  start(): void {
    const port = this.config.port;
    
    this.app.listen(port, () => {
      console.log(`🚀 LiteJSON server running on http://localhost:${port}`);
      console.log(`📁 Data directory: ${this.config.dataDir}`);
      console.log(`📁 Schemas directory: ${this.config.schemasDir}`);
      console.log(`👤 Admin user: ${this.config.admin.username}`);
      console.log('\n📖 API Documentation: http://localhost:${port}');
      console.log('💚 Health check: http://localhost:${port}/health');
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new LiteJSONServer();
  server.start();
} 