# SevaFlow AWS backend

This directory contains the deployable AWS backend for SevaFlow. The existing SevaFlow UI and API contract remain unchanged. The application/data plane is intended for **`ap-south-1` (Mumbai)**; Bedrock model execution is selected separately through the required `BEDROCK_MODEL_ID` parameter and may use a regional model or a supported cross-Region inference profile.

## Architecture

The SAM stack provisions an encrypted S3 media bucket, a pay-per-request DynamoDB reports table, an HTTP API Gateway endpoint, and a Node.js Lambda handler. The handler exposes `/reports`, `/reports/analyze`, `/dashboard`, `/media/presign`, `/voice/transcribe`, and `/voice/transcribe/{jobName}`. Text complaints go directly to strict Bedrock assessment. Image and voice clients first request `/media/presign`, upload directly to S3, and then pass the returned `mediaKey`; voice uses that S3 object with Amazon Transcribe before assessment.

## Current AWS account status

The authenticated profile is `harieesh` in account `360734036325`. The application target is `ap-south-1` (Mumbai). The non-mutating Mumbai preflight currently fails because the account is not yet subscribed to S3, DynamoDB, or Transcribe there, and Bedrock has not returned a verified model/profile in Mumbai. No billable resources were created.

## Preflight gate

Run the read-only preflight after AWS account verification and after choosing the exact Nova 2 Lite model or inference-profile ID shown by the account:

```bash
chmod +x aws/preflight.sh
aws/preflight.sh \
  --profile harieesh \
  --region ap-south-1 \
  --model-id <verified-nova-2-lite-model-or-inference-profile-id>
```

The preflight checks AWS identity, Bedrock model/profile availability, DynamoDB permissions, S3 permissions, and Transcribe permissions. It never creates, updates, deletes, or deploys resources. A failed check stops the process before any billable resource creation.

## Deploy only after preflight passes

Install or run AWS SAM CLI, then review the change set before executing deployment:

```bash
sam build --template-file aws/template.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name sevaflow-backend \
  --region ap-south-1 \
  --profile harieesh \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides ProjectName=sevaflow BedrockModelId=<verified-nova-2-lite-model-or-inference-profile-id> \
  --no-execute-changeset
```

Execute the reviewed change set separately. `BedrockModelId` is intentionally required; there is no hard-coded regional Bedrock model ID in the template or Lambda handler.

After deployment, capture the `ApiUrl`, `ReportsTableName`, and `MediaBucketName` outputs. The SevaFlow frontend should use the API URL for report analysis, report creation, dashboard reads, and voice transcription polling.

## Smoke tests after deployment

```bash
API_URL="https://...execute-api.ap-south-1.amazonaws.com"
curl -sS "$API_URL/dashboard"
curl -sS -X POST "$API_URL/reports/analyze" \
  -H 'content-type: application/json' \
  -d '{"description":"Garbage beside the bus stop for four days","location":"Anna Nagar, Chennai"}'
```

Do not commit AWS credentials, access keys, or generated `.aws-sam` artifacts to the repository.
