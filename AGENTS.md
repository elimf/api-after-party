# Directives Agentiques — AfterParty Backend

## 🎯 Périmètre
Tu travailles sur le serveur/API d'AfterParty (gestion du moteur de jeu, des salons websockets, du calcul des scores et du stockage des questions).

## 🔄 Workflow de Développement
1. **Planification :** Analyse les modèles de données et la logique de la partie avant de modifier un endpoint ou un socket.
2. **Modularité :** Isole la logique pure du jeu (Game Engine) des contrôleurs d'API / WebSockets.
3. **Tests & Sécurité :**
   - Exécute les tests unitaires backend (`npm test` ou `pytest`).
   - Vérifie que les données sensibles (ex: bonnes réponses du Quizz) ne sont PAS envoyées aux joueurs avant la fin du temps imparti.

## ⚠️ Interdictions
* ❌ Ne modifie jamais le schéma de BDD sans proposer une migration propre.
* ❌ Ne fais aucun commit sur Git sans validation.