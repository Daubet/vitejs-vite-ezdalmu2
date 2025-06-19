# Éditeur Webtoon

Une application web pour créer et gérer des scripts de webtoon, construite avec Flask, HTML, CSS et JavaScript.

## Fonctionnalités

- Création et édition de blocs de script avec différents types (HB, B, DB, C)
- Ajout de types personnalisés
- Suggestions d'amélioration via l'API Gemini
- Vérification orthographique via LanguageTool
- Export en fichier DOCX
- Sauvegarde/chargement de projets
- Mode clair/sombre
- Interface responsive

## Installation

1. Clonez ce dépôt
2. Installez les dépendances:
   ```
   pip install -r requirements.txt
   ```
3. Lancez l'application:
   ```
   python app.py
   ```
4. Ouvrez votre navigateur à l'adresse `http://localhost:5000`

## Configuration

Pour utiliser les fonctionnalités d'IA, vous devez obtenir une clé API pour Gemini et la configurer dans l'interface utilisateur (section Outils).

## Structure du projet

- `app.py` - Application Flask principale
- `templates/` - Contient les modèles HTML
- `static/` - Ressources statiques (CSS, JS)
  - `css/style.css` - Styles de l'application
  - `js/script.js` - Code JavaScript pour l'interface utilisateur
- `data/` - Dossier de stockage des données projet

## Développement

Cette application est la version Python/Flask d'une application initialement développée en React.
