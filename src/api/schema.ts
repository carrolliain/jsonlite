import { Router, Request, Response } from 'express';
import { SchemaValidator } from '../core/schema';
import { AuthManager } from '../core/auth';
import * as fs from 'fs';
import * as path from 'path';

export function createSchemaRoutes(
  schemaValidator: SchemaValidator,
  authManager: AuthManager,
  schemasDir: string = './schemas'
): Router {
  const router = Router();

  // GET /api/schema/:filename - Get a specific schema
  router.get('/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;
    const schemaName = filename.replace('.json', '');
    const schemaPath = path.join(schemasDir, `${schemaName}.json`);

    try {
      if (!fs.existsSync(schemaPath)) {
        return res.status(404).json({ error: 'Schema not found' });
      }

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);
      
      res.json(schema);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read schema' });
    }
  });

  // POST /api/schema/:filename - Create or update a schema
  router.post('/:filename', authManager.requireAuth(), (req: Request, res: Response) => {
    const { filename } = req.params;
    const { schema } = req.body;

    if (!schema) {
      return res.status(400).json({ error: 'Schema is required' });
    }

    try {
      // Validate that it's a valid JSON schema
      if (typeof schema !== 'object' || schema === null) {
        return res.status(400).json({ error: 'Invalid schema format' });
      }

      const schemaName = filename.replace('.json', '');
      const schemaPath = path.join(schemasDir, `${schemaName}.json`);

      // Ensure schemas directory exists
      if (!fs.existsSync(schemasDir)) {
        fs.mkdirSync(schemasDir, { recursive: true });
      }

      // Write schema file
      fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf8');

      // Reload schemas in validator
      schemaValidator.reloadSchemas();

      res.json({ success: true, schema });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save schema' });
    }
  });

  // DELETE /api/schema/:filename - Delete a schema
  router.delete('/:filename', authManager.requireAuth(), (req: Request, res: Response) => {
    const { filename } = req.params;
    const schemaName = filename.replace('.json', '');
    const schemaPath = path.join(schemasDir, `${schemaName}.json`);

    try {
      if (!fs.existsSync(schemaPath)) {
        return res.status(404).json({ error: 'Schema not found' });
      }

      fs.unlinkSync(schemaPath);
      
      // Reload schemas in validator
      schemaValidator.reloadSchemas();

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete schema' });
    }
  });

  return router;
} 

// GET /api/schemas - List all available schemas
export function createSchemasListRoute(schemasDir: string = './schemas') {
  const router = Router();
  router.get('/', (req: Request, res: Response) => {
    try {
      if (!fs.existsSync(schemasDir)) {
        return res.json({ schemas: [] });
      }
      const schemaFiles = fs.readdirSync(schemasDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      res.json({ schemas: schemaFiles });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list schemas' });
    }
  });
  return router;
} 