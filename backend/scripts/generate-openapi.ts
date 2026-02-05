/**
 * Script to generate OpenAPI spec from JSDoc comments
 */

import fs from 'fs';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import yaml from 'js-yaml';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FindClass NZ API',
      version: '1.0.0',
      description: `
# FindClass NZ - Course Search Platform Backend API

## Authentication

All protected endpoints require a JWT access token in the Authorization header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Rate Limiting

- Auth endpoints: 3 requests/minute per email
- General API: 100 requests/minute
- Burst: 10 requests/second

## Security

- Passwords must be at least 12 characters with uppercase, lowercase, number, and special character
- Verification codes are cryptographically secure (6 digits)
- User enumeration is prevented in password reset endpoints
      `,
      contact: {
        name: 'FindClass NZ',
        email: 'support@findclass.nz',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.findclass.nz/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization header. Example: Bearer <token>',
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
    ],
  },
  apis: ['./src/modules/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

const outputDir = path.join(__dirname, '../docs/api');
const outputJsonFile = path.join(outputDir, 'openapi.json');
const outputYamlFile = path.join(outputDir, 'openapi.yaml');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write OpenAPI spec to JSON file
fs.writeFileSync(outputJsonFile, JSON.stringify(swaggerSpec, null, 2));
console.log(`OpenAPI spec generated at: ${outputJsonFile}`);

// Write OpenAPI spec to YAML file
fs.writeFileSync(outputYamlFile, yaml.dump(swaggerSpec));
console.log(`OpenAPI YAML generated at: ${outputYamlFile}`);
