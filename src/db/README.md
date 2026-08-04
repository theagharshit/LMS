# 🗄️ `src/db/` Directory Overview

This directory contains backend database services and storage engine implementations.

---

## 📄 Files in `src/db/`

- **`fileStorageDB.ts`**: Dedicated server-side File Storage Database service that indexes, stores, and queries uploaded file records. Features checksum generation, integrity status tracking (`verified`), mimeType categorization, and classroom scoping.
