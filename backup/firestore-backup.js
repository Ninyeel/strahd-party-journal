// ============================================================
//  firestore-backup.js
//  Esporta tutti i dati Firestore in un file JSON locale.
//  Uso: node firestore-backup.js
// ============================================================

const admin = require("firebase-admin");
const fs    = require("fs");
const path  = require("path");

// Carica la chiave di servizio
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  "strahd-party-journal"
});

const db = admin.firestore();

// ── Collezioni di primo livello da esportare ──────────────────
// Aggiungine altre qui se in futuro crei nuove collezioni root
const ROOT_COLLECTIONS = [
  "users",
  "sessions",
  "campaigns"
];

// ── Helper: legge ricorsivamente una collezione + subcollection ─
async function exportCollection(colRef, depth = 0) {
  const snapshot = await colRef.get();
  const result   = {};

  for (const docSnap of snapshot.docs) {
    const docData = {
      _data: docSnap.data(),
      _subcollections: {}
    };

    // Leggi le subcollection del documento
    const subcols = await docSnap.ref.listCollections();
    for (const subCol of subcols) {
      docData._subcollections[subCol.id] = await exportCollection(subCol, depth + 1);
    }

    result[docSnap.id] = docData;
  }

  return result;
}

// ── Main ───────────────────────────────────────────────────────
async function runBackup() {
  console.log("⛧ Avvio backup Firestore...\n");

  const backup = {
    _meta: {
      projectId:   "strahd-party-journal",
      createdAt:   new Date().toISOString(),
      nodeVersion: process.version,
      collections: ROOT_COLLECTIONS
    }
  };

  for (const colName of ROOT_COLLECTIONS) {
    console.log(`  → Esporto collezione: ${colName}`);
    backup[colName] = await exportCollection(db.collection(colName));
    const count = Object.keys(backup[colName]).length;
    console.log(`     ${count} documenti trovati.`);
  }

  // Nome file con data e ora
  const now       = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename  = `backup-${timestamp}.json`;
  const outPath   = path.join(__dirname, "exports", filename);

  // Crea la cartella exports se non esiste
  const exportsDir = path.join(__dirname, "exports");
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`\n✓ Backup completato.`);
  console.log(`  File salvato in: backup/exports/${filename}`);
  console.log(`  Dimensione:      ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);

  process.exit(0);
}

runBackup().catch(err => {
  console.error("\n✗ Errore durante il backup:", err.message);
  process.exit(1);
});
