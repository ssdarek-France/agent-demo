/*
 * Catalogue des fournisseurs LLM.
 *
 * Pour ajouter un fournisseur « compatible OpenAI », il suffit d'ajouter une
 * entrée ici : son URL de base, un modèle par défaut et la page où l'on crée
 * une clé. Le reste de l'application n'a pas besoin d'être modifié.
 *
 * type "openai"    -> POST {baseUrl}/chat/completions, en-tête Authorization: Bearer <clé>
 * type "anthropic" -> POST {baseUrl}/messages, en-têtes x-api-key + anthropic-version
 *
 * Condition indispensable : le fournisseur doit autoriser les appels depuis un
 * navigateur (en-têtes CORS). Sinon le navigateur bloque la requête, et il faut
 * passer par un serveur intermédiaire (voir GUIDE.md, partie « Aller plus loin »).
 */
window.PROVIDERS = {
  groq: {
    label: "Groq",
    type: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    keyPrefix: "gsk_",
  },
  openai: {
    label: "OpenAI",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPrefix: "sk-",
    // On masque les modèles qui ne servent pas au chat (images, audio, embeddings…)
    modelFilter: (id) => /^(gpt|o\d|chatgpt)/.test(id) &&
      !/(audio|realtime|transcribe|tts|image|search|embedding|instruct)/.test(id),
  },
  mistral: {
    label: "Mistral AI",
    type: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    keyUrl: "https://console.mistral.ai/api-keys",
    modelFilter: (id) => !/(embed|moderation|ocr)/.test(id),
  },
  gemini: {
    label: "Google Gemini",
    type: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
    modelFilter: (id) => /gemini/.test(id) && !/(embedding|tts|image|live)/.test(id),
  },
  openrouter: {
    label: "OpenRouter (des centaines de modèles)",
    type: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    keyUrl: "https://openrouter.ai/keys",
    keyPrefix: "sk-or-",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-haiku-4-5",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPrefix: "sk-ant-",
  },
  custom: {
    label: "Autre (compatible OpenAI : Ollama, LM Studio…)",
    type: "openai",
    baseUrl: "",
    defaultModel: "",
    keyUrl: "",
    custom: true,
  },
};
