// ============================================================
//  common.js
//  Funzioni condivise da tutte le pagine del Party Journal
// ============================================================

import { auth, db } from "./firebase-init.js";
import {
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export { auth, db, onAuthStateChanged, doc, getDoc, setDoc };

const gp = new GoogleAuthProvider();

/* ── UI helpers ─────────────────────────────────────────────── */
export function hideOverlay(){
  document.getElementById("overlay")?.classList.add("hidden");
}

export function showScreen(id){
  ["screen-auth","screen-waiting","screen-app"].forEach(s=>{
    const el=document.getElementById(s);
    if(el) el.style.display="none";
  });
  const t=document.getElementById(id);
  if(t) t.style.display=(id==="screen-app")?"block":"flex";
}

export function toast(msg, dur=2800){
  const t=document.getElementById("toast");
  if(!t) return;
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), dur);
}

export function esc(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function showErr(msg){
  const e=document.getElementById("auth-error");
  if(e){ e.textContent=msg; e.style.display="block"; }
}
function hideErr(){
  const e=document.getElementById("auth-error");
  if(e) e.style.display="none";
}

/* ── Auth ────────────────────────────────────────────────────── */
export async function loginGoogle(){
  hideErr();
  try{ await signInWithPopup(auth, gp); }
  catch(e){ showErr(e.message); }
}

export async function loginEmail(){
  hideErr();
  const e=document.getElementById("auth-email")?.value.trim();
  const p=document.getElementById("auth-password")?.value;
  if(!e||!p){ showErr("Inserisci email e password."); return; }
  try{ await signInWithEmailAndPassword(auth, e, p); }
  catch(er){ showErr(er.code==="auth/invalid-credential"?"Email o password errati.":er.message); }
}

export async function registerEmail(){
  hideErr();
  const e=document.getElementById("auth-email")?.value.trim();
  const p=document.getElementById("auth-password")?.value;
  if(!e||!p){ showErr("Inserisci email e password."); return; }
  if(p.length<6){ showErr("Password minimo 6 caratteri."); return; }
  try{ await createUserWithEmailAndPassword(auth, e, p); toast("Registrazione OK!"); }
  catch(er){ showErr(er.message); }
}

export async function logout(){
  await signOut(auth);
  showScreen("screen-auth");
}

export function toggleUserMenu(){
  const m=document.getElementById("user-menu");
  if(m) m.style.display=m.style.display==="none"?"block":"none";
}

// Chiude il menu utente cliccando fuori
export function initUserMenuClose(){
  document.addEventListener("click", e=>{
    const nav=document.querySelector(".nav-user");
    if(nav&&!nav.contains(e.target)){
      const m=document.getElementById("user-menu");
      if(m) m.style.display="none";
    }
  });
}

/* ── Lettura profilo utente ──────────────────────────────────── */
export async function loadUserProfile(uid){
  const snap=await getDoc(doc(db,"users",uid));
  return snap.data()||{};
}

/* ── Ensure user (crea profilo se non esiste) ────────────────── */
export async function ensureUser(user){
  const ref=doc(db,"users",user.uid);
  const s=await getDoc(ref);
  if(!s.exists()){
    const n=prompt("Scegli il tuo nickname da avventuriero:")||user.email.split("@")[0];
    await setDoc(ref,{email:user.email,nickname:n,approved:false,createdAt:new Date()});
  }
}
