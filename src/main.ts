/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable prettier/prettier */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //  Add global validation and class-transformer support
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // enable class-transformer to use @Exclude/@Expose
      whitelist: true, // remove fields not in DTO
      forbidNonWhitelisted: true, // throw error if unknown fields are sent
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Clinic Management API')
    .setDescription('API for managing users, patients, appointments, etc.')
    .setVersion('1.0')
    .addTag('auth')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
