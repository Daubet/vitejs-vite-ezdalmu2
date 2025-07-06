# Correction Orthographique Interactive - Fonctionnalités

## 🎯 Vue d'ensemble

Le système de correction orthographique a été entièrement repensé pour offrir une expérience "Word-style" où l'utilisateur valide ou ignore chaque suggestion une par une.

## ✨ Nouvelles fonctionnalités

### 1. Modal de correction interactive
- **Interface moderne** : Modal avec compteur de progression
- **Contexte visuel** : L'erreur est mise en surbrillance dans le texte
- **Suggestions cliquables** : Liste des corrections proposées
- **Navigation intuitive** : Boutons Appliquer/Ignorer/Précédent

### 2. Raccourcis clavier
- **Enter** : Appliquer la correction sélectionnée
- **Escape** : Ignorer l'erreur actuelle
- **Flèche gauche** : Revenir à l'erreur précédente
- **Flèche droite** : Passer à l'erreur suivante

### 3. Historique des corrections
- **Annulation possible** : Possibilité de revenir en arrière
- **Sauvegarde progressive** : Les modifications sont sauvegardées automatiquement

### 4. Correction précise du texte
- **Remplacement exact** : Utilisation de slice-splice pour remplacer correctement
- **Tri par position** : Les corrections sont appliquées de la fin vers le début
- **API dédiée** : Endpoint `/api/apply-correction` pour les corrections
- **Gestion des espaces** : Normalisation automatique des espaces autour des corrections

### 5. Gestion intelligente des espaces
- **Normalisation** : `before.rstrip()` et `after.lstrip()` pour nettoyer les espaces
- **Intercalation** : Espace automatique avant et après chaque correction
- **Nettoyage final** : `.strip()` pour éliminer les espaces superflus
- **Prévention des mots-collés** : Évite les problèmes comme "sans pprécédentdans"

## 🔧 Améliorations techniques

### Backend (app.py)
- **Approche par bloc** : Appel de LanguageTool pour chaque bloc individuellement
- **Localisation précise** : Les positions sont directement relatives au contenu du bloc
- **Gestion robuste** : Vérification des positions valides et gestion des erreurs
- **API enrichie** : Retour des erreurs détaillées avec positions et suggestions
- **API `/api/apply-correction`** : Endpoint dédié aux corrections avec slice-splice

### Frontend (script.js)
- **Gestion d'état** : Variables pour suivre les erreurs et l'historique
- **Interface réactive** : Mise à jour en temps réel
- **Validation** : Vérification des positions avant affichage
- **Appel API** : Utilisation de l'API de correction pour les remplacements

### Styles (style.css)
- **Design cohérent** : Intégration avec le thème existant
- **Responsive** : Adaptation mobile
- **Accessibilité** : Contrastes et tailles appropriés

## 🚀 Utilisation

### Démarrage rapide
1. Cliquez sur le bouton "Ortho" dans la barre d'outils
2. Le modal s'ouvre avec la première erreur
3. Sélectionnez une suggestion ou cliquez "Ignorer"
4. Naviguez avec les flèches ou les boutons

### Fonctionnalités avancées
- **Navigation** : Utilisez les flèches pour naviguer entre les erreurs
- **Annulation** : Le bouton "Précédent" permet de revenir en arrière
- **Fermeture** : Cliquez à l'extérieur ou appuyez sur Escape

## 🐛 Corrections apportées

### Problème de localisation
**Avant** : Les erreurs étaient mal localisées à cause d'une variable `current_pos` mutable
**Après** : Utilisation d'un tableau `start_positions` fixe pour une localisation précise

### Problème de remplacement de texte
**Avant** : Les corrections étaient ajoutées au lieu d'être remplacées
**Après** : Utilisation de slice-splice avec tri par position décroissante

### Problème d'approche globale
**Avant** : Un seul appel à LanguageTool avec tout le texte concaténé (préfixes B1, C2, etc.)
**Après** : Appel de LanguageTool pour chaque bloc individuellement

### Problème des mots-collés
**Avant** : Les corrections créaient des mots-collés comme "sans pprécédentdans"
**Après** : Normalisation automatique des espaces avec `before.rstrip()`, `after.lstrip()` et intercalation d'espaces

### Avantages de l'approche par bloc
- **Précision** : Chaque offset est directement relatif au contenu du bloc
- **Simplicité** : Plus de calculs complexes de positions
- **Fiabilité** : Évite les problèmes de décalage d'index
- **Performance** : Timeout par bloc pour éviter les blocages
- **Robustesse** : Gestion des blocs vides et des erreurs HTTP

## 📊 Structure des données

### Réponse API Spellcheck
```json
{
  "report": "Problèmes : 5\n\n→ Erreur 1\n→ Erreur 2...",
  "errors": [
    {
      "block_index": 0,
      "error_start": 15,
      "error_end": 25,
      "message": "Faute d'orthographe",
      "replacements": [{"value": "correction"}],
      "context": "texte avec erreur",
      "rule_id": "FR_SPELLING_RULE"
    }
  ],
  "total_errors": 5
}
```

### API Apply Correction
```json
POST /api/apply-correction
{
  "block_index": 0,
  "error_start": 15,
  "error_end": 25,
  "replacement": "correction"
}

Response:
{
  "status": "success",
  "original": "texte avec erreur",
  "corrected": "texte avec correction",
  "block_index": 0
}
```

## 🧪 Tests

### Scripts de test disponibles :
- `test_spellcheck.py` : Test de l'API de vérification orthographique
- `test_corrections.py` : Test de la logique de correction de texte
- `test_spacing.py` : Test de la gestion des espaces lors des corrections

```bash
python test_spellcheck.py
python test_corrections.py
python test_spacing.py
```

## 🔮 Améliorations futures

- [ ] Support multilingue (anglais, espagnol, etc.)
- [ ] Corrections automatiques en lot
- [ ] Statistiques de correction
- [ ] Export des corrections appliquées
- [ ] Intégration avec d'autres outils de correction
- [ ] Mode "correction automatique" pour les erreurs évidentes 
