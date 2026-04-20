# @dosya-dev/shared

Shared TypeScript types and utilities for [dosya.dev](https://dosya.dev) clients.

## Install

```bash
npm install @dosya-dev/shared
```

## Usage

```typescript
import type { User, FileItem, Workspace, ApiResponse } from '@dosya-dev/shared'
```

## Exported Types

### User & Auth
- `User` — User profile (email, name, subscription, avatar)
- `Session` — Device session with IP and location

### Workspace
- `Workspace` — Workspace metadata
- `WorkspaceMember` — Member with role and join date
- `WorkspaceSettings` — Storage limits, upload settings, security policies

### Files & Folders
- `FileItem` — File metadata (name, size, mime type, locked/hidden)
- `FolderItem` — Folder metadata
- `FileVersion` — File version history
- `FileInfo` — Minimal file info for share links
- `FolderTreeNode` — Recursive folder tree

### Sharing
- `ShareLink` — Share link with token, password, expiry
- `FileRequest` — File request inbox

### Activity & Analytics
- `ActivityLog` — User action logs
- `DashboardStats` — Aggregated metrics
- `DashboardData` — Full dashboard payload

### Billing
- `PlanId` — `"free" | "starter" | "plus" | "pro" | "business"`
- `Subscription` — Plan status and period info

### API Responses
- `ApiSuccess<T>` — Success response wrapper
- `ApiError` — Error response
- `ApiResponse<T>` — Union of success/error
- `PaginatedResponse<T>` — Paginated list

## Utilities

```typescript
import { nowUnix, formatBytes, isValidEmail, validatePassword } from '@dosya-dev/shared'

nowUnix()                  // Current Unix timestamp (seconds)
formatBytes(1048576)       // "1.00 MB"
isValidEmail('a@b.com')   // true
validatePassword('abc')    // "Password must be at least 8 characters"
```

## License

[MIT](LICENSE)
