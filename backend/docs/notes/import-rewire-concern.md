# Import Rewire Concern

Date: 2026-07-13

Concern:
- The runtime import paths were rewired from `backend/src/models/...` to `backend/src/model/prisma/...`.
- The files below those imports were intentionally left unchanged for this step.
- That means the codebase is now pointing at Prisma-backed model metadata, while any remaining Mongoose-style runtime logic still needs a later migration pass.

Files modified:
- `backend/src/controllers/authController.js`
- `backend/src/controllers/userController.js`
- `backend/src/helpers/actionRenderers.js`
- `backend/src/services/actionMessages/shared.js`
- `backend/src/tests/auth.test.js`
- `backend/src/tests/userController.test.js`
- `backend/src/tests/activityLogModel.test.js`

Follow-up:
- Keep the folder rename and import rewiring separate from the deeper service/controller conversion work.
- Do not treat this as the full Mongo-to-Prisma migration until the code under those imports is also updated.
