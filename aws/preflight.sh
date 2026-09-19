#!/usr/bin/env bash
set -euo pipefail

PROFILE="harieesh"
REGION="ap-south-1"
MODEL_ID=""

usage() {
  cat <<'EOF'
Usage: aws/preflight.sh --model-id <verified-bedrock-model-or-inference-profile> [--profile <name>] [--region <aws-region>]

Read-only checks performed:
  - AWS identity via STS
  - Bedrock foundation-model and inference-profile availability
  - DynamoDB ListTables permission/service availability
  - S3 ListBuckets permission/service availability
  - Transcribe ListTranscriptionJobs permission/service availability

This script never creates, updates, deletes, or deploys AWS resources.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --model-id) MODEL_ID="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$MODEL_ID" ]]; then
  echo "ERROR: --model-id is required; pass the exact verified Nova 2 Lite model or inference-profile ID." >&2
  usage >&2
  exit 2
fi

export AWS_PAGER=""
FAILURES=0
check() {
  local label="$1"
  shift
  printf '[preflight] %-42s' "$label"
  if "$@" >/tmp/sevaflow-preflight-output 2>/tmp/sevaflow-preflight-error; then
    echo "PASS"
  else
    echo "FAIL"
    sed 's/^/  /' /tmp/sevaflow-preflight-error >&2
    FAILURES=$((FAILURES + 1))
  fi
}

check "AWS identity (${PROFILE})" aws sts get-caller-identity --profile "$PROFILE" --region "$REGION"

printf '[preflight] %-42s' "Bedrock model/profile availability"
MODEL_LIST="$(aws bedrock list-foundation-models --profile "$PROFILE" --region "$REGION" --query 'modelSummaries[].modelId' --output text 2>/tmp/sevaflow-preflight-error || true)"
PROFILE_LIST="$(aws bedrock list-inference-profiles --profile "$PROFILE" --region "$REGION" --query 'inferenceProfileSummaries[].inferenceProfileId' --output text 2>>/tmp/sevaflow-preflight-error || true)"
if printf '%s\n%s\n' "$MODEL_LIST" "$PROFILE_LIST" | tr '\t' '\n' | grep -Fxq "$MODEL_ID"; then
  echo "PASS (${MODEL_ID})"
else
  echo "FAIL"
  echo "  Selected ID was not returned by Bedrock in ${REGION}: ${MODEL_ID}" >&2
  sed 's/^/  /' /tmp/sevaflow-preflight-error >&2
  FAILURES=$((FAILURES + 1))
fi

check "DynamoDB service and permission" aws dynamodb list-tables --profile "$PROFILE" --region "$REGION" --max-items 1
check "S3 service and permission" aws s3api list-buckets --profile "$PROFILE"
check "Transcribe service and permission" aws transcribe list-transcription-jobs --profile "$PROFILE" --region "$REGION" --max-results 1

rm -f /tmp/sevaflow-preflight-output /tmp/sevaflow-preflight-error
if [[ "$FAILURES" -gt 0 ]]; then
  echo "Preflight failed with ${FAILURES} check(s). No AWS resources were created."
  exit 1
fi

echo "Preflight passed. It is safe to review the SAM change set; deployment remains a separate command."
