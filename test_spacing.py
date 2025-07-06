#!/usr/bin/env python3
"""
Test de la gestion des espaces lors des corrections
"""

import requests
import json

def test_spacing_corrections():
    """Test de la gestion des espaces lors des corrections"""
    
    print("🧪 Test de la gestion des espaces lors des corrections")
    print("=" * 60)
    
    # Cas de test avec des problèmes d'espacement
    test_cases = [
        {
            "name": "Mots collés après correction",
            "original": "sans pprécédentdans l'histoire",
            "corrections": [
                {
                    "start": 5,
                    "end": 15,
                    "replacement": "précédent",
                    "expected": "sans précédent dans l'histoire"
                }
            ]
        },
        {
            "name": "Espaces multiples",
            "original": "Il y a   beaucoup   d'espaces   ici",
            "corrections": [
                {
                    "start": 8,
                    "end": 15,
                    "replacement": "trop",
                    "expected": "Il y a trop d'espaces ici"
                }
            ]
        },
        {
            "name": "Correction en début de phrase",
            "original": "pprécedent dans l'histoire",
            "corrections": [
                {
                    "start": 0,
                    "end": 10,
                    "replacement": "Précédent",
                    "expected": "Précédent dans l'histoire"
                }
            ]
        },
        {
            "name": "Correction en fin de phrase",
            "original": "dans l'histoirre",
            "corrections": [
                {
                    "start": 8,
                    "end": 15,
                    "replacement": "histoire",
                    "expected": "dans l'histoire"
                }
            ]
        }
    ]
    
    try:
        for test_case in test_cases:
            print(f"\n📝 Test: {test_case['name']}")
            print(f"Original: '{test_case['original']}'")
            
            # Créer un bloc de test
            test_block = {
                "id": "1",
                "type": "B",
                "number": 1,
                "content": test_case['original']
            }
            
            # Sauvegarder le bloc
            response = requests.post(
                'http://localhost:5000/api/save',
                json={"blocks": [test_block]},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code != 200:
                print(f"❌ Impossible de sauvegarder le bloc de test")
                continue
            
            # Appliquer la correction
            correction = test_case['corrections'][0]
            correction_data = {
                "block_index": 0,
                "error_start": correction['start'],
                "error_end": correction['end'],
                "replacement": correction['replacement']
            }
            
            response = requests.post(
                'http://localhost:5000/api/apply-correction',
                json=correction_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                result = data['corrected']
                expected = correction['expected']
                
                print(f"Résultat: '{result}'")
                print(f"Attendu:  '{expected}'")
                
                if result == expected:
                    print("✅ CORRECT - Espacement géré correctement")
                else:
                    print("❌ INCORRECT - Problème d'espacement")
                    print(f"Différence: '{result}' vs '{expected}'")
            else:
                print(f"❌ Erreur lors de la correction: {response.status_code}")
                print(f"Réponse: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur.")
        print("💡 Assurez-vous que l'application Flask est en cours d'exécution:")
        print("   python app.py")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

def test_multiple_corrections():
    """Test de plusieurs corrections sur le même bloc"""
    
    print("\n🧪 Test de plusieurs corrections sur le même bloc")
    print("=" * 60)
    
    # Bloc avec plusieurs erreurs
    test_block = {
        "id": "1",
        "type": "B",
        "number": 1,
        "content": "Face à des forces insurmontables, l'humanité chutta dans un chaos sans précédant."
    }
    
    # Corrections à appliquer (triées par position décroissante)
    corrections = [
        {
            "start": 70,
            "end": 80,
            "replacement": "précédent"
        },
        {
            "start": 47,
            "end": 53,
            "replacement": "chuta"
        }
    ]
    
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
        
        # Appliquer les corrections une par une
        for i, correction in enumerate(corrections):
            correction_data = {
                "block_index": 0,
                "error_start": correction['start'],
                "error_end": correction['end'],
                "replacement": correction['replacement']
            }
            
            response = requests.post(
                'http://localhost:5000/api/apply-correction',
                json=correction_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"Après correction {i+1}: '{data['corrected']}'")
            else:
                print(f"❌ Erreur lors de la correction {i+1}: {response.status_code}")
        
        expected = "Face à des forces insurmontables, l'humanité chuta dans un chaos sans précédent."
        print(f"Attendu: '{expected}'")
        
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur.")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

if __name__ == "__main__":
    print("🧪 Test de la gestion des espaces")
    print("=" * 60)
    
    test_spacing_corrections()
    test_multiple_corrections()
    
    print("\n🎉 Tests terminés!") 