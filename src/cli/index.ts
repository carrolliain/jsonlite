import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { ConfigLoader } from '../core/config';

interface InitOptions {
  username?: string;
  password?: string;
  port?: number;
  dataDir?: string;
  schemasDir?: string;
}

export class CLI {
  private configLoader: ConfigLoader;

  constructor() {
    this.configLoader = new ConfigLoader();
  }

  async init(options: InitOptions = {}): Promise<void> {
    console.log('🚀 Initializing LiteJSON...');

    const username = options.username || 'admin';
    const password = options.password || 'admin123';
    const port = options.port || 3000;
    const dataDir = options.dataDir || './data';
    const schemasDir = options.schemasDir || './schemas';

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create config file
    const config = {
      dataDir,
      schemasDir,
      port,
      admin: {
        username,
        passwordHash
      },
      permissions: {
        'about.json': 'public',
        'menu.json': 'admin'
      }
    };

    const configPath = './litejson.config.json';
    
    if (fs.existsSync(configPath)) {
      console.log('⚠️  Config file already exists. Skipping config creation.');
    } else {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('✅ Created litejson.config.json');
    }

    // Create directories
    const dirs = [dataDir, schemasDir, '.history'];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    }

    // Create sample data file
    const sampleDataPath = path.join(dataDir, 'about.json');
    if (!fs.existsSync(sampleDataPath)) {
      const sampleData = {
        title: 'About Us',
        description: 'This is a sample about page',
        version: '1.0.0'
      };
      fs.writeFileSync(sampleDataPath, JSON.stringify(sampleData, null, 2));
      console.log('✅ Created sample data file: about.json');
    }

    // Create sample schema file
    const sampleSchemaPath = path.join(schemasDir, 'about.json');
    if (!fs.existsSync(sampleSchemaPath)) {
      const sampleSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          version: { type: 'string' }
        },
        required: ['title', 'description']
      };
      fs.writeFileSync(sampleSchemaPath, JSON.stringify(sampleSchema, null, 2));
      console.log('✅ Created sample schema file: about.json');
    }

    console.log('\n🎉 LiteJSON initialized successfully!');
    console.log(`📁 Data directory: ${dataDir}`);
    console.log(`📁 Schemas directory: ${schemasDir}`);
    console.log(`🔐 Admin username: ${username}`);
    console.log(`🔐 Admin password: ${password}`);
    console.log(`🌐 Server will run on port: ${port}`);
    console.log('\nTo start the server, run: npm run dev');
  }

  async hashPassword(password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password hash: ${hash}`);
  }

  validateConfig(): void {
    try {
      const config = this.configLoader.load();
      console.log('✅ Configuration is valid');
      console.log(`📁 Data directory: ${config.dataDir}`);
      console.log(`📁 Schemas directory: ${config.schemasDir}`);
      console.log(`🌐 Port: ${config.port}`);
      console.log(`👤 Admin user: ${config.admin.username}`);
    } catch (error) {
      console.error('❌ Configuration error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}

// CLI entry point
async function main() {
  const cli = new CLI();
  const command = process.argv[2];

  switch (command) {
    case 'init':
      const options: InitOptions = {};
      
      // Parse command line options
      for (let i = 3; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith('--username=')) {
          options.username = arg.split('=')[1];
        } else if (arg.startsWith('--password=')) {
          options.password = arg.split('=')[1];
        } else if (arg.startsWith('--port=')) {
          options.port = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--data-dir=')) {
          options.dataDir = arg.split('=')[1];
        } else if (arg.startsWith('--schemas-dir=')) {
          options.schemasDir = arg.split('=')[1];
        }
      }
      
      await cli.init(options);
      break;

    case 'hash':
      const password = process.argv[3];
      if (!password) {
        console.error('❌ Password required: litejson hash <password>');
        process.exit(1);
      }
      await cli.hashPassword(password);
      break;

    case 'validate':
      cli.validateConfig();
      break;

    default:
      console.log('LiteJSON CLI');
      console.log('');
      console.log('Usage:');
      console.log('  litejson init [options]     Initialize a new LiteJSON project');
      console.log('  litejson hash <password>    Hash a password for config');
      console.log('  litejson validate           Validate configuration');
      console.log('');
      console.log('Init options:');
      console.log('  --username=<name>           Admin username (default: admin)');
      console.log('  --password=<pass>           Admin password (default: admin123)');
      console.log('  --port=<number>             Server port (default: 3000)');
      console.log('  --data-dir=<path>           Data directory (default: ./data)');
      console.log('  --schemas-dir=<path>        Schemas directory (default: ./schemas)');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
} 