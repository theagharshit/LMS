export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Sikshya LMS API',
    version: '2.0.0',
    description: 'Authenticated APIs for the Sikshya school learning platform.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      Problem: {
        type: 'object',
        required: ['type', 'title', 'status', 'detail', 'instance'],
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'integer' },
          detail: { type: 'string' },
          instance: { type: 'string' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { summary: 'Health check', responses: { '200': { description: 'Healthy' } } },
    },
    '/auth/login': {
      post: {
        summary: 'Create a user session',
        responses: {
          '200': { description: 'Authenticated' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: { summary: 'Rotate a refresh token', responses: { '200': { description: 'Rotated' } } },
    },
    '/db/state': {
      get: {
        summary: 'Retrieve the LMS state',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'State snapshot' } },
      },
    },
    '/db/search': {
      get: {
        summary: 'Search users and classrooms',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Search results' } },
      },
    },
    '/system/db-health': {
      get: {
        summary: 'Check relational integrity',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Integrity report' } },
      },
    },
  },
} as const;
