import swaggerJsdoc from 'swagger-jsdoc';
import { authSchemas } from './shared-schemas';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FindClass NZ API',
      version: '1.0.0',
      description: `
# FindClass NZ - Course Search Platform Backend API

## Authentication
All protected endpoints require a JWT access token:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Rate Limiting
- Auth endpoints: 3 requests/minute per email
- General API: 100 requests/minute
- Burst: 10 requests/second

## Security
- Passwords: min 12 chars with uppercase, lowercase, number, special char
- Verification codes: cryptographically secure (6 digits)
- User enumeration is prevented in password reset endpoints
      `,
      contact: { name: 'FindClass NZ', email: 'support@findclass.nz' },
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Development server' },
      { url: 'https://api.findclass.nz/api/v1', description: 'Production server' },
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
      schemas: authSchemas,
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization endpoints' },
    ],
  },
  apis: ['./src/modules/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
