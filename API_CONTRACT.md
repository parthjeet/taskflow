# TaskFlow — Backend API Contract

**Version:** 1.0  
**Frontend:** React + TypeScript + Tailwind CSS  
**Expected Backend:** FastAPI (Python) + PostgreSQL  
**Base URL:** `{API_BASE_URL}/api/v1`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Data Models](#data-models)
3. [Tasks API](#tasks-api)
4. [Sub-Tasks API](#sub-tasks-api)
5. [Daily Updates API](#daily-updates-api)
6. [Team Members API](#team-members-api)
7. [Error Handling](#error-handling)
8. [Business Rules](#business-rules)

---

## Authentication

> Not yet implemented. All endpoints are currently unauthenticated.  
> Future: Add JWT Bearer token auth via `Authorization: Bearer <token>` header.

---

## Data Models

### Task

| Field            | Type                | Required | Description                                              |
|------------------|---------------------|----------|----------------------------------------------------------|
| `id`             | `string (UUID)`     | Auto     | Server-generated unique identifier                       |
| `title`          | `string`            | **Yes**  | 1–200 characters                                         |
| `description`    | `string \| null`    | No       | Max 2000 characters                                      |
| `status`         | `Status`            | **Yes**  | One of: `"To Do"`, `"In Progress"`, `"Blocked"`, `"Done"` |
| `priority`       | `Priority`          | **Yes**  | One of: `"High"`, `"Medium"`, `"Low"`                    |
| `assignee_id`    | `string \| null`    | No       | UUID of assigned team member                             |
| `assignee_name`  | `string \| null`    | No       | Denormalized name of assignee (server-resolved)          |
| `gear_id`        | `string \| null`    | No       | Exactly 4 digits (`/^\d{4}$/`) if provided               |
| `blocking_reason`| `string`            | Cond.    | **Required** when `status = "Blocked"`, empty otherwise  |
| `sub_tasks`      | `SubTask[]`         | Auto     | Embedded array of sub-tasks                              |
| `daily_updates`  | `DailyUpdate[]`     | Auto     | Embedded array of daily updates (newest first)           |
| `created_at`     | `string (ISO 8601)` | Auto     | Server-generated timestamp                               |
| `updated_at`     | `string (ISO 8601)` | Auto     | Server-updated timestamp                                 |

### SubTask

| Field       | Type                | Required | Description                        |
|-------------|---------------------|----------|------------------------------------|
| `id`        | `string (UUID)`     | Auto     | Server-generated unique identifier |
| `title`     | `string`            | **Yes**  | 1–200 characters                   |
| `completed` | `boolean`           | Auto     | Defaults to `false`                |
| `created_at`| `string (ISO 8601)` | Auto     | Server-generated timestamp         |

### DailyUpdate

| Field         | Type                | Required | Description                                     |
|---------------|---------------------|----------|-------------------------------------------------|
| `id`          | `string (UUID)`     | Auto     | Server-generated unique identifier              |
| `task_id`     | `string (UUID)`     | Auto     | Parent task reference                           |
| `author_id`   | `string (UUID)`     | **Yes**  | UUID of the team member who wrote the update    |
| `author_name` | `string`            | Auto     | Server-resolved from `author_id`                |
| `content`     | `string`            | **Yes**  | 1–1000 characters                               |
| `created_at`  | `string (ISO 8601)` | Auto     | Server-generated timestamp                      |
| `updated_at`  | `string (ISO 8601)` | Auto     | Server-updated timestamp                        |
| `edited`      | `boolean`           | Auto     | `true` if content was modified after creation   |

### TeamMember

| Field       | Type                | Required | Description                        |
|-------------|---------------------|----------|------------------------------------|
| `id`        | `string (UUID)`     | Auto     | Server-generated unique identifier |
| `name`      | `string`            | **Yes**  | 1–100 characters                   |
| `email`     | `string`            | **Yes**  | Valid email address                |
| `active`    | `boolean`           | **Yes**  | Whether the member is active       |

---

## Tasks API

### List All Tasks

```
GET /tasks
```

**Query Parameters (all optional):**

| Param      | Type     | Description                                                    |
|------------|----------|----------------------------------------------------------------|
| `status`   | `string` | Filter by status: `To Do`, `In Progress`, `Blocked`, `Done`   |
| `priority` | `string` | Filter by priority: `High`, `Medium`, `Low`                   |
| `assignee` | `string` | Filter by assignee UUID, or `"unassigned"` for null assignees  |
| `search`   | `string` | Search in `title`, `description`, and `gear_id`                |
| `sort`     | `string` | Sort by: `updated` (default), `priority`, `status`             |

**Response:** `200 OK`
```json
[
  {
    "id": "abc12345",
    "title": "Set up CI/CD pipeline",
    "description": "Configure GitHub Actions for automated testing.",
    "status": "In Progress",
    "priority": "High",
    "assignee_id": "m1",
    "assignee_name": "Alice Chen",
    "gear_id": "1024",
    "blocking_reason": "",
    "sub_tasks": [
      { "id": "s1", "title": "Create workflow YAML", "completed": true }
    ],
    "daily_updates": [
      {
        "id": "u1",
        "task_id": "abc12345",
        "author_id": "m1",
        "author_name": "Alice Chen",
        "content": "Workflow YAML created, test stage passing.",
        "created_at": "2026-02-15T10:00:00Z",
        "updated_at": "2026-02-15T10:00:00Z",
        "edited": false
      }
    ],
    "created_at": "2026-02-13T08:00:00Z",
    "updated_at": "2026-02-15T10:00:00Z"
  }
]
```

---

### Get Single Task

```
GET /tasks/{id}
```

**Response:** `200 OK` — Full task object (same shape as list item)

**Error:** `404 Not Found`
```json
{ "error": "Task not found" }
```

---

### Create Task

```
POST /tasks
```

**Request Body:**
```json
{
  "title": "New task title",
  "description": "Optional description",
  "status": "To Do",
  "priority": "Medium",
  "assignee_id": "m1",
  "gear_id": "1234",
  "blocking_reason": ""
}
```

**Notes:**
- `assignee_name` is resolved server-side from `assignee_id`
- `sub_tasks` and `daily_updates` are initialized as empty arrays
- `created_at` and `updated_at` are set server-side

**Response:** `201 Created` — Full created task object

**Errors:**
- `400 Bad Request` — Validation failure (see [Business Rules](#business-rules))

---

### Update Task

```
PATCH /tasks/{id}
```

**Request Body (partial — only include fields to update):**
```json
{
  "title": "Updated title",
  "status": "Blocked",
  "blocking_reason": "Waiting for DBA approval"
}
```

**Notes:**
- `updated_at` is set server-side on every update
- If `status` changes away from `"Blocked"`, server clears `blocking_reason`
- If `assignee_id` changes, server resolves new `assignee_name`

**Response:** `200 OK` — Full updated task object

**Errors:**
- `400 Bad Request` — Validation failure
- `404 Not Found` — Task does not exist

---

### Delete Task

```
DELETE /tasks/{id}
```

**Response:** `204 No Content`

**Error:** `404 Not Found`

---

## Sub-Tasks API

### Add Sub-Task

```
POST /tasks/{taskId}/subtasks
```

**Request Body:**
```json
{
  "title": "Sub-task title"
}
```

**Response:** `201 Created`
```json
{
  "id": "generated-uuid",
  "title": "Sub-task title",
  "completed": false
}
```

**Side Effect:** Parent task's `updated_at` is refreshed.

---

### Toggle Sub-Task Completion

```
PATCH /tasks/{taskId}/subtasks/{subTaskId}/toggle
```

**Request Body:** None

**Response:** `200 OK`
```json
{
  "id": "s1",
  "title": "Sub-task title",
  "completed": true
}
```

**Side Effect:** Parent task's `updated_at` is refreshed.

---

### Delete Sub-Task

```
DELETE /tasks/{taskId}/subtasks/{subTaskId}
```

**Response:** `204 No Content`

**Side Effect:** Parent task's `updated_at` is refreshed.

**Error:** `404 Not Found`

---

## Daily Updates API

### Add Daily Update

```
POST /tasks/{taskId}/updates
```

**Request Body:**
```json
{
  "author_id": "m1",
  "content": "Completed Jenkins setup. Waiting for dev team."
}
```

**Notes:**
- `author_name` is resolved server-side from `author_id`
- New updates are prepended (newest first)
- `edited` defaults to `false`

**Response:** `201 Created`
```json
{
  "id": "generated-uuid",
  "task_id": "t1",
  "author_id": "m1",
  "author_name": "Alice Chen",
  "content": "Completed Jenkins setup. Waiting for dev team.",
  "created_at": "2026-02-16T14:00:00Z",
  "updated_at": "2026-02-16T14:00:00Z",
  "edited": false
}
```

**Side Effect:** Parent task's `updated_at` is refreshed.

---

### Edit Daily Update

```
PATCH /tasks/{taskId}/updates/{updateId}
```

**Request Body:**
```json
{
  "content": "Updated content text"
}
```

**Notes:**
- Sets `edited = true` and refreshes `updated_at`
- **Only allowed within 24 hours** of `created_at`

**Response:** `200 OK` — Updated daily update object

**Errors:**
- `403 Forbidden` — `"Updates can only be edited within 24 hours."`
- `404 Not Found`

---

### Delete Daily Update

```
DELETE /tasks/{taskId}/updates/{updateId}
```

**Notes:**
- **Only allowed within 24 hours** of `created_at`

**Response:** `204 No Content`

**Errors:**
- `403 Forbidden` — `"Updates can only be deleted within 24 hours."`
- `404 Not Found`

---

## Team Members API

### List All Members

```
GET /members
```

**Response:** `200 OK`
```json
[
  {
    "id": "m1",
    "name": "Alice Chen",
    "email": "alice@devops.io",
    "active": true
  }
]
```

---

### Create Member

```
POST /members
```

**Request Body:**
```json
{
  "name": "New Member",
  "email": "new@devops.io",
  "active": true
}
```

**Response:** `201 Created` — Full member object with generated `id`

---

### Update Member

```
PATCH /members/{id}
```

**Request Body (partial):**
```json
{
  "name": "Updated Name",
  "active": false
}
```

**Response:** `200 OK` — Full updated member object

**Error:** `404 Not Found`

---

### Delete Member

```
DELETE /members/{id}
```

**Response:** `204 No Content`

**Error:**
- `409 Conflict` — `"Cannot delete member with N assigned task(s). Reassign or complete them first."`
- `404 Not Found`

---

## Error Handling

All error responses follow this shape:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes Used

| Code  | Meaning                                                                 |
|-------|-------------------------------------------------------------------------|
| `200` | Success (read/update)                                                   |
| `201` | Created (new resource)                                                  |
| `204` | No Content (successful delete)                                          |
| `400` | Bad Request (validation error — missing title, invalid GEAR ID, etc.)   |
| `403` | Forbidden (24-hour edit/delete window expired)                          |
| `404` | Not Found (resource doesn't exist)                                      |
| `409` | Conflict (e.g., deleting member with assigned tasks)                    |
| `500` | Internal Server Error                                                   |

---

## Business Rules

1. **Blocked tasks require a reason:** When `status = "Blocked"`, `blocking_reason` must be a non-empty string. Return `400` if missing.

2. **Blocking reason auto-clears:** When `status` changes away from `"Blocked"`, server must set `blocking_reason = ""`.

3. **GEAR ID format:** If provided, must match `/^\d{4}$/`. Return `400` if invalid.

4. **24-hour edit window:** Daily updates can only be edited or deleted within 24 hours of their `created_at` timestamp. Return `403` after that window.

5. **Member deletion constraint:** Cannot delete a team member who has any tasks assigned (`assignee_id` references them). Return `409` with count of assigned tasks.

6. **Assignee name resolution:** When `assignee_id` is set or changed, the server must resolve and store `assignee_name` from the team members table.

7. **Author name resolution:** When creating a daily update with `author_id`, the server must resolve and store `author_name`.

8. **Timestamps:** `created_at` is set once on creation. `updated_at` is refreshed on every modification to the resource or its children (sub-tasks, daily updates).

9. **Daily update ordering:** Updates are returned newest-first (descending `created_at`).

10. **Search:** The `search` query parameter on `GET /tasks` must match against `title`, `description`, and `gear_id` (case-insensitive partial match).

---

## Frontend ↔ Backend Field Mapping

The current frontend uses camelCase. The backend may use snake_case. The API client layer handles this mapping.

| Frontend (camelCase)  | Backend (snake_case)   |
|-----------------------|------------------------|
| `assigneeId`          | `assignee_id`          |
| `assigneeName`        | `assignee_name`        |
| `gearId`              | `gear_id`              |
| `blockingReason`      | `blocking_reason`      |
| `subTasks`            | `sub_tasks`            |
| `dailyUpdates`        | `daily_updates`        |
| `createdAt`           | `created_at`           |
| `updatedAt`           | `updated_at`           |
| `authorId`            | `author_id`            |
| `authorName`          | `author_name`          |
| `taskId`              | `task_id`              |

---

## Migration Notes

To swap from mock to real backend:

1. Create a `realClient.ts` implementing the same function signatures as `mock-api.ts`
2. Replace the import in consuming components: `import { ... } from '@/lib/api'`
3. Add camelCase ↔ snake_case transformation in the client layer
4. Remove `localStorage` seed data and artificial delays
5. Add proper error handling for network failures and HTTP error codes
