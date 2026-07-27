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

## Transparency

Every dosya.dev client is source-available. Your files are yours — this repository lets
you verify exactly what our clients send to and receive from our servers: what gets
uploaded, what metadata travels with it, and what comes back. If a claim we make about
privacy or sync behavior can't be verified in this code, open an issue and call it out.

## License

Source-available under the [Dosya Source Available License 1.0](LICENSE):

- **You can** read and audit the code, use it when building and running the official
  dosya.dev clients, and contribute improvements.
- **You can't** redistribute it, use it with any backend other than dosya.dev, or offer
  it as a service. Building your own integration? Use the MIT-licensed
  [dosya-js](https://github.com/dosya-dev/dosya-js) or
  [dosya-java](https://github.com/dosya-dev/dosya-java) SDKs instead.

See [LICENSE](LICENSE) for the exact terms. Versions of this code previously published
under the MIT license remain MIT for those who obtained them then.

## Contributing

Issues and pull requests are welcome. By submitting a contribution you license it to
dosya.dev under the contribution terms in [LICENSE](LICENSE).

## Security

Found a vulnerability? Please report it privately via
[GitHub private vulnerability reporting](../../security/advisories/new) rather than a
public issue.

## The dosya.dev client family

| Repository | What it is | License |
|---|---|---|
| [desktop](https://github.com/dosya-dev/desktop) | Desktop client — sync, upload, manage | Source-available |
| [cli](https://github.com/dosya-dev/cli) | Command-line interface | Source-available |
| [app.dosya.dev](https://github.com/dosya-dev/app.dosya.dev) | Web application | Source-available |
| [shared](https://github.com/dosya-dev/shared) | Shared TypeScript types & utilities | Source-available |
| [dosya-js](https://github.com/dosya-dev/dosya-js) | Official JavaScript SDK | MIT |
| [dosya-java](https://github.com/dosya-dev/dosya-java) | Official Java SDK | MIT |
