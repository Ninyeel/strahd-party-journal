// ============================================================
//  firebase-init.js
//  Configurazione Firebase condivisa da tutte le pagine
// ============================================================

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBbZdNw-2bfcNQqMuZ8IjQixRaTmtWChfc",
  authDomain:        "strahd-party-journal.firebaseapp.com",
  projectId:         "strahd-party-journal",
  storageBucket:     "strahd-party-journal.firebasestorage.app",
  messagingSenderId: "208866650232",
  appId:             "1:208866650232:web:9e0c4006c5130a6191e58d"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
