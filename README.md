# SevaFlow AI

**From complaint to action.**

SevaFlow is a civic issue reporting and operations interface. It turns an unstructured resident complaint into a structured service request with a category, priority, confidence score, evidence, responsible department, summary, and suggested action.

The application supports text descriptions, browser voice recordings, and multiple image attachments. It includes a citizen reporting experience and an operations command center with persistent reports, aggregate metrics, category distribution, priority filtering, and hotspot-oriented reporting.

> **Current baseline:** The SevaFlow UI and platform backend are frozen and working. The platform backend remains the default. The AWS backend is prepared but has not been deployed.

## Live demo

A temporary production build is currently available at:

<https://4173-iwkmij15xjtq99owujcve-18852ebe.sg2.manus.computer/>

This is a temporary sandbox URL. It is not a permanent custom-domain deployment.

## Features

### Citizen reporting

The report form accepts a meaningful text description and a location. Users can structure the report before submitting it, review the generated assessment, and edit the description before persistence.

The interface also supports:

- Multiple image uploads in one selection or across repeated selections.
- Image previews and individual image removal.
- Multiple browser voice recordings.
- Recording indicators, elapsed timers, replay controls, and individual voice-note removal.
- Transcript insertion into the editable description.
- Additive voice input that does not replace existing typed text.

### Issue intelligence

The assessment response includes:

- Issue category and short category.
- Priority level: `High`, `Medium`, or `Low`.
- Confidence percentage.
- Responsible department.
- Human-readable summary.
- Evidence extracted from the complaint.
- Suggested next action.

The assessment is assistive. It is shown with confidence and evidence so that a person can review the result before submission.

### Operations command center

The command center reads persisted reports and displays recent requests, priority counts, open and resolved totals, category distribution, and repeated category/location patterns that can indicate an emerging hotspot.

The report list supports search and priority filtering. Status values include `New`, `Assigned`, `In progress`, and `Resolved`.

## Architecture

The current application uses a React frontend, a Node.js and Express server, tRPC procedures, Drizzle ORM, and the configured project database and storage services.

```text
Browser
  ├── Text description
  ├── Image attachments
  └── Voice recordings
          │
          ▼
      React UI
          │
          ▼
       tRPC API
          │
    ┌─────┴─────────────┐
    ▼                   ▼
Issue assessment     Persistence
    │                   │
    ▼                   ▼
Structured report   Database + storage
          │
          ▼
 Operations command center
```

### Main application locations

| Area | Location | Responsibility |
|---|---|---|
| Main page | `client/src/pages/Home.tsx` | Citizen report view, command center, attachment interactions, and submission flow. |
| Global styling | `client/src/index.css` | SevaFlow colors, typography, spacing, surfaces, and motion. |
| tRPC client | `client/src/lib/trpc.ts` | Typed frontend access to server procedures. |
| Backend mode | `client/src/lib/backend-config.ts` | Frontend `platform` or `aws` mode selection. |
| API router | `server/routers.ts` | Assessment, report, dashboard, media, and voice procedures. |
| Database helpers | `server/db.ts` | Report persistence, retrieval, and dashboard aggregation. |
| Schema | `drizzle/schema.ts` | Users, reports, issue clusters, and attachment storage contract. |
| Voice transcription | `server/_core/voiceTranscription.ts` | Audio validation, MIME normalization, storage, and transcription request handling. |
| AWS deployment | `aws/` | SAM template, Lambda handler, preflight script, and AWS deployment documentation. |

## Text workflow

1. The user enters a description and location.
2. The frontend calls `reports.analyze`.
3. The server produces a structured assessment.
4. The UI presents the category, priority, confidence, evidence, department, summary, and suggested action.
5. The user reviews the result.
6. The frontend calls `reports.create`.
7. The report and attachment metadata are persisted.
8. Report and dashboard queries are refreshed.

## Voice workflow

1. The user selects **Voice**.
2. The browser requests microphone permission.
3. `MediaRecorder` captures a supported audio format.
4. The UI shows the recording state and timer.
5. Selecting Voice again stops the recording.
6. The recording remains available for replay.
7. The client sends the audio data URL to `voice.transcribe`.
8. The server validates the size and MIME type, then normalizes codec-qualified data URLs.
9. The audio is stored through the configured storage helper.
10. The original captured bytes are sent to the configured transcription service.
11. The transcript is appended to the description.
12. The user may edit the transcript before structuring the report.

