import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class SchemaValidator {
  private ajv: Ajv;
  private schemasDir: string;
  private schemas: Map<string, any> = new Map();

  constructor(schemasDir: string = './schemas') {
    this.schemasDir = schemasDir;
    this.ajv = new Ajv({ allErrors: true });
    this.loadSchemas();
  }

  private loadSchemas(): void {
    try {
      if (!fs.existsSync(this.schemasDir)) {
        return;
      }

      const schemaFiles = fs.readdirSync(this.schemasDir)
        .filter(file => file.endsWith('.json'));

      for (const file of schemaFiles) {
        const schemaName = file.replace('.json', '');
        const schemaPath = path.join(this.schemasDir, file);
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);

        this.ajv.addSchema(schema, schemaName);
        this.schemas.set(schemaName, schema);
      }
    } catch (error) {
      console.warn('Failed to load schemas:', error);
    }
  }

  validate(filename: string, data: any): ValidationResult {
    const schemaName = filename.replace('.json', '');
    
    if (!this.schemas.has(schemaName)) {
      // No schema defined for this file, consider it valid
      return { valid: true };
    }

    const validate = this.ajv.getSchema(schemaName);
    if (!validate) {
      return { valid: true };
    }

    const isValid = validate(data);
    
    if (isValid) {
      return { valid: true };
    } else {
      const errors = validate.errors?.map(error => 
        `${error.instancePath} ${error.message}`.trim()
      ) || [];
      
      return { valid: false, errors };
    }
  }

  hasSchema(filename: string): boolean {
    const schemaName = filename.replace('.json', '');
    return this.schemas.has(schemaName);
  }

  getSchema(filename: string): any | null {
    const schemaName = filename.replace('.json', '');
    return this.schemas.get(schemaName) || null;
  }

  reloadSchemas(): void {
    this.schemas.clear();
    this.ajv = new Ajv({ allErrors: true });
    this.loadSchemas();
  }
} 