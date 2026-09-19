# SevaFlow AWS backend

This directory contains the deployable AWS backend for SevaFlow. The stack is parameterized so `BedrockModelId` can be either a regional foundation model or a supported cross-Region inference profile.

## Architecture

The SAM stack provisions an encrypted S3 media bucket, a pay-per-request DynamoDB reports table, an HTTP API Gateway endpoint, and a Node.js Lambda handler. The handler exposes `/reports`, `/reports/analyze`, `/dashboard`, `/voice/transcribe`, and `/voice/transcribe/{jobName}`. Text and image complaints use Amazon Bedrock Converse with a forced tool schema. Voice complaints use S3 plus Amazon Transcribe before assessment.

## Current AWS account status

The authenticated profile is `harieesh` in account `360734036325`, with the project Region configured as `eu-north-1`. Bedrock model discovery is available and `amazon.nova-2-lite-v1:0` is active. Actual Bedrock invocation is currently blocked by AWS account verification, and DynamoDB currently reports a subscription-required restriction. No billable resources were created while these restrictions were active.

## Deploy after AWS verification

From this directory, install or run AWS SAM CLI, then deploy with the authenticated profile:

```bash
sam build --template-file template.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name sevaflow-backend \
  --region eu-north-1 \
  --profile harieesh \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides ProjectName=sevaflow BedrockModelId=amazon.nova-2-lite-v1:0
```

For a supported cross-Region inference profile, replace the model parameter, for example `eu.amazon.nova-2-lite-v1:0` or `global.amazon.nova-2-lite-v1:0`, after confirming availability in the selected source Region.

After deployment, capture the `ApiUrl`, `ReportsTableName`, and `MediaBucketName` outputs. The SevaFlow frontend should use the API URL for report analysis, report creation, dashboard reads, and voice transcription polling.

## Smoke tests

```bash
API_URL="https://...execute-api.eu-north-1.amazonaws.com"
curl -sS "$API_URL/dashboard"
curl -sS -X POST "$API_URL/reports/analyze" \
  -H 'content-type: application/json' \
  -d '{"description":"Garbage beside the bus stop for four days","location":"Anna Nagar, Chennai"}'
```

Do not commit AWS credentials, access keys, or generated `.aws-sam` artifacts to the repository.
