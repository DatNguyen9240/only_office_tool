import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

function validateEnv(config: ConfigService): void {
  const requiredConfigs = [
    "ONLYOFFICE_SERVER_URL",
    "ONLYOFFICE_JWT_SECRET",
    "API_PUBLIC_URL",
  ];
  for (const key of requiredConfigs) {
    if (!config.get<string>(key)) {
      throw new Error(
        `[FATAL CONFIG ERROR] Missing required environment variable: ${key}`,
      );
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  validateEnv(config);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: config.get<string>("WEB_APP_URL", "http://localhost:5173"),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>("PORT", 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Meridian DMS API listening on http://localhost:${port}/api`);
}

void bootstrap();

