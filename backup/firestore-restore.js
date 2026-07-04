// ============================================================
//  firestore-restore.js
//  Ripristina i dati Firestore da un file di backup JSON.
//
//  Uso: node firestore-restore.js backup-2025-06-01T14-30-00.json
//
//  ATTENZIONE: questo script SOVRASCRIVE i documenti esistenti.
//  Non elimina documenti non presenti nel backup.
// ============================================================

const admin = require("firebase-admin");
const fs    = require("fs");
const path  = require("path");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  "strahd-party-journal"
});

const db = admin.firestore();

// ── Helper: scrive ricorsivamente documenti + subcollection ───
async function restoreCollection(colRef, data) {
  for (const [docId, docContent] of Object.entries(data)) {
    const docRef  = colRef.doc(docId);
    const docData = docContent._data || {};

    // Ripristina il documento
    await docRef.set(docData, { merge: true });

    // Ripristina le subcollection
    const subcols = docContent._subcollections || {};
    for (const [subColId, subColData] of Object.entries(subcols)) {
      await restoreCollection(docRef.collection(subColId), subColData);
    }
  }
}

// ── Main ───────────────────────────────────────────────────────
async function runRestore() {
  // Leggi il nome del file dal parametro da riga di comando
  const filename = process.argv[2];
  if (!filename) {
    console.error("✗ Specifica il file di backup da ripristinare.");
    console.error("  Uso: node firestore-restore.js nome-del-file.json");
    process.exit(1);
  }

  const filePath = path.join(__dirname, "exports", filename);
  if (!fs.existsSync(filePath)) {
    console.error(`✗ File non trovato: ${filePath}`);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const meta   = backup._meta || {};

  console.log("⛧ Avvio ripristino Firestore...");
  console.log(`  File:      ${filename}`);
  console.log(`  Creato il: ${meta.createdAt || "sconosciuto"}`);
  console.log(`  Progetto:  ${meta.projectId || "sconosciuto"}`);
  console.log("");
  console.log("  ATTENZIONE: i documenti esistenti verranno sovrascritti.");
  console.log("  Premi Ctrl+C per annullare. Il ripristino inizia tra 5 secondi...\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  const collections = Object.keys(backup).filter(k => k !== "_meta");

  for (const colName of collections) {
    console.log(`  → Ripristino collezione: ${colName}`);
    await restoreCollection(db.collection(colName), backup[colName]);
    console.log(`     ✓ Completato.`);
  }

  console.log("\n✓ Ripristino completato con successo.");
  process.exit(0);
}

runRestore().catch(err => {
  console.error("\n✗ Errore durante il ripristino:", err.message);
  process.exit(1);
});