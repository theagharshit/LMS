# 🛡️ `src/middlewares/` Directory Overview

This directory contains Express backend middleware modules for security, verification, and request processing.

---

## 📄 Files in `src/middlewares/`

- **`fileMiddleware.ts`**: Middleware function `verifyFileIntegrity` that intercepts incoming file upload requests to verify file safety, checksums, and maliciousness before passing to storage engines.
