# Chat IA – démo multi-fournisseurs

Application web de chat **100 % statique** : chaque utilisateur choisit son fournisseur LLM (Groq, OpenAI, Mistral, Gemini, OpenRouter, Anthropic, ou un serveur compatible OpenAI comme Ollama), saisit **sa propre** clé API, et discute avec le modèle. Les réponses s'affichent au fil de l'eau.

- Aucun serveur, aucune base de données : hébergeable gratuitement sur Firebase Hosting.
- La clé reste dans le navigateur de l'utilisateur (oubliée à la fermeture de l'onglet, sauf s'il coche « Mémoriser ») et n'est envoyée qu'au fournisseur choisi.
- Aucune clé ne doit jamais être écrite dans ce dépôt.

## Démarrage rapide

```bash
npx serve public                  # test en local
firebase deploy --only hosting    # mise en ligne (après avoir renseigné .firebaserc)
```

Le guide complet, pas à pas (GitHub, Firebase, déploiement automatique, limites de sécurité, exercices), est dans [GUIDE.md](GUIDE.md).

## Ajouter un fournisseur

Ajoutez une entrée dans `public/providers.js` : URL de base, modèle par défaut, page de création de clé. Tout fournisseur compatible avec l'API OpenAI (`/chat/completions`, `/models`) et qui autorise les appels depuis un navigateur (CORS) fonctionne sans autre modification.

## ⚠️ Limite connue

La clé API est visible dans les outils de développement du navigateur. C'est acceptable pour une démo où chacun utilise sa propre clé, **pas** pour une application qui utiliserait votre clé : il faudrait alors un serveur intermédiaire (voir GUIDE.md, partie 7).
