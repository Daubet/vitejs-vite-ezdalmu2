#!/usr/bin/env python3
"""
Script de test pour les corrections de texte
"""

import requests
import json

def test_apply_corrections():
    """Test de l'API de correction de texte"""
    
    # Test avec des erreurs évidentes
    test_cases = [
        {
            "name": "Correction simple",
            "original": "Face à des forces insurmontables, l'humanité chutta dans un chaos sans précédant",
            "corrections": [
                {
                    "error_start": 47,
                    "error_end": 53,
                    "replacement": "chuta"
                },
                {
                    "error_start": 70,
                    "error_end": 80,
                    "replacement": "précédent"
                }
            ],
            "expected": "Face à des forces insurmontables, l'humanité chuta dans un chaos sans précédent"
        },
        {
            "name": "Correction avec décalage",
            "original": "Il y a des fautes comme 'orthographiques' qui devrait être 'orthographiques'.",
            "corrections": [
                {
                    "error_start": 25,
                    "error_end": 38,
                    "replacement": "orthographiques"
                },
                {
                    "error_start": 15,
                    "error_end": 21,
                    "replacement": "fautes"
                }
            ],
            "expected": "Il y a des fautes comme 'orthographiques' qui devrait être 'orthographiques'."
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🧪 Test: {test_case['name']}")
        print(f"Original: {test_case['original']}")
        
        # Simuler l'application des corrections
        text = test_case['original']
        corrections = sorted(test_case['corrections'], key=lambda x: x['error_start'], reverse=True)
        
        for correction in corrections:
            start, end = correction['error_start'], correction['error_end']
            replacement = correction['replacement']
            
            text = text[:start] + replacement + text[end:]
            print(f"Après correction '{replacement}' ({start}-{end}): {text}")
        
        print(f"Attendu: {test_case['expected']}")
        print(f"Résultat: {text}")
        print(f"✅ {'CORRECT' if text == test_case['expected'] else '❌ INCORRECT'}")

def test_api_correction():
    """Test de l'API de correction"""
    
    # Créer un bloc de test
    test_block = {
        "id": "1",
        "type": "B",
        "number": 1,
        "content": "Face à des forces insurmontables, l'humanité chutta dans un chaos sans précédant"
    }
    
    try:
        # D'abord, sauvegarder le bloc de test
        response = requests.post(
            'http://localhost:5000/api/save',
            json={
                "blocks": [test_block]
            },
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code != 200:
            print("❌ Impossible de sauvegarder le bloc de test")
            return
        
        # Tester la correction
        correction_data = {
            "block_index": 0,
            "error_start": 47,
            "error_end": 53,
            "replacement": "chuta"
        }
        
        response = requests.post(
            'http://localhost:5000/api/apply-correction',
            json=correction_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Correction appliquée avec succès")
            print(f"Original: {data['original']}")
            print(f"Corrigé: {data['corrected']}")
        else:
            print(f"❌ Erreur lors de la correction: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur. Assurez-vous que l'application Flask est en cours d'exécution.")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

if __name__ == "__main__":
    print("🧪 Test des corrections de texte")
    print("=" * 50)
    
    print("\n1. Test de la logique de correction")
    test_apply_corrections()
    
    print("\n2. Test de l'API de correction")
    test_api_correction() 