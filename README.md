<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Object storage

Object storage (`src/storage/`) is accessed via `@aws-sdk/client-s3`, configured entirely through the `STORAGE_*` env vars in `storage.config.ts` — so the same code targets [MinIO](https://min.io) locally and [Cloudflare R2](https://developers.cloudflare.com/r2/) in production, no code changes needed between environments.

`StorageService` (injectable anywhere, exported globally by `StorageModule`) exposes `uploadFile`, `deleteFile`, `getPresignedUploadUrl`, `getPresignedDownloadUrl`, and `listFiles`.

### Local development (MinIO)

```bash
# copy env defaults
$ cp .env.example .env

# start MinIO (and auto-create the default bucket)
$ docker compose up -d
```

- API: http://localhost:9000
- Console: http://localhost:9001 (login with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from `.env`)

### Production (Cloudflare R2)

1. In the Cloudflare dashboard, go to **R2 Object Storage** → create a bucket (e.g. `colour-balloon`).
2. Under **R2 → Manage API tokens**, create an API token scoped to that bucket (Object Read & Write is enough — avoid account-wide tokens). Save the **Access Key ID** and **Secret Access Key** shown once.
3. Note your **Account ID** (Cloudflare dashboard sidebar, or the R2 overview page).
4. Set these env vars wherever the backend actually runs in production (host/platform secrets manager — do **not** commit them):

   ```bash
   STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   STORAGE_REGION=auto
   STORAGE_ACCESS_KEY_ID=<r2 access key id>
   STORAGE_SECRET_ACCESS_KEY=<r2 secret access key>
   STORAGE_BUCKET=colour-balloon
   STORAGE_FORCE_PATH_STYLE=false
   CORS_ORIGIN=https://<your-production-frontend-domain>
   ```

Notes:
- `STORAGE_FORCE_PATH_STYLE=false` is required for R2's virtual-hosted-style URLs (MinIO needs `true`, which is the local default).
- Presigned URLs point directly at `STORAGE_ENDPOINT`, so the R2 bucket must allow public reads for those URLs to load in a browser, or you should put a [custom domain / R2.dev public bucket](https://developers.cloudflare.com/r2/buckets/public-buckets/) in front and adjust `getPresignedDownloadUrl` accordingly if you want CDN caching instead of presigned reads.
- R2 free tier has no egress fees, which is the main reason to prefer it over S3 here.

### Alternative: DigitalOcean Spaces

Also S3-compatible, so it's the same `STORAGE_*` env vars, no code changes:

1. In the DigitalOcean control panel, go to **Spaces Object Storage** → create a Space, picking a region (e.g. `nyc3`, `ams3`, `sgp1`, `fra1`, `sfo3`).
2. Go to **API → Spaces Keys** → generate a new key pair. Note: unlike R2, Spaces keys are account-wide, not scoped to a single bucket — there's no way to restrict a key to just this Space.
3. Set:

   ```bash
   STORAGE_ENDPOINT=https://<region>.digitaloceanspaces.com
   STORAGE_REGION=<region>
   STORAGE_ACCESS_KEY_ID=<spaces access key>
   STORAGE_SECRET_ACCESS_KEY=<spaces secret key>
   STORAGE_BUCKET=<your space name>
   STORAGE_FORCE_PATH_STYLE=false
   ```

- Same public-read caveat as R2 applies to presigned URLs. Spaces also has a built-in CDN endpoint (`<bucket>.<region>.cdn.digitaloceanspaces.com`) if you'd rather serve public files through that instead of presigned URLs.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
