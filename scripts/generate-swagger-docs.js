#!/usr/bin/env node

/**
 * Swagger Documentation Generator Script
 * 
 * This script helps developers quickly generate Swagger documentation
 * templates for new modules/routes.
 * 
 * Usage: node scripts/generate-swagger-docs.js <module-name>
 */

const fs = require('fs');
const path = require('path');

const moduleNameArg = process.argv[2];

if (!moduleNameArg) {
    console.error('❌ Please provide a module name');
    console.log('Usage: node scripts/generate-swagger-docs.js <module-name>');
    process.exit(1);
}

const moduleName = moduleNameArg.toLowerCase();
const ModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

// Generate Swagger documentation template
const generateSwaggerTemplate = (moduleName, ModuleName) => {
    return `/**
 * Swagger Documentation for ${ModuleName} Module
 * 
 * Add these comments above your route definitions in ${moduleName}.routes.ts
 */

/**
 * @swagger
 * /api/v1/${moduleName}:
 *   get:
 *     summary: Get all ${moduleName}s
 *     description: Retrieve a paginated list of ${moduleName}s
 *     tags: [${ModuleName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: ${ModuleName}s retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/v1/${moduleName}:
 *   post:
 *     summary: Create a new ${moduleName}
 *     description: Create a new ${moduleName} in the system
 *     tags: [${ModuleName}]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Create${ModuleName}'
 *     responses:
 *       201:
 *         description: ${ModuleName} created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${ModuleName} created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/${ModuleName}'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/v1/${moduleName}/{id}:
 *   get:
 *     summary: Get ${moduleName} by ID
 *     description: Retrieve a specific ${moduleName} by its ID
 *     tags: [${ModuleName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${ModuleName} ID
 *     responses:
 *       200:
 *         description: ${ModuleName} retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${ModuleName} retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/${ModuleName}'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/v1/${moduleName}/{id}:
 *   put:
 *     summary: Update ${moduleName}
 *     description: Update an existing ${moduleName} by its ID
 *     tags: [${ModuleName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${ModuleName} ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Update${ModuleName}'
 *     responses:
 *       200:
 *         description: ${ModuleName} updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${ModuleName} updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/${ModuleName}'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/v1/${moduleName}/{id}:
 *   delete:
 *     summary: Delete ${moduleName}
 *     description: Delete an existing ${moduleName} by its ID
 *     tags: [${ModuleName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${ModuleName} ID
 *     responses:
 *       200:
 *         description: ${ModuleName} deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${ModuleName} deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// Don't forget to add your schemas to src/config/swagger.ts:
/*
${ModuleName}: {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clxxx123456789' },
    name: { type: 'string', example: '${ModuleName} Name' },
    description: { type: 'string', example: '${ModuleName} description' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'createdAt', 'updatedAt'],
},
Create${ModuleName}: {
  type: 'object',
  properties: {
    name: { type: 'string', example: '${ModuleName} Name' },
    description: { type: 'string', example: '${ModuleName} description' },
  },
  required: ['name'],
},
Update${ModuleName}: {
  type: 'object',
  properties: {
    name: { type: 'string', example: '${ModuleName} Name' },
    description: { type: 'string', example: '${ModuleName} description' },
  },
},
*/`;
};

// Generate schema template
const generateSchemaTemplate = (moduleName, ModuleName) => {
    return `
// Add these schemas to the components.schemas section in src/config/swagger.ts

${ModuleName}: {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clxxx123456789' },
    name: { type: 'string', example: '${ModuleName} Name' },
    description: { type: 'string', example: '${ModuleName} description' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'createdAt', 'updatedAt'],
},
Create${ModuleName}: {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100, example: '${ModuleName} Name' },
    description: { type: 'string', maxLength: 500, example: '${ModuleName} description' },
  },
  required: ['name'],
},
Update${ModuleName}: {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100, example: '${ModuleName} Name' },
    description: { type: 'string', maxLength: 500, example: '${ModuleName} description' },
  },
},`;
};

// Create output directory
const outputDir = path.join(__dirname, '..', 'docs', 'swagger-templates');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Write files
const swaggerTemplate = generateSwaggerTemplate(moduleName, ModuleName);
const schemaTemplate = generateSchemaTemplate(moduleName, ModuleName);

fs.writeFileSync(
    path.join(outputDir, `${moduleName}-routes-swagger.js`),
    swaggerTemplate
);

fs.writeFileSync(
    path.join(outputDir, `${moduleName}-schemas.js`),
    schemaTemplate
);

console.log('✅ Swagger documentation templates generated successfully!');
console.log(`📁 Location: docs/swagger-templates/`);
console.log(`📝 Route docs: ${moduleName}-routes-swagger.js`);
console.log(`📋 Schemas: ${moduleName}-schemas.js`);
console.log('');
console.log('🚀 Next steps:');
console.log(`1. Copy the route documentation to src/modules/${moduleName}/${moduleName}.routes.ts`);
console.log(`2. Copy the schemas to src/config/swagger.ts`);
console.log(`3. Update the schemas according to your actual data model`);
console.log(`4. Add the tag "${ModuleName}" to the tags array in swagger.ts`);
console.log('5. Restart your development server to see the new documentation');
