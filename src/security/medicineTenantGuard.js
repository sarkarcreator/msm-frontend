const DB_NAME = 'dsh-production-db';
const STORE_NAME = 'medicines';
const DB_VERSION = 9;
const CLEANUP_INTERVAL_MS = 30000;

function getScope() {
  return {
    role: localStorage.getItem('dsh_user_role') || '',
    licenseUuid: localStorage.getItem('dsh_license_uuid') || '',
    businessType: localStorage.getItem('dsh_business_type') || '',
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local database.'));
  });
}

async function isolateMedicines() {
  if (typeof window === 'undefined' || !window.indexedDB) return;

  const scope = getScope();
  if (scope.role === 'Super Admin' || !scope.licenseUuid) return;

  let db;
  try {
    db = await openDatabase();
    if (!db.objectStoreNames.contains(STORE_NAME)) return;

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;

        const row = cursor.value || {};
        const rowLicense = String(row.license_uuid || '').trim().toLowerCase();
        const currentLicense = String(scope.licenseUuid).trim().toLowerCase();

        if (rowLicense && rowLicense !== currentLicense) {
          cursor.delete();
        } else if (!rowLicense && row.sync_status === 'pending') {
          cursor.update({
            ...row,
            license_uuid: scope.licenseUuid,
            ...(scope.businessType ? { business_type: scope.businessType } : {}),
          });
        } else if (!rowLicense) {
          cursor.delete();
        }

        cursor.continue();
      };

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Medicine isolation failed.'));
      transaction.onabort = () => reject(transaction.error || new Error('Medicine isolation aborted.'));
    });
  } catch {
    // Local isolation must never block login, sync, or the main application.
  } finally {
    db?.close();
  }
}

export function startMedicineTenantGuard() {
  if (typeof window === 'undefined') return () => {};

  let timer = null;
  const run = () => {
    void isolateMedicines();
  };

  run();
  timer = window.setInterval(run, CLEANUP_INTERVAL_MS);
  window.addEventListener('focus', run);
  window.addEventListener('storage', run);

  return () => {
    if (timer) window.clearInterval(timer);
    window.removeEventListener('focus', run);
    window.removeEventListener('storage', run);
  };
}
