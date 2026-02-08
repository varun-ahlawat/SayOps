#!/bin/bash
# One-time: create SayOps secrets in GCP Secret Manager from .env.local
# Run from repo root: ./scripts/setup-gcp-secrets.sh
set -e

PROJECT_ID="${GCP_PROJECT_ID:-evently-486001}"
ENV_FILE="${1:-.env.local}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Usage: $0 [path-to-.env.local]"
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

get_val() {
  grep -E "^${1}=" "$ENV_FILE" | cut -d= -f2- || true
}

create_secret() {
  local name="$1"
  local val="$2"
  if [ -z "$val" ]; then
    echo "⚠️  Skipping $name (empty)"
    return
  fi
  if gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    echo "📌 Adding new version to existing secret: $name"
    echo -n "$val" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT_ID"
  else
    echo "📌 Creating secret: $name"
    echo -n "$val" | gcloud secrets create "$name" \
      --data-file=- \
      --project="$PROJECT_ID" \
      --replication-policy=automatic
  fi
}

echo "Using project: $PROJECT_ID"
echo ""

create_secret "TWILIO_ACCOUNT_SID"    "$(get_val TWILIO_ACCOUNT_SID)"
create_secret "TWILIO_AUTH_TOKEN"     "$(get_val TWILIO_AUTH_TOKEN)"
create_secret "TWILIO_PHONE_NUMBER"   "$(get_val TWILIO_PHONE_NUMBER)"
create_secret "NEXT_PUBLIC_APP_URL"   "$(get_val NEXT_PUBLIC_APP_URL)"
create_secret "NGROK_AUTHTOKEN"       "$(get_val NGROK_AUTHTOKEN)"
create_secret "ELEVENLABS_API_KEY"   "$(get_val ELEVENLABS_API_KEY)"
create_secret "ELEVENLABS_VOICE_ID"   "$(get_val ELEVENLABS_VOICE_ID)"

echo ""
echo "✅ Secrets created/updated in Secret Manager."
