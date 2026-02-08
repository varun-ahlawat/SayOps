# 🚀 Deploy Twilio Integration to GCP Cloud Run

This guide shows how to deploy SayOps with Twilio integration to Cloud Run so it runs 24/7.

## 📋 Prerequisites

1. ✅ GCP Project: `evently-486001`
2. ✅ Twilio Account with credentials in `.env.local`
3. ✅ `gcloud` CLI authenticated
4. ✅ BigQuery dataset created (`sayops`)

## 🎯 **Why Deploy to Cloud Run?**

**Current setup (localhost + ngrok):**
- ❌ Only works when your computer is on
- ❌ ngrok URL changes every restart
- ❌ Not production-ready

**After deploying to Cloud Run:**
- ✅ Runs 24/7 (even when your computer is off)
- ✅ Stable public URL (doesn't change)
- ✅ Auto-scales with traffic
- ✅ Production-ready

---

## 🚀 **Deployment Steps**

### **Option 1: One-Command Deploy (Easiest)**

```bash
./scripts/deploy-to-cloudrun.sh
```

This script will:
1. Build your Docker image
2. Push to Artifact Registry
3. Deploy to Cloud Run
4. Get the public URL
5. Update all Twilio webhooks automatically

---

### **Option 2: Manual Deploy**

#### **Step 1: Build and Deploy**

```bash
# Get your env vars
source .env.local

# Deploy via Cloud Build
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions="\
_NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},\
_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},\
_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},\
_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},\
_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},\
_NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID},\
_TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID},\
_TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN},\
_TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}"
```

#### **Step 2: Get Cloud Run URL**

```bash
gcloud run services describe sayops \
  --region=us-central1 \
  --format='value(status.url)'
```

You'll get something like: `https://sayops-abc123-uc.a.run.app`

#### **Step 3: Update Twilio Webhooks**

For each agent, update the Twilio webhook:

```bash
# Example for agent ID: test-agent-123
CLOUD_RUN_URL="https://sayops-abc123-uc.a.run.app"
AGENT_ID="test-agent-123"

npx tsx -e "
import { Twilio } from 'twilio';
const client = new Twilio('${TWILIO_ACCOUNT_SID}', '${TWILIO_AUTH_TOKEN}');
(async () => {
  const numbers = await client.incomingPhoneNumbers.list();
  const num = numbers[0]; // or find by phoneNumber
  await client.incomingPhoneNumbers(num.sid).update({
    voiceUrl: '${CLOUD_RUN_URL}/api/twilio/voice/${AGENT_ID}',
    voiceMethod: 'POST'
  });
  console.log('Updated!');
})();
"
```

---

## 🔍 **Verify Deployment**

### **1. Check Cloud Run Status**

```bash
gcloud run services describe sayops --region=us-central1
```

Look for:
- ✅ `status: Ready`
- ✅ `url: https://sayops-xxx.run.app`

### **2. Test the Webhook Endpoint**

```bash
CLOUD_RUN_URL=$(gcloud run services describe sayops --region=us-central1 --format='value(status.url)')

curl -X POST "${CLOUD_RUN_URL}/api/twilio/voice/test-agent-123" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'CallSid=TEST&From=+1555&To=+1866&CallStatus=ringing'
```

You should get back TwiML XML.

### **3. Make a Test Call**

```bash
# Call your Twilio number
call: +1 (866) 839-3036
```

### **4. Check Logs**

```bash
# Real-time logs
gcloud run services logs read sayops \
  --region=us-central1 \
  --limit=50 \
  --format="table(time, message)"

# Or tail logs
gcloud run services logs tail sayops --region=us-central1
```

### **5. Verify in BigQuery**

```bash
bq query "SELECT * FROM sayops.call_history ORDER BY timestamp DESC LIMIT 5"
```

---

## 📞 **Architecture After Deployment**

```
[Caller's Phone]
      ↓
[Twilio Cloud] ← Receives call
      ↓ HTTP POST
[Cloud Run] ← https://sayops-abc123.run.app/api/twilio/voice/[agentId]
      ↓ Queries
[BigQuery] ← Agent data, call logging
      ↓ Returns TwiML
[Twilio Cloud] ← Executes voice response
      ↓
[Caller's Phone] ← Hears the AI agent
```

**No ngrok needed!** Cloud Run has a stable public URL.

---

## 🔧 **Environment Variables in Cloud Run**

Cloud Run will have these env vars set automatically:

- `GCP_PROJECT_ID` - Your GCP project
- `BQ_DATASET` - `sayops`
- `TWILIO_ACCOUNT_SID` - From substitutions
- `TWILIO_AUTH_TOKEN` - From substitutions
- `TWILIO_PHONE_NUMBER` - From substitutions

---

## 🛠️ **Common Tasks**

### **Redeploy After Code Changes**

```bash
./scripts/deploy-to-cloudrun.sh
```

### **View Recent Calls**

```bash
bq query "SELECT id, agent_id, summary, timestamp FROM sayops.call_history ORDER BY timestamp DESC LIMIT 10"
```

### **Check Which Agents Have Phone Numbers**

```bash
bq query "SELECT id, name, phone_number FROM sayops.agents WHERE phone_number IS NOT NULL"
```

### **Update a Single Webhook**

```bash
npx tsx scripts/setup-test-agent.ts https://sayops-abc123.run.app
```

### **Monitor Cloud Run Metrics**

```bash
# In Cloud Console
https://console.cloud.google.com/run/detail/us-central1/sayops/metrics?project=evently-486001
```

---

## 💰 **Costs**

**Cloud Run Pricing (US):**
- Free tier: 2 million requests/month
- After free tier: $0.40 per million requests
- Memory: $0.0000025/GB-second
- CPU: $0.00002400/vCPU-second

**Twilio Pricing:**
- Phone number: ~$1/month
- Incoming calls: ~$0.0085/minute
- Outgoing calls (for AI): ~$0.014/minute

**BigQuery:**
- Storage: $0.02/GB/month
- Queries: $5/TB scanned

**Estimated monthly cost for MVP:**
- Cloud Run: ~$0-5 (likely free tier)
- Twilio: ~$1-10 (depending on call volume)
- BigQuery: ~$0-1
- **Total: ~$5-15/month**

---

## 🚨 **Important Notes**

1. **Webhook URLs are agent-specific:**
   - Each agent has its own webhook: `/api/twilio/voice/[agentId]`
   - When you create a new agent, update its Twilio number webhook

2. **Cloud Run URL is stable:**
   - Unlike ngrok, the URL doesn't change
   - Safe to hard-code in Twilio console

3. **Logs are in Cloud Logging:**
   - Use `gcloud run services logs` to view
   - Console webhook logs will show: `[Twilio Webhook] Incoming call...`

4. **Auto-scaling:**
   - Cloud Run scales to 0 when idle (saves money)
   - First call after idle might be slower (cold start ~2-3s)
   - Set `--min-instances=1` to avoid cold starts (costs more)

---

## ✅ **Deployment Checklist**

- [ ] `.env.local` has all Twilio credentials
- [ ] BigQuery dataset `sayops` exists
- [ ] Agents table has agents with `phone_number` populated
- [ ] Run `./scripts/deploy-to-cloudrun.sh`
- [ ] Verify Cloud Run URL is accessible
- [ ] Test webhook endpoint with curl
- [ ] Make a test call to Twilio number
- [ ] Check logs in Cloud Run
- [ ] Verify call appears in BigQuery

---

## 🎉 **You're Live!**

Once deployed, your Twilio integration will:
- ✅ Run 24/7 on Cloud Run
- ✅ Handle incoming calls automatically
- ✅ Log all calls to BigQuery
- ✅ Work even when your computer is off
- ✅ Scale automatically with traffic

**Next step:** Add AI conversation logic to replace the static TwiML! 🤖
