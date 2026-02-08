# BigQuery Schemas

Project: `evently-486001` | Dataset: `sayops`

## 1. users

| Column | Type |
|---|---|
| id | STRING |
| business_name | STRING |
| email | STRING |
| created_at | TIMESTAMP |

## 2. agents

| Column | Type |
|---|---|
| id | STRING |
| user_id | STRING |
| name | STRING |
| status | STRING |
| created_at | TIMESTAMP |
| total_calls | INTEGER |
| token_usage | INTEGER |
| money_spent | FLOAT |
| max_call_time | INTEGER |
| context | STRING |
| cellular_enabled | BOOLEAN |
| phone_number | STRING |

## 3. call_history

| Column | Type |
|---|---|
| id | STRING |
| agent_id | STRING |
| timestamp | TIMESTAMP |
| duration_seconds | INTEGER |
| summary | STRING |

## 4. conversation_turns

| Column | Type |
|---|---|
| id | STRING |
| call_id | STRING |
| turn_order | INTEGER |
| speaker | STRING |
| text | STRING |
| audio_url | STRING |

## 5. daily_call_stats

| Column | Type |
|---|---|
| date | DATE |
| agent_id | STRING |
| call_count | INTEGER |

## 6. user_documents

| Column | Type |
|---|---|
| id | STRING |
| user_id | STRING |
| agent_id | STRING |
| file_name | STRING |
| file_type | STRING |
| file_size_bytes | INTEGER |
| raw_text | STRING |
| uploaded_at | TIMESTAMP |
| ocr_status | STRING |
| embedding | ARRAY\<FLOAT64\> |

### Vector Search Index

```sql
CREATE VECTOR INDEX IF NOT EXISTS idx_user_documents_embedding
ON `evently-486001.sayops.user_documents`(embedding)
OPTIONS(
  index_type = 'IVF',
  distance_type = 'COSINE',
  ivf_options = '{"num_lists": 100}'
)
```
