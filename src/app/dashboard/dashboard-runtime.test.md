# Dashboard V2 integration checks

- Existing dashboard remains the fallback when the runtime enhancer cannot mount.
- Dashboard V2 reads business-scoped IndexedDB records through `listRecords`.
- Quick actions delegate to the existing module navigation buttons.
- Business-specific labels/actions are selected from the saved business type.
- The runtime refreshes every 30 seconds and listens for `msm:dashboard-refresh`.
- No backend routes, API contracts, or database schemas are changed.
