# Agent Settings Schema

This documents the full agent configuration schema. Currently the new fields (role, greeting, tone, language, actions, escalation, business hours) are **demo-only** and stored in local React state. If you want to persist them to BigQuery, use the schema below.

## BigQuery Table: `agent_settings`

| Column | Type | Description |
|---|---|---|
| id | STRING | Primary key (UUID) |
| agent_id | STRING | Foreign key -> agents.id |
| role | STRING | Preset role ID: `sales_rep`, `front_desk`, `customer_support`, `appointment_scheduler`, `order_taker`, `tech_support`, `custom` |
| greeting | STRING | Custom greeting message played at call start |
| tone | STRING | Conversation tone: `professional`, `friendly`, `casual`, `formal`, `empathetic` |
| language | STRING | Primary language code: `en`, `es`, `fr`, `de`, `pt`, `zh`, `ja`, `ko`, `ar`, `hi` |
| escalation_instructions | STRING | Free-text rules for when to escalate to a human |
| business_hours_enabled | BOOLEAN | Whether business hours restriction is active |
| business_hours_start | STRING | Start time in HH:MM format (e.g. `09:00`) |
| business_hours_end | STRING | End time in HH:MM format (e.g. `17:00`) |
| allowed_actions | STRING | Comma-separated predefined action IDs (e.g. `book_appointments,process_refunds,take_orders`) |
| custom_actions | STRING | Free-text description of additional custom actions |
| updated_at | TIMESTAMP | Last updated timestamp |

### Predefined Action IDs

| Action ID | Label |
|---|---|
| book_appointments | Book Appointments |
| process_refunds | Process Refunds |
| take_orders | Take Orders |
| transfer_calls | Transfer Calls |
| collect_info | Collect Customer Info |
| send_followup | Send Follow-up Email |
| check_inventory | Check Inventory |
| provide_quotes | Provide Quotes |

### Role Presets

| Role ID | Label | Default Context |
|---|---|---|
| sales_rep | Sales Representative | Handle inbound leads, discuss pricing, and close deals |
| front_desk | Front Desk / Receptionist | Greet callers, route inquiries, and provide general info |
| customer_support | Customer Support | Resolve issues, process returns, and handle complaints |
| appointment_scheduler | Appointment Scheduler | Book, reschedule, and manage appointments |
| order_taker | Order Taker | Take orders, confirm details, and process transactions |
| tech_support | Technical Support | Troubleshoot issues and guide users through solutions |
| custom | Custom | User-defined |

## BigQuery Create Command

```bash
bq mk --table sayops.agent_settings \
  id:STRING,agent_id:STRING,role:STRING,greeting:STRING,tone:STRING,language:STRING,escalation_instructions:STRING,business_hours_enabled:BOOLEAN,business_hours_start:STRING,business_hours_end:STRING,allowed_actions:STRING,custom_actions:STRING,updated_at:TIMESTAMP
```

## Relationship

```
agents (1) ---- (1) agent_settings
  agents.id  <-->  agent_settings.agent_id
```
