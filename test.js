const { ConfigLoader } = require('./dist/core/config');
const { FileManager } = require('./dist/core/fileManager');
const { AuthManager } = require('./dist/core/auth');
const { SchemaValidator } = require('./dist/core/schema');

console.log('Testing LiteJSON core modules...');

// Test config loader
try {
  const configLoader = new ConfigLoader();
  const config = configLoader.load();
  console.log('✅ Config loader works');
} catch (error) {
  console.log('❌ Config loader failed:', error.message);
}

console.log('Test completed'); 