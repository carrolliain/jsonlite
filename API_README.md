# LiteJSON API Documentation

A lightweight, self-hosted JSON backend for static sites. This API allows you to read, write, and manage JSON files with optional schema validation and authentication.

## 🚀 Quick Start

### Base URL
```
http://localhost:3000
```

### Authentication
Most endpoints require authentication. Login first to get a session:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt
```

Use the returned session cookie for subsequent requests. The server uses session-based authentication with cookies.

---

## 📁 File Operations

### List All Files
```bash
GET /api/files
```

**Response:**
```json
{
  "files": ["about", "menu", "config"]
}
```

### Read a File
```bash
GET /api/file/:filename
```

**Example:**
```bash
curl http://localhost:3000/api/file/about
```

**Response:**
```json
{
  "title": "About Us",
  "description": "This is a sample about page",
  "version": "1.0.0"
}
```

### Create/Replace a File
```bash
POST /api/file/:filename
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/file/about \
  -H "Content-Type: application/json" \
  -d '{"data":{"title":"New Title","description":"Updated content"}}' \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "New Title",
    "description": "Updated content"
  }
}
```

### Update a File (Partial)
```bash
PATCH /api/file/:filename
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/file/about \
  -H "Content-Type: application/json" \
  -d '{"data":{"title":"Updated Title"}}' \
  -b cookies.txt
```

### Replace a File
```bash
PUT /api/file/:filename
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/file/about \
  -H "Content-Type: application/json" \
  -d '{"data":{"title":"Complete Replacement","content":"New content"}}' \
  -b cookies.txt
```

### Delete a File
```bash
DELETE /api/file/:filename
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/file/about \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true
}
```

---

## 🔐 Authentication

### Login
```bash
POST /api/auth/login
```

**Request:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "sessionId": "abc123def456"
}
```

### Logout
```bash
POST /api/auth/logout
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### Check Auth Status
```bash
GET /api/auth/status
```

**Response:**
```json
{
  "authenticated": true
}
```

---

## 📋 Schema Validation

LiteJSON supports optional JSON Schema validation. If a schema file exists in `/schemas/` with the same name as your data file, validation will be performed automatically.

### Schema File Example
Create `schemas/about.json`:
```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "description": { "type": "string" },
    "version": { "type": "string" }
  },
  "required": ["title", "description"]
}
```

### Validation Error Response
If validation fails:
```json
{
  "error": "Validation failed",
  "details": [
    " description is required",
    " title must be string"
  ]
}
```

---

## 🗂️ Schema Management

### List All Schemas
```bash
GET /api/schemas
```

**Response:**
```json
{
  "schemas": ["about", "menu", "config"]
}
```

### Get a Schema
```bash
GET /api/schema/:filename
```

**Example:**
```bash
curl http://localhost:3000/api/schema/about.json
```

### Create/Update a Schema
```bash
POST /api/schema/:filename
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/schema/about.json \
  -H "Content-Type: application/json" \
  -d '{"schema":{"type":"object","properties":{"title":{"type":"string"}}}}' \
  -b cookies.txt
```

**Note:** The schema is automatically reloaded after creation/update, so validation will work immediately.

### Delete a Schema
```bash
DELETE /api/schema/:filename
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/schema/about.json \
  -b cookies.txt
```

---

## 🌐 Public Access

Some files can be accessed publicly without authentication:

### Public File Access
```bash
GET /data/:filename
```

**Example:**
```bash
curl http://localhost:3000/data/about
```

---

## 📊 Health Check

### Server Status
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-30T11:26:28.428Z",
  "version": "1.0.0"
}
```

---

## 🔧 API Information

### Get API Documentation
```bash
GET /
```

**Response:**
```json
{
  "name": "LiteJSON",
  "version": "1.0.0",
  "description": "A lightweight, self-hosted, JSON-based backend for static sites",
  "endpoints": {
    "GET /data/:filename": "Public read access to JSON files",
    "GET /api/file/:filename": "API read access to JSON files",
    "POST /api/file/:filename": "Create or replace JSON file (requires auth)",
    "PUT /api/file/:filename": "Replace JSON file (requires auth)",
    "PATCH /api/file/:filename": "Partially update JSON file (requires auth)",
    "DELETE /api/file/:filename": "Delete JSON file (requires auth)",
    "GET /api/files": "List all available files",
    "POST /api/auth/login": "Login with username/password",
    "POST /api/auth/logout": "Logout and invalidate session",
    "GET /api/auth/status": "Check authentication status",
    "GET /api/schema/:filename": "Get JSON schema",
    "POST /api/schema/:filename": "Create or update schema (requires auth)",
    "DELETE /api/schema/:filename": "Delete schema (requires auth)",
    "GET /api/schemas": "List all available schemas",
    "GET /health": "Health check endpoint"
  }
}
```

---

## 📝 Usage Examples

### Complete Workflow Example

1. **Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt
```

2. **Create a schema:**
```bash
curl -X POST http://localhost:3000/api/schema/user.json \
  -H "Content-Type: application/json" \
  -d '{"schema":{"type":"object","properties":{"name":{"type":"string"},"email":{"type":"string","format":"email"}},"required":["name","email"]}}' \
  -b cookies.txt
```

3. **Create data with validation:**
```bash
curl -X POST http://localhost:3000/api/file/user.json \
  -H "Content-Type: application/json" \
  -d '{"data":{"name":"John Doe","email":"john@example.com"}}' \
  -b cookies.txt
```

4. **Read the data:**
```bash
curl http://localhost:3000/api/file/user.json
```

5. **Update the data:**
```bash
curl -X PATCH http://localhost:3000/api/file/user.json \
  -H "Content-Type: application/json" \
  -d '{"data":{"name":"Jane Doe"}}' \
  -b cookies.txt
```

---

## ⚠️ Error Responses

### Common Error Codes

**400 Bad Request**
- Missing required data
- Validation errors
- Invalid JSON

**401 Unauthorized**
- Missing authentication
- Invalid credentials
- Expired session

**404 Not Found**
- File doesn't exist
- Schema doesn't exist

**500 Internal Server Error**
- File system errors
- Server configuration issues

### Error Response Format
```json
{
  "error": "Error description",
  "details": ["Additional error details"]
}
```

---

## 🔒 Security Notes

- **Authentication**: Most endpoints require valid session
- **Input Sanitization**: Filenames are sanitized to prevent path traversal
- **Schema Validation**: Optional but recommended for data integrity
- **Session Management**: Sessions expire after 24 hours
- **File Backups**: Automatic backups created before modifications
- **File Extensions**: The API automatically handles .json extensions for consistency

---

## 🚀 Integration Tips

### Frontend Integration
```javascript
// Login
const login = async (username, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  });
  return response.json();
};

// Read file
const readFile = async (filename) => {
  const response = await fetch(`/api/file/${filename}`, {
    credentials: 'include'
  });
  return response.json();
};

// Write file
const writeFile = async (filename, data) => {
  const response = await fetch(`/api/file/${filename}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ data })
  });
  return response.json();
};

// Note: Always include .json extension in filenames for consistency
```

### cURL Examples
```bash
# With session cookie
curl -b cookies.txt http://localhost:3000/api/files

# Note: This API uses session-based authentication with cookies, not Bearer tokens
```

---

## 📚 Additional Resources

- **Configuration**: See `litejson.config.json` for server settings
- **Schema Documentation**: [JSON Schema](https://json-schema.org/)
- **Ajv Documentation**: [Ajv Validator](https://ajv.js.org/)

---

*LiteJSON - Keep it lean. Keep it local.* 