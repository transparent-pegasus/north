# Firestore Connection Fix Report

## Issue

Production deployment failed with `Error: 14 UNAVAILABLE` and `Protocol error` when connecting to Firestore.

## Cause

The `backend/src/setup.ts` script was forcefully applying local emulator settings (connecting to `127.0.0.1:8080`) even in the production environment. This caused the deployed function to try to connect to itself instead of the Google Cloud Firestore service.

## Resolution

Modified `backend/src/setup.ts` to only apply emulator settings when `FUNCTIONS_EMULATOR` environment variable is set to `"true"`.

## Next Steps

Please run `make deploy` again. The application should now correctly connect to the production Firestore database. No additional manual configuration is required.
