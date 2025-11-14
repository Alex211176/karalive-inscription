// ===== CONFIG =====
const OWNER  = "alex211176";
const REPO   = "karalive-inscription";
const BRANCH = "main";

/* IMPORTANT :
   NE JAMAIS METTRE TON VRAI TOKEN SUR GITHUB.
   ICI, ON MET UN PLACEHOLDER.
   TU METTRAS TON VRAI TOKEN UNIQUEMENT EN LOCAL.
*/
const GITHUB_TOKEN = "PASTE_YOUR_TOKEN_HERE";

// URLs pour lecture simple
const URL_TITLES  = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/titles.json`;
const URL_INSCR   = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/inscriptions.json`;

// ===== Helpers =====
const $ = (q) => document.querySelector(q);

function setStatus(msg) {
  $("#status").textContent = msg;
}

function liText(r){
  return `${r.title} (${r.name})`
    + (r.key ? ` [${r.key}]` : "")
    + (r.note ? ` — ${r.note}` : "");
}

// ===== Chargement titres =====
async function loadTitles() {
  try {
    const res = await fetch(URL_TITLES, { cache: "no-store" });
    const data = await res.json();
    const list = data.titles || [];

    const dl = $("#titles");
    dl.innerHTML = "";
    list.forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      dl.appendChild(o);
    });

    $("#pillTitles").textContent = `${list.length} titres`;
  } catch(e) {
    setStatus("Impossible de charger la liste des titres.");
  }
}

// ===== Chargement inscriptions =====
async function loadInscriptions() {
  try {
    const res = await fetch(URL_INSCR, { cache: "no-store" });
    const arr = await res.json();
    const ul = $("#queueList");
    ul.innerHTML = "";
    arr.slice().reverse().forEach(r => {
      const li = document.createElement("li");
      li.textContent = liText(r);
      ul.appendChild(li);
    });
    $("#pillQueue").textContent = `${arr.length} envoyées`;
  } catch(e) {}
}

// ===== Ecriture sur GitHub (nécessite PAT local) =====
async function appendRegistration(reg) {
  if (GITHUB_TOKEN === "PASTE_YOUR_TOKEN_HERE")
    throw new Error("Token GitHub non configuré.");

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/inscriptions.json`;

  // Lire pour SHA
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    }
  });
  const info = await res.json();
  const sha = info.sha;
  const content = atob(info.content.replace(/\n/g, ""));
  let arr = [];
  try { arr = JSON.parse(content || "[]"); } catch {}

  arr.push(reg);
  const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(arr, null, 2))));

  const body = {
    message: `add inscription ${reg.title} (${reg.name})`,
    content: newContent,
    sha: sha,
    branch: BRANCH
  };

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error("Erreur GitHub : " + txt);
  }
}

// ===== Formulaire =====
$("#form").addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const reg = {
    name: $("#name").value.trim(),
    title: $("#title").value.trim(),
    key: $("#key").value.trim(),
    note: $("#note").value.trim(),
    ts: Date.now()
  };

  if (!reg.name || !reg.title) {
    setStatus("Nom et titre requis.");
    return;
  }

  setStatus("Envoi…");

  try {
    await appendRegistration(reg);
    setStatus("Inscription envoyée ✔️");
    $("#form").reset();
    loadInscriptions();
  } catch(e) {
    console.error(e);
    setStatus("Erreur d’envoi (token non configuré ?)");
  }
});

// ===== Init =====
(async () => {
  await loadTitles();
  await loadInscriptions();
  setStatus("Prêt.");
})();
