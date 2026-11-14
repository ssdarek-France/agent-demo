/*
 * Chat IA – démo pédagogique
 * Application 100 % statique : le navigateur appelle directement l'API du
 * fournisseur choisi avec la clé saisie par l'utilisateur.
 */
(() => {
  "use strict";

  const PROVIDERS = window.PROVIDERS;
  const $ = (id) => document.getElementById(id);

  // ---------- Éléments de la page ----------
  const el = {
    settings: $("settings"), provider: $("provider"), baseUrlRow: $("baseUrlRow"), baseUrl: $("baseUrl"),
    apiKey: $("apiKey"), toggleKey: $("toggleKey"), keyHint: $("keyHint"), rememberKey: $("rememberKey"),
    model: $("model"), modelList: $("modelList"), loadModels: $("loadModels"), modelHint: $("modelHint"),
    systemPrompt: $("systemPrompt"), temperature: $("temperature"), tempValue: $("tempValue"),
    testConn: $("testConn"), forgetKey: $("forgetKey"), status: $("status"),
    chatProvider: $("chatProvider"), chatModel: $("chatModel"), newChat: $("newChat"),
    messages: $("messages"), emptyState: $("emptyState"),
    composer: $("composer"), input: $("input"), sendBtn: $("sendBtn"), stopBtn: $("stopBtn"),
    openSettings: $("openSettings"), closeSettings: $("closeSettings"),
  };

  // ---------- Stockage ----------
  // Les réglages (fournisseur, modèle…) vont dans localStorage.
  // La clé va dans sessionStorage (oubliée à la fermeture de l'onglet),
  // sauf si l'utilisateur coche « Mémoriser », auquel cas localStorage.
  const store = {
    get(area, k) { try { return window[area].getItem(k); } catch { return null; } },
    set(area, k, v) { try { window[area].setItem(k, v); } catch { /* stockage indisponible */ } },
    del(area, k) { try { window[area].removeItem(k); } catch { /* idem */ } },
  };
  const SETTINGS_KEY = "chatia.settings";
  const keyName = (p) => `chatia.key.${p}`;

  function loadSettings() {
    try { return JSON.parse(store.get("localStorage", SETTINGS_KEY)) || {}; } catch { return {}; }
  }
  function saveSettings() {
    const s = loadSettings();
    s.provider = el.provider.value;
    s.models = s.models || {};
    s.models[el.provider.value] = el.model.value.trim();
    s.baseUrl = el.baseUrl.value.trim();
    s.systemPrompt = el.systemPrompt.value;
    s.temperature = el.temperature.value;
    store.set("localStorage", SETTINGS_KEY, JSON.stringify(s));
  }
  function readKey(p) {
    return store.get("sessionStorage", keyName(p)) || store.get("localStorage", keyName(p)) || "";
  }
  function writeKey(p, key, remember) {
    store.del("sessionStorage", keyName(p));
    store.del("localStorage", keyName(p));
    if (key) store.set(remember ? "localStorage" : "sessionStorage", keyName(p), key);
  }

  // ---------- État ----------
  let history = [];          // [{ role: "user" | "assistant", content: "..." }]
  let controller = null;     // AbortController de la requête en cours

  const current = () => {
    const id = el.provider.value;
    const p = PROVIDERS[id];
    return {
      id, ...p,
      baseUrl: (p.custom ? el.baseUrl.value.trim() : p.baseUrl).replace(/\/+$/, ""),
      key: el.apiKey.value.trim(),
      model: el.model.value.trim(),
    };
  };

  // ---------- Initialisation ----------
  function init() {
    for (const [id, p] of Object.entries(PROVIDERS)) {
      el.provider.add(new Option(p.label, id));
    }
    const s = loadSettings();
    el.provider.value = PROVIDERS[s.provider] ? s.provider : "groq";
    el.baseUrl.value = s.baseUrl || "";
    if (s.systemPrompt != null) el.systemPrompt.value = s.systemPrompt;
    if (s.temperature != null) el.temperature.value = s.temperature;
    el.tempValue.textContent = el.temperature.value;
    onProviderChange(false);
    bindEvents();
    // Sur mobile, on ouvre les réglages au premier lancement (pas encore de clé).
    if (!el.apiKey.value && window.matchMedia("(max-width: 760px)").matches) el.settings.classList.add("open");
  }

  function onProviderChange(save = true) {
    const id = el.provider.value;
    const p = PROVIDERS[id];
    const s = loadSettings();
    el.baseUrlRow.hidden = !p.custom;
    el.apiKey.value = readKey(id);
    el.rememberKey.checked = !!store.get("localStorage", keyName(id));
    el.model.value = (s.models && s.models[id]) || p.defaultModel;
    el.modelList.innerHTML = "";
    el.keyHint.innerHTML = p.keyUrl
      ? `Pas de clé ? <a href="${p.keyUrl}" target="_blank" rel="noopener noreferrer">Créez-en une ici</a>.`
      : "Laissez vide si votre serveur local n'en demande pas.";
    setStatus("");
    refreshHeader();
    if (save) saveSettings();
  }

  function refreshHeader() {
    const c = current();
    el.chatProvider.textContent = PROVIDERS[c.id].label.replace(/ \(.*\)$/, "");
    el.chatModel.textContent = c.model || "aucun modèle choisi";
  }

  function setStatus(text, kind = "") {
    el.status.textContent = text;
    el.status.className = "status " + kind;
  }

  // ---------- Événements ----------
  function bindEvents() {
    el.provider.addEventListener("change", () => onProviderChange());
    el.apiKey.addEventListener("input", () => {
      const k = el.apiKey.value.trim();
      writeKey(el.provider.value, k, el.rememberKey.checked);
      const prefix = PROVIDERS[el.provider.value].keyPrefix;
      if (k && prefix && !k.startsWith(prefix)) {
        setStatus(`⚠️ Une clé ${PROVIDERS[el.provider.value].label} commence en général par « ${prefix} ». Vérifiez le fournisseur choisi.`, "err");
      } else setStatus("");
    });
    el.rememberKey.addEventListener("change", () =>
      writeKey(el.provider.value, el.apiKey.value.trim(), el.rememberKey.checked));
    el.toggleKey.addEventListener("click", () => {
      el.apiKey.type = el.apiKey.type === "password" ? "text" : "password";
    });
    el.forgetKey.addEventListener("click", () => {
      writeKey(el.provider.value, "", false);
      el.apiKey.value = "";
      el.rememberKey.checked = false;
      setStatus("Clé effacée de ce navigateur.", "ok");
    });
    for (const input of [el.model, el.baseUrl, el.systemPrompt]) {
      input.addEventListener("change", () => { saveSettings(); refreshHeader(); });
    }
    el.model.addEventListener("input", refreshHeader);
    el.temperature.addEventListener("input", () => {
      el.tempValue.textContent = el.temperature.value;
      saveSettings();
    });
    el.loadModels.addEventListener("click", loadModels);
    el.testConn.addEventListener("click", testConnection);
    el.newChat.addEventListener("click", resetChat);
    el.composer.addEventListener("submit", (e) => { e.preventDefault(); send(); });
    el.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    el.input.addEventListener("input", autoGrow);
    el.stopBtn.addEventListener("click", () => controller && controller.abort());
    el.openSettings.addEventListener("click", () => el.settings.classList.add("open"));
    el.closeSettings.addEventListener("click", () => el.settings.classList.remove("open"));
  }

  function autoGrow() {
    el.input.style.height = "auto";
    el.input.style.height = Math.min(el.input.scrollHeight, 200) + "px";
  }

  // ---------- Appels API ----------
  function headersFor(c) {
    if (c.type === "anthropic") {
      return {
        "content-type": "application/json",
        "x-api-key": c.key,
        "anthropic-version": "2023-06-01",
        // Anthropic exige cet en-tête pour accepter un appel direct depuis un navigateur :
        // c'est leur façon de rappeler que la clé est alors exposée côté client.
        "anthropic-dangerous-direct-browser-access": "true",
      };
    }
    const h = { "content-type": "application/json" };
    if (c.key) h.authorization = `Bearer ${c.key}`;
    return h;
  }

  function checkConfig(c, needModel = true) {
    if (c.custom && !c.baseUrl) return "Indiquez l'URL de base de votre fournisseur.";
    if (!c.key && !c.custom) return "Collez d'abord votre clé API dans les réglages.";
    if (needModel && !c.model) return "Choisissez un modèle (bouton ↻ pour charger la liste).";
    return null;
  }

  async function fetchModels(c) {
    const res = await fetch(`${c.baseUrl}/models`, { headers: headersFor(c) });
    if (!res.ok) throw await httpError(res);
    const json = await res.json();
    let ids = (json.data || json.models || []).map((m) => String(m.id || m.name || "").replace(/^models\//, ""));
    ids = ids.filter(Boolean);
    if (c.modelFilter) ids = ids.filter(c.modelFilter);
    return [...new Set(ids)].sort();
  }

  async function loadModels() {
    const c = current();
    const problem = checkConfig(c, false);
    if (problem) return setStatus(problem, "err");
    el.loadModels.disabled = true;
    setStatus("Chargement des modèles…");
    try {
      const ids = await fetchModels(c);
      el.modelList.innerHTML = "";
      for (const id of ids) el.modelList.append(new Option(id, id));
      if (ids.length && !ids.includes(c.model)) {
        el.model.value = ids.includes(c.defaultModel) ? c.defaultModel : ids[0];
        saveSettings(); refreshHeader();
      }
      el.modelHint.textContent = `${ids.length} modèle(s) disponible(s). Cliquez dans le champ pour choisir.`;
      setStatus("✅ Liste des modèles chargée.", "ok");
    } catch (err) {
      setStatus(explain(err), "err");
    } finally {
      el.loadModels.disabled = false;
    }
  }

  async function testConnection() {
    const c = current();
    const problem = checkConfig(c, false);
    if (problem) return setStatus(problem, "err");
    setStatus("Test en cours…");
    try {
      const ids = await fetchModels(c);
      setStatus(`✅ Connexion réussie : la clé est acceptée (${ids.length} modèles).`, "ok");
    } catch (err) {
      setStatus(explain(err), "err");
    }
  }

  async function httpError(res) {
    let detail = "";
    try {
      const j = await res.json();
      detail = (j.error && (j.error.message || j.error)) || j.message || JSON.stringify(j);
    } catch { /* corps non JSON */ }
    const e = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    e.status = res.status;
    return e;
  }

  // Traduit une erreur technique en message compréhensible.
  function explain(err) {
    if (err.name === "AbortError") return "Réponse interrompue.";
    if (err instanceof TypeError) {
      return "❌ Impossible de joindre le fournisseur. Causes possibles : pas de connexion Internet, " +
        "URL incorrecte, ou le fournisseur refuse les appels directs depuis un navigateur (CORS).";
    }
    const d = err.message ? ` (${err.message})` : "";
    switch (err.status) {
      case 400: return `❌ Requête refusée par le fournisseur${d}.`;
      case 401: case 403: return `❌ Clé API refusée : vérifiez la clé et le fournisseur choisi${d}.`;
      case 404: return `❌ Introuvable : le nom du modèle ou l'URL est sans doute incorrect${d}.`;
      case 429: return `⏳ Limite atteinte (trop de requêtes ou quota épuisé). Réessayez dans un instant${d}.`;
      default: return `❌ Erreur ${err.status || ""}${d}.`;
    }
  }

  function buildRequest(c, withTemperature) {
    const system = el.systemPrompt.value.trim();
    const temperature = parseFloat(el.temperature.value);
    if (c.type === "anthropic") {
      const body = { model: c.model, max_tokens: 4096, messages: history, stream: true };
      if (system) body.system = system;
      if (withTemperature) body.temperature = Math.min(temperature, 1); // Anthropic : 0 à 1
      return { url: `${c.baseUrl}/messages`, body };
    }
    const messages = system ? [{ role: "system", content: system }, ...history] : history;
    const body = { model: c.model, messages, stream: true };
    if (withTemperature) body.temperature = temperature;
    return { url: `${c.baseUrl}/chat/completions`, body };
  }

  // Lit un flux SSE (Server-Sent Events) et appelle onText pour chaque morceau de texte.
  async function readStream(res, type, onText) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") { reader.cancel().catch(() => {}); return; } // fin du flux (OpenAI)
        if (!data) continue;
        let evt;
        try { evt = JSON.parse(data); } catch { continue; }
        if (evt.type === "message_stop") { reader.cancel().catch(() => {}); return; } // fin du flux (Anthropic)
        if (evt.error) {
          const e = new Error(evt.error.message || JSON.stringify(evt.error));
          e.status = evt.error.code || evt.error.status;
          throw e;
        }
        const text = type === "anthropic"
          ? (evt.type === "content_block_delta" && evt.delta && evt.delta.text) || ""
          : (evt.choices && evt.choices[0] && evt.choices[0].delta && evt.choices[0].delta.content) || "";
        if (text) onText(text);
      }
    }
  }

  // ---------- Conversation ----------
  async function send() {
    const text = el.input.value.trim();
    if (!text || controller) return;
    const c = current();
    const problem = checkConfig(c);
    if (problem) {
      addError(problem);
      el.settings.classList.add("open");
      return;
    }

    el.emptyState.hidden = true;
    history.push({ role: "user", content: text });
    addBubble("user", text);
    el.input.value = "";
    autoGrow();

    const bubble = addBubble("assistant", "");
    bubble.classList.add("typing");
    let answer = "";
    let frame = 0; // affichage regroupé : au plus un rendu par image écran
    const paint = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      bubble.innerHTML = renderMarkdown(answer);
      scrollDown();
    };

    setBusy(true);
    const started = performance.now();
    try {
      let res = await post(c, true);
      // Certains modèles (raisonnement) refusent le paramètre temperature : on réessaie sans.
      if (res.status === 400) {
        const err = await httpError(res);
        if (/temperature/i.test(err.message)) res = await post(c, false);
        else throw err;
      }
      if (!res.ok) throw await httpError(res);
      await readStream(res, c.type, (chunk) => {
        answer += chunk;
        if (!frame) frame = requestAnimationFrame(paint);
      });
      if (!answer) answer = "_(réponse vide)_";
      history.push({ role: "assistant", content: answer });
      paint();
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = `${c.model} · ${((performance.now() - started) / 1000).toFixed(1)} s`;
      bubble.append(meta);
    } catch (err) {
      if (answer) {
        // Réponse partielle (ex. bouton Stop) : on la garde dans l'historique.
        history.push({ role: "assistant", content: answer });
        paint();
      } else {
        bubble.remove();
        history.pop(); // on retire la question sans réponse pour pouvoir la renvoyer
        el.input.value = text;
      }
      addError(explain(err));
    } finally {
      bubble.classList.remove("typing");
      setBusy(false);
    }
  }

  function post(c, withTemperature) {
    const { url, body } = buildRequest(c, withTemperature);
    return fetch(url, {
      method: "POST",
      headers: headersFor(c),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  }

  function setBusy(busy) {
    controller = busy ? new AbortController() : null;
    el.sendBtn.hidden = busy;
    el.stopBtn.hidden = !busy;
    el.input.disabled = busy;
    if (!busy) el.input.focus();
  }

  function resetChat() {
    if (controller) controller.abort();
    history = [];
    el.messages.querySelectorAll(".msg").forEach((n) => n.remove());
    el.emptyState.hidden = false;
  }

  function addBubble(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    if (role === "user") div.textContent = text;
    else div.innerHTML = renderMarkdown(text);
    el.messages.append(div);
    scrollDown();
    return div;
  }

  function addError(text) {
    const div = document.createElement("div");
    div.className = "msg error";
    div.textContent = text;
    el.messages.append(div);
    el.emptyState.hidden = true;
    scrollDown();
  }

  function scrollDown() { el.messages.scrollTop = el.messages.scrollHeight; }

  // ---------- Mini-rendu Markdown (sécurisé) ----------
  // Tout le texte est d'abord échappé : le modèle ne peut pas injecter de HTML ni de script.
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderMarkdown(src) {
    const parts = escapeHtml(src).split(/```/);
    let html = "";
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        const code = part.replace(/^[\w+-]*\n/, "");
        html += `<pre><code>${code}</code></pre>`;
        return;
      }
      for (const block of part.split(/\n{2,}/)) {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) continue;
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          html += "<ul>" + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("") + "</ul>";
        } else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          html += "<ol>" + lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("") + "</ol>";
        } else if (lines.length === 1 && /^#{1,6}\s/.test(lines[0])) {
          html += `<h3>${inline(lines[0].replace(/^#+\s/, ""))}</h3>`;
        } else {
          html += `<p>${lines.map(inline).join("<br>")}</p>`;
        }
      }
    });
    return html;
  }

  init();
})();
