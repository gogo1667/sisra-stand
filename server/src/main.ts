import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Enable very permissive CORS for local development
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true, // reflect origin (http://localhost:5173, 5174, etc.)
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    },
  });

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
