const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Tournament Platform API',
    version: '1.0.0',
    description: 'API documentation for the Tournament Platform project.',
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/presentation/api/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

console.log(JSON.stringify(swaggerSpec, null, 2));