The current platform voice path is synchronous. The prepared AWS path includes asynchronous Amazon Transcribe routes, but frontend polling is intentionally not connected until AWS deployment and acceptance testing are complete.

## Image and attachment workflow

The photo input accepts multiple files and can be used repeatedly. Each image receives a local preview, a stable client identifier, and an individual removal action.

When the report is submitted through the platform backend:

1. Each image is converted to a data URL.
2. The image is uploaded through `media.upload`.
3. The returned storage reference is added to the report attachment array.
4. The report is persisted with the attachment metadata.

The persisted attachment contract is an array of objects containing the media type, storage key, MIME type, upload timestamp, and optional transcription reference.

## Server procedures

The current tRPC API includes these report procedures:

| Procedure | Type | Purpose |
|---|---|---|
| `reports.analyze` | Mutation | Produces structured issue intelligence from a description and location. |
| `reports.create` | Mutation | Persists a reviewed report and its assessment. |
| `reports.list` | Query | Reads recent reports. |
| `reports.getById` | Query | Reads one report by ID. |
| `reports.dashboard` | Query | Returns dashboard aggregates. |
| `media.upload` | Mutation | Stores an image or media data URL and returns a storage reference. |
| `voice.transcribe` | Mutation | Stores a browser recording, sends it to transcription, and returns the transcript. |

## Data model

The project uses Drizzle ORM with a MySQL-compatible database. The principal tables are:

- `users` for authentication-backed user records.
- `reports` for structured service requests and persisted attachment arrays.
- `issueClusters` for hotspot-ready category and location grouping.

Business timestamps are stored in UTC-compatible database fields and converted for local display in the frontend.

## Technology stack

- React 19 and TypeScript.
- Vite 7 for frontend bundling.
- Tailwind CSS 4 and shadcn-style UI components.
- Express 4 for the application server.
- tRPC 11 for typed API contracts.
- Drizzle ORM and MySQL/TiDB-compatible persistence.
- Lucide React icons.
- Vitest for automated tests.
- Amazon Bedrock, S3, DynamoDB, API Gateway, Lambda, and Transcribe in the prepared AWS deployment layer.

## Getting started

### Requirements

Install the following tools before running the project locally:

- Node.js 22 or a compatible current Node.js runtime.
- pnpm.
- Access to the configured project environment when using the database, authentication, storage, or built-in AI services.

### Install dependencies

```bash
pnpm install
```

### Start the development server

```bash
pnpm dev
```

The development server runs on the configured project port. In the Manus environment, the managed preview URL is provided by the WebDev runtime.

### Build for production

```bash
pnpm build
```

The build creates the Vite frontend bundle in `dist/public` and the bundled Node.js server entry point at `dist/index.js`.

### Run the production build

```bash
NODE_ENV=production pnpm start
```

To serve on a specific port in a compatible environment:

```bash
PORT=4173 NODE_ENV=production pnpm start
```

### Type-check and test

```bash
pnpm check
pnpm test
```

The current automated suite covers authentication logout behavior and structured-assessment normalization. The validated baseline currently passes all three tests.

## Environment configuration

The platform environment provides the database, authentication, storage, and built-in AI configuration. Do not commit credentials or `.env` files.

### Core platform variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB-compatible database connection. |
| `JWT_SECRET` | Session cookie signing secret. |
| `VITE_APP_ID` | Manus application identifier. |
| `OAUTH_SERVER_URL` | OAuth server base URL. |
| `OWNER_OPEN_ID` | Project owner identity. |
| `BUILT_IN_FORGE_API_URL` | Built-in Manus API endpoint. |
| `BUILT_IN_FORGE_API_KEY` | Server-side built-in API credential. |

### Backend mode variables

The platform backend is the safe default:

```bash
VITE_BACKEND_MODE=platform
SEVAFLOW_BACKEND_MODE=platform
```

The prepared AWS adapter can be selected only after AWS deployment and acceptance testing:

```bash
VITE_BACKEND_MODE=aws
SEVAFLOW_BACKEND_MODE=aws
SEVAFLOW_AWS_API_BASE_URL=https://<api-id>.execute-api.ap-south-1.amazonaws.com
```

