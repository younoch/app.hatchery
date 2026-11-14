import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ORG_PERMISSION_DESCRIPTIONS } from '@/common/permissions/permission.constants';
import { ORG_PERMISSION_ENUM_NAME } from '@/common/swagger/constraints';

// One definition for the running server (/api, /api-json) and `pnpm swagger:export`.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Hatchery API')
    .setDescription('Water-quality backend for hatcheries')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
      },
      'access-token',
    )
    .addCookieAuth(
      'refresh_token',
      { type: 'apiKey', in: 'cookie' },
      'refresh-cookie',
    )
    .setExternalDoc('OpenAPI JSON', '/api-json')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  describeOrgPermissionKeys(document);
  return document;
}

// Adds a description for every key to the shared OrgPermissionKey schema.
function describeOrgPermissionKeys(document: OpenAPIObject) {
  const schema = document.components?.schemas?.[ORG_PERMISSION_ENUM_NAME];
  if (!schema || '$ref' in schema) return;
  Object.assign(schema, {
    description: Object.entries(ORG_PERMISSION_DESCRIPTIONS)
      .map(([key, text]) => `- \`${key}\`: ${text}`)
      .join('\n'),
    'x-enumDescriptions': ORG_PERMISSION_DESCRIPTIONS,
  });
}

export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('api', app, buildOpenApiDocument(app), {
    swaggerOptions: { persistAuthorization: true },
  });
}
