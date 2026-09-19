# SevaFlow AI — Project Report

**Prepared by:** Manus AI  
**Project:** SevaFlow AI — From Complaint to Action  
**Report date:** 19 September 2026  
**Current checkpoint:** `d9306b72`

## Executive summary

SevaFlow is a civic issue reporting and operations interface that converts resident complaints into structured service requests. The project now includes a polished citizen reporting experience, a persistent operations dashboard, server-side issue assessment, real browser voice recording and transcription, replayable voice notes, additive multi-image attachments, and an AWS deployment layer prepared for Mumbai.

The existing user interface remains intact in its core visual language and navigation. The text path is operational through the current application backend. The voice path records from the browser, displays the recording for replay, transcribes the audio through the configured Whisper-compatible service, and appends the transcript to the editable complaint description. The image path supports multiple local previews and individual removal.

AWS resources have **not** been deployed. Deployment is intentionally gated behind a read-only preflight because the new AWS account currently lacks the required service activation and verification state in `ap-south-1`.

> **Current status:** The application is implemented and locally validated. The AWS infrastructure is prepared but not provisioned. The frontend remains connected to the existing platform backend until AWS verification and the Mumbai preflight pass.

## 1. Product scope

SevaFlow addresses the gap between an unstructured civic complaint and an actionable operations request. A resident can describe a problem in text, record a voice note, or attach one or more images. The system structures the report into a category, priority, confidence score, evidence list, responsible department, summary, and suggested action.

The operations center presents recent reports, high-priority counts, open and resolved requests, category distribution, and an emerging hotspot based on repeated category and location combinations.

The product intentionally presents AI assessment as assistive rather than definitive. The user can review the generated assessment before submitting the report.

## 2. Implemented user experience

### 2.1 Citizen report view

The report view uses a responsive two-column layout on larger screens and a stacked layout on smaller screens. It contains the SevaFlow brand header, report and command-center navigation, a complaint form, report metrics, and explanatory product messaging.

The primary inputs are:

- **Text description:** The user enters the problem in a multiline description field.
- **Location:** The user identifies where the issue occurred.
- **Voice:** The user records a voice note through the browser microphone.
- **Photo:** The user selects one or more image files.

The structure of the original SevaFlow interface was preserved while the interaction model was strengthened.

### 2.2 Text workflow

The text workflow is complete in the current application backend.

1. The user enters a description and location.
2. The client calls the `reports.analyze` tRPC mutation.
3. The server runs structured issue intelligence.
4. The UI displays category, priority, confidence, summary, department, evidence, and suggested action.
5. The user reviews the result.
6. The client calls the `reports.create` mutation.
7. The report is persisted and the recent reports and dashboard metrics are refreshed.

Input validation requires a meaningful description and constrains the location field. Assessment validation requires the complete structured response contract.

### 2.3 Voice workflow

The voice workflow was rebuilt from a staged demo into a real user flow.

1. The user selects **Voice**.
2. The browser requests microphone permission.
3. `MediaRecorder` captures audio using a supported browser format, preferably WebM with Opus.
4. The Voice control displays a live recording indicator and elapsed timer.
5. Selecting Voice again stops the recording.
6. The recording is retained as a local object URL so the user can replay it.
7. The client sends the recorded audio as a data URL to the `voice.transcribe` tRPC mutation.
8. The server validates the audio size and MIME type.
9. The server stores the recording through the configured storage helper.
10. The server sends the original captured bytes directly to the Whisper-compatible transcription service.
11. The returned transcript is appended to the description field.
12. The user can edit the transcript before structuring the report.

The flow includes an individual Remove action for each voice note. Multiple recordings remain available instead of replacing one another.

A specific 400 error was diagnosed and fixed. The browser data URL can contain a codec parameter such as `data:audio/webm;codecs=opus;base64,...`. The previous decoder did not remove that complete header, which corrupted the audio bytes and caused the transcription service to report an invalid file format. The server now decodes only the content after the first comma.

### 2.4 Image workflow

The Photo control now accepts multiple image files in one selection and can be used repeatedly to add more images. Each selected image receives:

- A local preview.
- An individual Remove control.
- A stable client-side attachment identifier.

The current implementation previews and manages the images in the browser. Persisting all image objects with a submitted report is reserved for the AWS media integration stage because the existing report creation contract currently stores only optional single media URL fields.

### 2.5 Review and submission behavior

Voice transcripts are appended to existing text rather than replacing it. This allows a user to combine a typed description with additional spoken context. The final description remains editable.

The user can replay voice notes and remove individual voice or image attachments before structuring the report. The system does not submit a report automatically after transcription.

## 3. Frontend implementation

The main user experience is implemented in:

- `client/src/pages/Home.tsx`
- `client/src/index.css`
- `client/index.html`
- `client/src/lib/trpc.ts`

