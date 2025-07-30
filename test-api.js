const http = require('http');

class LiteJSONTester {
  constructor(host = 'localhost', port = 3000) {
    this.host = host;
    this.port = port;
    this.cookies = '';
    this.testResults = [];
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.cookies) {
        options.headers.Cookie = this.cookies;
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonBody
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
  }

  async test(name, testFn) {
    try {
      this.log(`🧪 Testing: ${name}`);
      const result = await testFn();
      this.testResults.push({ name, success: true, result });
      this.log(`✅ PASS: ${name}`, 'PASS');
      return result;
    } catch (error) {
      this.testResults.push({ name, success: false, error: error.message });
      this.log(`❌ FAIL: ${name} - ${error.message}`, 'FAIL');
      throw error;
    }
  }

  async runTests() {
    this.log('🚀 Starting LiteJSON API Tests');
    this.log('================================');

    try {
      // 1. Health Check
      await this.test('Health Check', async () => {
        const response = await this.makeRequest('GET', '/health');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!response.body.status || response.body.status !== 'ok') throw new Error('Invalid health response');
        return response.body;
      });

      // 2. API Documentation
      await this.test('API Documentation', async () => {
        const response = await this.makeRequest('GET', '/');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!response.body.name || response.body.name !== 'LiteJSON') throw new Error('Invalid API response');
        return response.body;
      });

      // 3. Authentication Tests
      await this.test('Login', async () => {
        const response = await this.makeRequest('POST', '/api/auth/login', {
          username: 'admin',
          password: 'password'
        });
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!response.body.success) throw new Error('Login failed');
        
        // Extract cookies
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          this.cookies = setCookie[0].split(';')[0];
        }
        return response.body;
      });

      await this.test('Auth Status', async () => {
        const response = await this.makeRequest('GET', '/api/auth/status');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      // 4. Schema Management Tests
      await this.test('List Schemas (empty)', async () => {
        const response = await this.makeRequest('GET', '/api/schemas');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('Create Schema', async () => {
        const response = await this.makeRequest('POST', '/api/schema/test.json', {
          schema: {
            type: 'object',
            required: ['title', 'content'],
            properties: {
              title: { type: 'string' },
              content: { type: 'string' }
            }
          }
        });
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('List Schemas (with data)', async () => {
        const response = await this.makeRequest('GET', '/api/schemas');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!response.body.schemas.includes('test')) throw new Error('Schema not found in list');
        return response.body;
      });

      await this.test('Get Schema', async () => {
        const response = await this.makeRequest('GET', '/api/schema/test.json');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!response.body.type || response.body.type !== 'object') throw new Error('Invalid schema');
        return response.body;
      });

      // 5. File Operations Tests
      await this.test('List Files (empty)', async () => {
        const response = await this.makeRequest('GET', '/api/files');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('Create File (no schema)', async () => {
        const response = await this.makeRequest('POST', '/api/file/test.json', {
          data: { title: 'Test File', content: 'Test content' }
        });
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('Read File', async () => {
        const response = await this.makeRequest('GET', '/api/file/test.json');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!response.body.title || response.body.title !== 'Test File') throw new Error('Invalid file content');
        return response.body;
      });

      await this.test('Update File (PUT)', async () => {
        const response = await this.makeRequest('PUT', '/api/file/test.json', {
          data: { title: 'Updated File', content: 'Updated content' }
        });
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('Partial Update File (PATCH)', async () => {
        const response = await this.makeRequest('PATCH', '/api/file/test.json', {
          data: { title: 'Patched File' }
        });
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      // 6. Schema Validation Tests
      await this.test('Create File with Schema (valid)', async () => {
        const response = await this.makeRequest('POST', '/api/file/test.json', {
          data: { title: 'Valid Title', content: 'Valid content' }
        });
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('Create File with Schema (invalid)', async () => {
        const response = await this.makeRequest('POST', '/api/file/test.json', {
          data: { title: 'Missing content' }
        });
        if (response.statusCode !== 400) throw new Error(`Expected 400, got ${response.statusCode}`);
        if (!response.body.error || !response.body.error.includes('Validation failed')) {
          throw new Error('Expected validation error');
        }
        return response.body;
      });

      // 7. Public Data Access Tests
      await this.test('Public Read Access', async () => {
        const response = await this.makeRequest('GET', '/data/test.json');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      // 8. Cleanup Tests
      await this.test('Delete File', async () => {
        const response = await this.makeRequest('DELETE', '/api/file/test.json');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('Delete Schema', async () => {
        const response = await this.makeRequest('DELETE', '/api/schema/test.json');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      await this.test('Logout', async () => {
        const response = await this.makeRequest('POST', '/api/auth/logout');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        return response.body;
      });

      // 9. Verify Cleanup
      await this.test('Verify Files Cleaned', async () => {
        const response = await this.makeRequest('GET', '/api/files');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (response.body.files.includes('test')) throw new Error('File still exists after cleanup');
        return response.body;
      });

      await this.test('Verify Schemas Cleaned', async () => {
        const response = await this.makeRequest('GET', '/api/schemas');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (response.body.schemas.includes('test')) throw new Error('Schema still exists after cleanup');
        return response.body;
      });

    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  printResults() {
    this.log('📊 Test Results Summary');
    this.log('=======================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;

    this.log(`Total Tests: ${total}`);
    this.log(`Passed: ${passed}`);
    this.log(`Failed: ${failed}`);
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      this.log('\n❌ Failed Tests:');
      this.testResults.filter(r => !r.success).forEach(test => {
        this.log(`  - ${test.name}: ${test.error}`, 'FAIL');
      });
    }

    if (passed === total) {
      this.log('\n🎉 All tests passed! LiteJSON API is working correctly.');
    } else {
      this.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
  }
}

// Run the tests
async function main() {
  const tester = new LiteJSONTester();
  
  try {
    await tester.runTests();
    tester.printResults();
  } catch (error) {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LiteJSONTester; 