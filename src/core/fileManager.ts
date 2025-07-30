import * as fs from 'fs';
import * as path from 'path';

export interface FileOperation {
  success: boolean;
  data?: any;
  error?: string;
}

export class FileManager {
  private dataDir: string;
  private historyDir: string;

  constructor(dataDir: string = './data', historyDir: string = './.history') {
    this.dataDir = dataDir;
    this.historyDir = historyDir;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
  }

  private getFilePath(filename: string): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    // Remove .json extension if already present
    const baseFilename = sanitizedFilename.replace(/\.json$/i, '');
    return path.join(this.dataDir, `${baseFilename}.json`);
  }

  private sanitizeFilename(filename: string): string {
    // Remove any path traversal and ensure safe filename
    return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private createBackup(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.historyDir, `${path.basename(filePath)}.${timestamp}`);
        fs.copyFileSync(filePath, backupPath);
      }
    } catch (error) {
      console.warn(`Failed to create backup for ${filePath}:`, error);
    }
  }

  readFile(filename: string): FileOperation {
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
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  writeFile(filename: string, data: any): FileOperation {
    try {
      const filePath = this.getFilePath(filename);
      const tempPath = `${filePath}.tmp`;
      
      // Create backup before writing
      this.createBackup(filePath);
      
      // Write to temporary file first
      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, jsonString, 'utf8');
      
      // Atomic move from temp to actual file
      fs.renameSync(tempPath, filePath);
      
      return { success: true, data };
    } catch (error) {
      // Clean up temp file if it exists
      const tempPath = `${this.getFilePath(filename)}.tmp`;
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError);
        }
      }
      
      return { 
        success: false, 
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  deleteFile(filename: string): FileOperation {
    try {
      const filePath = this.getFilePath(filename);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      // Create backup before deletion
      this.createBackup(filePath);
      
      fs.unlinkSync(filePath);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  listFiles(): FileOperation {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      return { success: true, data: files };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  fileExists(filename: string): boolean {
    const filePath = this.getFilePath(filename);
    return fs.existsSync(filePath);
  }
} 