The frontend uses React, TypeScript, Tailwind CSS, Lucide icons, the existing tRPC client, and the project’s configured shadcn-style components.

The design system uses a warm off-white background, deep green typography, lime accents, soft borders, rounded cards, and restrained motion. The interface is responsive and uses visible focus and interaction states.

The following frontend behaviors are implemented:

- Text entry and report assessment.
- Browser microphone recording.
- Recording timer and active-state indicator.
- Voice-note replay.
- Individual voice-note removal.
- Multiple image selection.
- Image previews.
- Individual image removal.
- Editable transcript insertion.
- Report submission state.
- Operations-center navigation.
- Search and priority filtering in the report list.
- Dashboard metric and category visualizations.

## 4. Server implementation

The current tRPC router is defined in `server/routers.ts`.

### 4.1 Report procedures

The existing report contract includes:

| Procedure | Type | Purpose |
|---|---|---|
| `reports.analyze` | Mutation | Creates a structured issue assessment from text and location. |
| `reports.create` | Mutation | Persists a reviewed report and its assessment. |
| `reports.list` | Query | Reads recent persisted reports. |
| `reports.getById` | Query | Reads a single report by ID. |
| `reports.dashboard` | Query | Returns aggregate dashboard metrics. |

### 4.2 Voice procedure

The current application router includes:

| Procedure | Type | Purpose |
|---|---|---|
| `voice.transcribe` | Mutation | Validates a browser recording, stores it, sends the captured bytes to transcription, and returns the transcript. |

The procedure enforces a 16 MB maximum audio size and accepts browser audio MIME types. It normalizes codec-qualified MIME values before storage and transcription.

### 4.3 Storage and transcription helpers

The project uses the configured storage helper in `server/storage.ts`. Audio is uploaded through a signed storage operation so the user can replay the recording and the system can retain a media reference for later persistence.

The transcription implementation is in `server/_core/voiceTranscription.ts`. It supports WebM, MP3, WAV, OGG, and M4A-compatible inputs. The helper uses the configured internal speech-to-text endpoint and returns transcript text together with native transcription metadata.

## 5. Data and dashboard implementation

The database schema was extended with persistent report and hotspot-ready data structures. The project uses the existing relational database connection for the current application path.

The server-side database helpers support:

- Report creation.
- Recent report retrieval.
- Single-report retrieval.
- Total report counts.
- High-priority counts.
- Open and resolved counts.
- Category distribution.
- Repeated category and location hotspot detection.

All timestamps used by the application are represented as UTC-compatible timestamps at the persistence layer and converted for display in the client.

## 6. AWS architecture prepared for deployment

The AWS deployment layer is in the `aws/` directory. It is designed to move the application and data plane to **`ap-south-1` (Mumbai)** while allowing Bedrock to use the exact supported model or inference profile available to the account.

The prepared architecture is:

```text
Citizen browser
    │
    ├── text complaint
    ├── image upload
    └── voice recording
            │
            ▼
      API Gateway HTTP API
            │
            ▼
         Lambda
            │
      ┌─────┼──────────────┐
      ▼     ▼              ▼
   S3 media  Transcribe  Bedrock
      │         │          │
      └─────────┴──────────┘
                │
                ▼
          Structured JSON
                │
         ┌──────┴──────┐
         ▼             ▼
      DynamoDB     Operations Center
```

### 6.1 AWS resources defined

The SAM template defines:

- An encrypted S3 media bucket.
- A pay-per-request DynamoDB reports table.
- An HTTP API Gateway API.
- A Node.js 22 Lambda function.
- Lambda permissions for DynamoDB, S3, Bedrock, Transcribe, and CloudWatch logging.
- S3 CORS configuration for browser media operations.
- DynamoDB point-in-time recovery and server-side encryption.

The AWS Lambda package includes adapters for:

- Amazon Bedrock Runtime.
- Amazon DynamoDB.
- Amazon S3.
- Amazon Transcribe.
- S3 request presigning.

### 6.2 Bedrock model configuration

The Bedrock model is intentionally not hard-coded. The SAM parameter `BedrockModelId` is required at deployment time and is passed into the Lambda environment as `BEDROCK_MODEL_ID`.

The value may be a regional foundation model ID or a supported cross-Region inference-profile ID. The exact value must be selected from the account’s verified Bedrock model/profile availability.

The Lambda and application server both fail clearly if Bedrock is selected without `BEDROCK_MODEL_ID`.

### 6.3 AWS Lambda API contract

The prepared Lambda handler exposes:

| Route | Purpose |
|---|---|
| `POST /media/presign` | Returns a presigned S3 upload URL for supported image or audio media. |
| `POST /reports/analyze` | Runs structured Bedrock assessment. |
| `POST /reports` | Creates a persisted report in DynamoDB. |
| `GET /reports` | Reads recent reports. |
| `GET /dashboard` | Returns dashboard aggregates. |
| `POST /voice/transcribe` | Starts an Amazon Transcribe job from an S3 media key. |
| `GET /voice/transcribe/{jobName}` | Polls an Amazon Transcribe job. |