When AWS mode is enabled, the server adapter routes report analysis, report creation, report reads, dashboard reads, and media uploads through the API Gateway base URL. The platform backend remains the fallback when AWS mode is not selected.

## AWS deployment status

AWS deployment is intentionally separate from the current working platform deployment. No AWS resources have been created for SevaFlow.

The prepared AWS architecture targets `ap-south-1` (Mumbai) and contains:

- An encrypted S3 media bucket.
- A pay-per-request DynamoDB reports table.
- An API Gateway HTTP API.
- A Node.js Lambda function.
- Bedrock Runtime integration.
- Amazon Transcribe job creation and polling routes.
- CloudWatch logging and required IAM permissions.

The Bedrock model is parameterized through `BEDROCK_MODEL_ID`. It is not hard-coded in the SAM template or Lambda handler.

The latest account verification found:

- AWS identity authentication: passed.
- Bedrock Nova model and inference-profile discovery in Mumbai: passed.
- `amazon.nova-2-lite-v1:0`: available.
- `global.amazon.nova-2-lite-v1:0`: active inference profile.
- DynamoDB: blocked by a subscription-required restriction.
- S3: blocked because the account is not signed up for the service.
- Transcribe: blocked by a subscription-required restriction.

Because the complete preflight has not passed, AWS deployment must remain blocked.

### AWS preflight sequence

After the required AWS services are activated, run the read-only preflight first:

```bash
chmod +x aws/preflight.sh
./aws/preflight.sh \
  --profile harieesh \
  --region ap-south-1 \
  --model-id global.amazon.nova-2-lite-v1:0
```

Do not deploy if the preflight fails. The preflight is designed to stop before resource creation.

### AWS deployment sequence after preflight

The frozen deployment sequence is:

1. Run the Mumbai preflight with the verified Bedrock model or inference profile.
2. Deploy the SAM stack only after the preflight passes.
3. Verify image upload, S3 persistence, Bedrock visual assessment, and DynamoDB report persistence.
4. Connect asynchronous Transcribe polling to the existing frontend.
5. Switch to `VITE_BACKEND_MODE=aws`.
6. Run complete end-to-end smoke tests.

No additional AWS services should be introduced unless an acceptance test requires one.

More detailed AWS commands and resource descriptions are available in [`aws/README.md`](aws/README.md).

## Validation status

The current frozen baseline has been validated with:

```bash
pnpm check
pnpm test
pnpm build
node --check aws/lambda/index.js
```

The production build completed successfully. The temporary public production service returned HTTP 200. AWS preflight and deployment were not executed as part of the current frontend delivery.

## Repository structure

```text
seva-flow/
├── client/                 # React frontend
│   ├── index.html
│   └── src/
├── drizzle/                # Database schema and migrations
├── aws/                    # Prepared SAM and Lambda deployment layer
│   ├── lambda/
│   ├── preflight.sh
│   ├── template.yaml
│   └── README.md
├── server/                 # Express, tRPC, storage, AI, and transcription code
├── shared/                 # Shared constants and types
├── SEVAFLOW_PROJECT_REPORT.md
├── package.json
└── README.md
```

## Security and operational notes

Never commit AWS access keys, session tokens, database credentials, OAuth secrets, or generated deployment credentials. Use the configured environment or a secure secret manager.

The application treats AI assessment as decision support. It should not be presented as an authoritative determination without human review.

The AWS deployment is gated because service activation and permissions are prerequisites for safe resource creation. Keep the platform backend available until AWS smoke tests pass.

## License

This project is distributed under the MIT license as declared in `package.json`.

## References

[1]: https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html "Amazon Bedrock supported foundation models"
[2]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html "AWS Serverless Application Model documentation"
[3]: https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html "Amazon Transcribe documentation"
[4]: https://orm.drizzle.team/docs/overview "Drizzle ORM documentation"
[5]: https://trpc.io/docs "tRPC documentation"
[6]: https://vite.dev/guide/ "Vite documentation"
[7]: https://vitest.dev/guide/ "Vitest documentation"

## Author

Prepared by **Manus AI** for the SevaFlow project.

_Last updated: 20 September 2026._
