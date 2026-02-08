# BigQuery Database Setup Guide

This guide walks you through setting up Google Cloud BigQuery as the database backend for SpeakOps.

## Prerequisites

- Google Cloud SDK (gcloud CLI) installed
- A GCP project with billing enabled
- Access to a terminal/command line

## Step 1: Authenticate with GCP

Run this command and follow the browser prompt to log in with your Google account:

```bash
gcloud auth login
```

## Step 2: Set up Application Default Credentials (ADC)

This allows your application to access GCP services programmatically:

```bash
gcloud auth application-default login
```

## Step 3: Set Your GCP Project

Replace `YOUR_PROJECT_ID` with your actual GCP project ID:

```bash
gcloud config set project YOUR_PROJECT_ID
```

To find your project ID, visit: https://console.cloud.google.com/projectselector2

## Step 4: Enable BigQuery API

```bash
gcloud services enable bigquery.googleapis.com
```

## Step 5: Create a BigQuery Dataset

Create a dataset named `sayops` in the US region:

```bash
bq mk --dataset --location=US sayops
```

## Step 6: Create Database Tables

Run the following commands to create all required tables:

### Users Table

```bash
bq mk --table sayops.users \
  id:STRING,business_name:STRING,email:STRING,created_at:TIMESTAMP
```

### Agents Table

```bash
bq mk --table sayops.agents \
  id:STRING,user_id:STRING,name:STRING,status:STRING,created_at:TIMESTAMP,total_calls:INTEGER,token_usage:INTEGER,money_spent:FLOAT,max_call_time:INTEGER,context:STRING,cellular_enabled:BOOLEAN
```

### Call History Table

```bash
bq mk --table sayops.call_history \
  id:STRING,agent_id:STRING,timestamp:TIMESTAMP,duration_seconds:INTEGER,summary:STRING
```

### Conversation Turns Table

```bash
bq mk --table sayops.conversation_turns \
  id:STRING,call_id:STRING,turn_order:INTEGER,speaker:STRING,text:STRING,audio_url:STRING
```

### Daily Call Stats Table

```bash
bq mk --table sayops.daily_call_stats \
  date:DATE,agent_id:STRING,call_count:INTEGER
```

## Database Schema Overview

```
sayops (dataset)
├── users
│   ├── id (STRING) - Primary key
│   ├── business_name (STRING)
│   ├── email (STRING)
│   └── created_at (TIMESTAMP)
│
├── agents
│   ├── id (STRING) - Primary key
│   ├── user_id (STRING) - Foreign key → users.id
│   ├── name (STRING)
│   ├── status (STRING) - "active" or "inactive"
│   ├── created_at (TIMESTAMP)
│   ├── total_calls (INTEGER)
│   ├── token_usage (INTEGER)
│   ├── money_spent (FLOAT)
│   ├── max_call_time (INTEGER) - in seconds
│   ├── context (STRING) - agent description/training
│   └── cellular_enabled (BOOLEAN)
│
├── call_history
│   ├── id (STRING) - Primary key
│   ├── agent_id (STRING) - Foreign key → agents.id
│   ├── timestamp (TIMESTAMP)
│   ├── duration_seconds (INTEGER)
│   └── summary (STRING)
│
├── conversation_turns
│   ├── id (STRING) - Primary key
│   ├── call_id (STRING) - Foreign key → call_history.id
│   ├── turn_order (INTEGER) - sequence in conversation
│   ├── speaker (STRING) - "User" or "Agent"
│   ├── text (STRING)
│   └── audio_url (STRING) - optional audio recording
│
└── daily_call_stats
    ├── date (DATE)
    ├── agent_id (STRING) - Foreign key → agents.id
    └── call_count (INTEGER)
```

## Verify Setup

List all tables in your dataset:

```bash
bq ls sayops
```

View table schema:

```bash
bq show sayops.users
bq show sayops.agents
bq show sayops.call_history
```

## Troubleshooting

### "Permission denied" errors

Ensure your account has the BigQuery Admin role:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/bigquery.admin"
```

### "Dataset not found" errors

Check you're in the correct project:

```bash
gcloud config get-value project
```

### API not enabled

If you get API errors, enable the BigQuery API:

```bash
gcloud services enable bigquery.googleapis.com
```
