import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with dynamic origin
  const allowedOrigins = [
    'http://localhost:3000',
    'https://ticketer-app-staging.vercel.app/',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      console.log('Request Origin:', origin); // Debug
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin || '*'); // Return the request's origin or '*' if no origin
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-Requested-With,x-client-page',
    credentials: true,
  });

  // Explicitly handle OPTIONS requests (optional, for robustness)
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request for:', req.url); // Debug
      const origin = req.headers.origin;
      if (!origin || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type,Authorization,X-Requested-With,x-client-page',
        );
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.status(204).send();
        return;
      }
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Ticketer API')
    .setDescription('API docs for Ticketer platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Ticketer API Docs',
    customfavIcon: 'https://avatars.githubusercontent.com/u/6936373?s=200&v=4',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
    ],
  });

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}

bootstrap().catch((err) => console.error('Bootstrap error:', err));
