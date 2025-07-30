import { Router, Request, Response } from 'express';
import { FileManager } from '../core/fileManager';
import { SchemaValidator } from '../core/schema';
import { AuthManager } from '../core/auth';

export function createFileRoutes(
  fileManager: FileManager,
  schemaValidator: SchemaValidator,
  authManager: AuthManager
): Router {
  const router = Router();

  // GET /api/file/:filename - Get a specific JSON file
  router.get('/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;
    
    // Check if file requires admin access
    if (authManager.requiresAdmin(filename) && !req.isAuthenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = fileManager.readFile(filename);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result.data);
  });

  // POST /api/file/:filename - Create or replace a JSON file
  router.post('/:filename', authManager.requireAuth(), (req: Request, res: Response) => {
    const { filename } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Validate against schema if one exists
    const validation = schemaValidator.validate(filename, data);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const result = fileManager.writeFile(filename, data);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, data: result.data });
  });

  // PUT /api/file/:filename - Replace a JSON file (same as POST)
  router.put('/:filename', authManager.requireAuth(), (req: Request, res: Response) => {
    const { filename } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Validate against schema if one exists
    const validation = schemaValidator.validate(filename, data);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const result = fileManager.writeFile(filename, data);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, data: result.data });
  });

  // PATCH /api/file/:filename - Partially update a JSON file
  router.patch('/:filename', authManager.requireAuth(), (req: Request, res: Response) => {
    const { filename } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Read existing file
    const existingResult = fileManager.readFile(filename);
    if (!existingResult.success) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Merge with existing data
    const mergedData = { ...existingResult.data, ...data };

    // Validate against schema if one exists
    const validation = schemaValidator.validate(filename, mergedData);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const result = fileManager.writeFile(filename, mergedData);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, data: result.data });
  });

  // DELETE /api/file/:filename - Delete a JSON file
  router.delete('/:filename', authManager.requireAuth(), (req: Request, res: Response) => {
    const { filename } = req.params;

    const result = fileManager.deleteFile(filename);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ success: true });
  });

  // GET /api/files - List all available files
  router.get('/', (req: Request, res: Response) => {
    const result = fileManager.listFiles();
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ files: result.data });
  });

  return router;
} 