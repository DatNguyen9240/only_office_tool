# Meridian DMS API

NestJS backend foundation for the Meridian DMS frontend.

## Local setup

1. Copy `.env.example` to `.env` and set the local PostgreSQL and ONLYOFFICE
   values.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate the Prisma client:

   ```bash
   npm run prisma:generate
   ```

4. Create the first database migration:

   ```bash
   npm run prisma:migrate
   ```

5. Start the API:

   ```bash
   npm run start:dev
   ```

Health endpoints:

```text
GET http://localhost:3000/api/health
GET http://localhost:3000/api/health/database
GET http://localhost:3000/api/health/onlyoffice
```

They report PostgreSQL and ONLYOFFICE independently. A dependency that is not
running is reported as `down` without preventing the API from starting.
