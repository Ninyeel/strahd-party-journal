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

export { auth, db, onAuthStateChanged };

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

/* ── SCROLL & HIGHLIGHT DA URL FRAGMENT ─────────────────────── */
export function initScrollToTarget(){
  const hash = window.location.hash;
  if(!hash || hash.length < 2) return;
  const id = decodeURIComponent(hash.slice(1));

  // Prova subito, poi riprova dopo che il DOM dinamico è caricato
  function tryScroll(){
    const el = document.getElementById(id);
    if(!el) return false;
    // Scroll con offset per la navbar sticky
    const navH = document.querySelector(".topnav")?.offsetHeight || 60;
    const top  = el.getBoundingClientRect().top + window.scrollY - navH - 12;
    window.scrollTo({ top, behavior:"smooth" });
    el.classList.add("search-target-highlight");
    setTimeout(()=>el.classList.remove("search-target-highlight"), 2600);
    return true;
  }

  // Primo tentativo immediato
  if(!tryScroll()){
    // Riprova ogni 200ms per max 3 secondi (attende il render dei dati Firestore)
    let attempts = 0;
    const interval = setInterval(()=>{
      attempts++;
      if(tryScroll() || attempts > 15) clearInterval(interval);
    }, 200);
  }
}

/* ── RICERCA GLOBALE ─────────────────────────────────────────── */
function openGlobalSearch(){
  document.getElementById("search-overlay")?.classList.add("open");
  setTimeout(()=>document.getElementById("search-input")?.focus(), 50);
}

function closeGlobalSearch(){
  document.getElementById("search-overlay")?.classList.remove("open");
  if(document.getElementById("search-input"))
    document.getElementById("search-input").value = "";
  if(document.getElementById("search-results"))
    document.getElementById("search-results").innerHTML =
      '<div class="search-hint">Inizia a digitare per cercare NPC, luoghi, incantesimi…</div>';
}

window.openGlobalSearch  = openGlobalSearch;
window.closeGlobalSearch = closeGlobalSearch;

export function initGlobalSearch(searchFn){
  // Inietta il pulsante nel nav se non esiste già
  const navUser = document.querySelector(".nav-user");
  if(!navUser || document.getElementById("global-search-btn")) return;

  const btn = document.createElement("button");
  btn.className = "search-btn";
  btn.id = "global-search-btn";
  btn.title = "Cerca (/)";
  btn.setAttribute("aria-label", "Apri ricerca globale");
  btn.innerHTML = "🔍";
  btn.addEventListener("click", e=>{
    e.stopPropagation();
    openGlobalSearch();
  });
  navUser.parentElement.insertBefore(btn, navUser);

  // Inietta il pannello di ricerca nel body
  if(!document.getElementById("search-overlay")){
    const overlay = document.createElement("div");
    overlay.id = "search-overlay";
    overlay.className = "search-overlay";
    overlay.innerHTML = `
      <div class="search-box">
        <div class="search-input-wrap">
          <span style="color:var(--text-dim);font-size:16px">🔍</span>
          <input id="search-input" placeholder="Cerca in tutta la campagna…" autocomplete="off">
          <button class="search-close" onclick="closeGlobalSearch()">✕</button>
        </div>
        <div class="search-results" id="search-results">
          <div class="search-hint">Inizia a digitare per cercare NPC, luoghi, incantesimi…</div>
        </div>
      </div>
    `;
    overlay.addEventListener("click", e=>{
      if(e.target === overlay) closeGlobalSearch();
    });
    document.body.appendChild(overlay);
  }

  // Listener sull'input
  document.getElementById("search-input").addEventListener("input", e=>{
    const q = e.target.value.trim();
    if(q.length < 2){
      document.getElementById("search-results").innerHTML =
        '<div class="search-hint">Inizia a digitare per cercare NPC, luoghi, incantesimi…</div>';
      return;
    }
    const results = searchFn(q);
    renderSearchResults(results, q);
  });

  // Scorciatoia tastiera: / per aprire, Esc per chiudere
  document.addEventListener("keydown", e=>{
    if(e.key === "/" && !e.ctrlKey && !e.metaKey){
      const active = document.activeElement;
      const isEditing = active && (active.tagName==="INPUT"||active.tagName==="TEXTAREA"||active.isContentEditable);
      if(!isEditing){ e.preventDefault(); openGlobalSearch(); }
    }
    if(e.key === "Escape") closeGlobalSearch();
  });

  // Supporto ricerca asincrona (pagine non-index)
  document.addEventListener("searchready", ()=>{
    if(window._lastSearchResults && window._lastSearchQuery){
      renderSearchResults(window._lastSearchResults, window._lastSearchQuery);
    }
  });
}

function highlight(text, q){
  if(!text) return "";
  // Rimuove tag HTML per il testo da mostrare
  const plain = text.replace(/<[^>]+>/g,"");
  const idx = plain.toLowerCase().indexOf(q.toLowerCase());
  if(idx === -1) return plain.slice(0,80);
  const start = Math.max(0, idx-30);
  const end   = Math.min(plain.length, idx+q.length+50);
  const snippet = (start>0?"…":"")+plain.slice(start,end)+(end<plain.length?"…":"");
  return snippet.replace(
    new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),
    m=>`<mark>${m}</mark>`
  );
}

function renderSearchResults(groups, q){
  const container = document.getElementById("search-results");
  if(!container) return;

  const hasResults = groups.some(g=>g.items.length>0);
  if(!hasResults){
    container.innerHTML = '<div class="search-empty">Nessun risultato per "'+q+'"</div>';
    return;
  }

  container.innerHTML = groups
    .filter(g=>g.items.length>0)
    .map(g=>`
      <div class="search-group">
        <div class="search-group-header">${g.label} (${g.items.length})</div>
        ${g.items.slice(0,5).map(item=>`
          <a class="search-result" href="${item.href}" onclick="closeGlobalSearch()">
            <div class="search-result-name">${item.name}</div>
            ${item.sub?`<div class="search-result-sub">${highlight(item.sub,q)}</div>`:""}
          </a>
        `).join("")}
        ${g.items.length>5?`<div style="padding:6px 14px;font-size:12px;color:var(--text-dim);font-style:italic">+${g.items.length-5} altri risultati — affina la ricerca</div>`:""}
      </div>
    `).join("");
}