The AWS handler preserves the core report route concepts used by the existing application. The current frontend has not been switched to this API because AWS deployment has intentionally not started.

## 7. Deployment safety and preflight

The deployment preflight is located at `aws/preflight.sh`.

It is read-only and checks:

1. AWS identity through AWS Security Token Service.
2. Bedrock foundation-model availability.
3. Bedrock inference-profile availability.
4. DynamoDB service and permission access.
5. S3 service and permission access.
6. Amazon Transcribe service and permission access.

The script requires the exact model or inference-profile ID as an argument. It does not create, modify, delete, or deploy resources.

Example:

```bash
./aws/preflight.sh \
  --profile harieesh \
  --region ap-south-1 \
  --model-id <verified-nova-2-lite-model-or-inference-profile-id>
```

A deployment is permitted only after the preflight passes. The documented deployment command uses a SAM change set with `--no-execute-changeset`, so the change set can be reviewed before execution.

## 8. AWS status at the current checkpoint

No AWS resources have been created.

The AWS identity check succeeds. The Mumbai preflight currently fails because the newly created AWS account is not yet fully enabled for the required services in `ap-south-1`. The observed restrictions include:

- Bedrock model/profile availability is not yet verified in Mumbai.
- DynamoDB reports a subscription-required restriction.
- S3 reports that the account is not signed up for the service.
- Transcribe reports a subscription-required restriction.

These failures are expected to block deployment. The project correctly stops before creating billable resources.

## 9. Validation completed

The following checks passed at the current checkpoint:

- TypeScript compilation with `pnpm check`.
- Full Vitest suite with `pnpm test`.
- Three project tests pass.
- Lambda JavaScript syntax validation with `node --check`.
- AWS preflight shell syntax validation with `bash -n`.
- Direct transcription endpoint probe with a valid WAV fixture.
- Voice contract validation for invalid text, voice, and media requests.
- Browser voice recording and replay path implementation.
- Multiple image and multiple voice attachment implementation.
- Checkpoint creation after the latest fixes.

The current project test suite contains authentication logout coverage and SevaFlow structured-assessment normalization coverage. The real microphone and cloud transcription path was validated structurally and through a direct transcription-service fixture probe; a complete browser microphone-to-production-service test still requires a working account and a live user microphone session.

## 10. Known limitations

### 10.1 Attachments are not yet fully persisted with reports

Multiple images and voice notes are currently retained in the browser interaction state. Voice audio is also sent through the configured storage helper during transcription. The existing report creation contract does not yet carry an array of image and voice attachment references, so a later schema and API extension is required for complete report-level media persistence.

### 10.2 AWS is prepared but not deployed

The AWS SAM stack is ready for review but cannot be deployed until the Mumbai preflight passes. No deployment action has been taken.

### 10.3 The current frontend still uses the platform backend

The existing UI continues to use the current tRPC procedures for assessment, report persistence, and dashboard reads. The AWS Lambda API is prepared as a deployment target but has not replaced the current backend.

### 10.4 Image analysis is not yet connected to Bedrock

The AWS Lambda handler has a media-input seam for image assessment, but the current frontend image attachments are not yet uploaded to the AWS media bucket or passed into the deployed Bedrock route. The current application can preview multiple images but does not yet include them in the structured assessment request.

### 10.5 Voice language selection is currently English-configured

The voice mutation currently sends `en` as the default language hint. The transcription service can detect language, and the interface can be extended with an explicit language selector for Tamil, English, and mixed-language complaints.

## 11. Recommended next implementation sequence

The safest next sequence is to wait for AWS service verification, run the Mumbai preflight with the account’s exact Nova 2 Lite inference-profile ID, and review the SAM change set without executing it.

After the preflight passes, the media contract should be extended so each submitted report stores an attachment array. Each attachment should include a type, storage key, MIME type, upload timestamp, and optional transcription reference.

The frontend should then be connected to the AWS API behind a configuration switch. This allows the current platform backend to remain available as a fallback while the AWS path is tested with real text, image, and voice submissions.

The final product hardening phase should add language selection, upload progress, retry behavior, attachment size totals, report-level media display in the command center, and end-to-end browser tests.

## 12. Current checkpoint

The latest verified project checkpoint is:

[Open the current SevaFlow project](manus-webdev://d9306b72)

## References

[1]: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html "Route model inference requests across AWS Regions with cross-Region inference"

[2]: https://docs.aws.amazon.com/nova/latest/nova2-userguide/request-response-schema.html "Amazon Nova request and response schema"

[3]: https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html "What is Amazon Transcribe"

[4]: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder "MediaRecorder API"
