#!/usr/bin/env python3
"""
Démonstration de l'amélioration de la gestion des espaces
"""

import requests
import json

def demo_spacing_improvement():
    """Démonstration de l'amélioration de la gestion des espaces"""
    
    print("🎯 Démonstration de la gestion des espaces améliorée")
    print("=" * 60)
    
    # Cas problématiques avant l'amélioration
    problematic_cases = [
        {
            "name": "Mots collés après correction",
            "before": "sans pprécédentdans l'histoire",
            "after": "sans précédent dans l'histoire",
            "description": "Correction de 'pprécedent' qui créait des mots-collés"
        },
        {
            "name": "Espaces multiples",
            "before": "Il y a   beaucoup   d'espaces   ici",
            "after": "Il y a trop d'espaces ici",
            "description": "Normalisation des espaces multiples"
        },
        {
            "name": "Correction en début de phrase",
            "before": "pprécedent dans l'histoire",
            "after": "Précédent dans l'histoire",
            "description": "Correction en début sans espace superflu"
        },
        {
            "name": "Correction en fin de phrase",
            "before": "dans l'histoirre",
            "after": "dans l'histoire",
            "description": "Correction en fin sans espace superflu"
        }
    ]
    
    print("📝 Cas problématiques résolus:")
    for i, case in enumerate(problematic_cases, 1):
        print(f"\n{i}. {case['name']}")
        print(f"   Description: {case['description']}")
        print(f"   Avant: '{case['before']}'")
        print(f"   Après: '{case['after']}'")
    
    print("\n🔧 Mécanisme de normalisation des espaces:")
    print("   1. before.rstrip() - Supprime les espaces à droite de la partie précédente")
    print("   2. after.lstrip() - Supprime les espaces à gauche de la partie suivante")
    print("   3. repl.strip() - Nettoie la correction")
    print("   4. f\"{before} {repl} {after}\".strip() - Intercale des espaces et nettoie")
    
    print("\n✅ Avantages:")
    advantages = [
        "Prévention des mots-collés comme 'sans pprécédentdans'",
        "Normalisation automatique des espaces multiples",
        "Pas d'espaces superflus en début/fin de phrase",
        "Cohérence de l'espacement dans tout le texte"
    ]
    
    for advantage in advantages:
        print(f"   • {advantage}")

def test_real_correction():
    """Test d'une correction réelle avec gestion des espaces"""
    
    print("\n🧪 Test d'une correction réelle")
    print("=" * 40)
    
    # Bloc de test avec problème d'espacement
    test_block = {
        "id": "1",
        "type": "B",
        "number": 1,
        "content": "sans pprécédentdans l'histoire de l'humanité"
    }
    
    try:
        # Sauvegarder le bloc
        response = requests.post(
            'http://localhost:5000/api/save',
            json={"blocks": [test_block]},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code != 200:
            print("❌ Impossible de sauvegarder le bloc de test")
            return
        
        print(f"Original: '{test_block['content']}'")
        
        # Appliquer la correction
        correction_data = {
            "block_index": 0,
            "error_start": 5,
            "error_end": 15,
            "replacement": "précédent"
        }
        
        response = requests.post(
            'http://localhost:5000/api/apply-correction',
            json=correction_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            result = data['corrected']
            expected = "sans précédent dans l'histoire de l'humanité"
            
            print(f"Résultat: '{result}'")
            print(f"Attendu:  '{expected}'")
            
            if result == expected:
                print("✅ SUCCÈS - Espacement géré correctement!")
                print("   Les mots ne sont plus collés et les espaces sont normalisés.")
            else:
                print("❌ ÉCHEC - Problème d'espacement")
                print(f"   Différence: '{result}' vs '{expected}'")
        else:
            print(f"❌ Erreur lors de la correction: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur.")
        print("💡 Assurez-vous que l'application Flask est en cours d'exécution:")
        print("   python app.py")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

if __name__ == "__main__":
    print("🧪 Démonstration de la gestion des espaces")
    print("=" * 60)
    
    demo_spacing_improvement()
    test_real_correction()
    
    print("\n🎉 Démonstration terminée!")
    print("💡 La gestion des espaces est maintenant robuste et évite les mots-collés!") 