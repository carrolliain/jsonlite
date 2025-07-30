import * as fs from 'fs';
import * as path from 'path';

export interface LiteJSONConfig {
  dataDir: string;
  schemasDir: string;
  port: number;
  admin: {
    username: string;
    passwordHash: string;
  };
  permissions?: Record<string, 'public' | 'admin'>;
}

const DEFAULT_CONFIG: Partial<LiteJSONConfig> = {
  dataDir: './data',
  schemasDir: './schemas',
  port: 3000,
  permissions: {}
};

export class ConfigLoader {
  private config: LiteJSONConfig | null = null;
  private configPath: string;

  constructor(configPath: string = './litejson.config.json') {
    this.configPath = configPath;
  }

  load(): LiteJSONConfig {
    if (this.config) {
      return this.config;
    }

    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Config file not found: ${this.configPath}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const userConfig = JSON.parse(configData);
      
      this.config = {
        ...DEFAULT_CONFIG,
        ...userConfig,
        permissions: {
          ...DEFAULT_CONFIG.permissions,
          ...userConfig.permissions
        }
      } as LiteJSONConfig;

      this.validateConfig(this.config);
      this.ensureDirectories(this.config);
      
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateConfig(config: LiteJSONConfig): void {
    if (!config.admin?.username || !config.admin?.passwordHash) {
      throw new Error('Admin username and password hash are required');
    }

    if (config.port < 1 || config.port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }

    if (!config.dataDir || !config.schemasDir) {
      throw new Error('Data and schemas directories are required');
    }
  }

  private ensureDirectories(config: LiteJSONConfig): void {
    const dirs = [config.dataDir, config.schemasDir, '.history'];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  getConfig(): LiteJSONConfig {
    return this.load();
  }

  reload(): LiteJSONConfig {
    this.config = null;
    return this.load();
  }
} 