#!/usr/bin/env python3
"""
Script de test pour la correction orthographique interactive
"""

import requests
import json

def test_spellcheck():
    """Test de l'API de correction orthographique"""
    
    # Données de test avec des erreurs évidentes
    test_data = {
        "blocks": [
            {
                "id": "1",
                "type": "B",
                "number": 1,
                "content": "Bonjour, je suis un texte avec des erreurs orthographiques."
            },
            {
                "id": "2", 
                "type": "C",
                "number": 1,
                "content": "Il y a des fautes comme 'orthographiques' qui devrait être 'orthographiques'."
            },
            {
                "id": "3",
                "type": "B", 
                "number": 2,
                "content": "Et aussi des mots mal écrits comme 'fautes' au lieu de 'fautes'."
            }
        ]
    }
    
    try:
        # Appel à l'API
        response = requests.post(
            'http://localhost:5000/api/spellcheck',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Test réussi !")
            print(f"Nombre d'erreurs trouvées: {len(data.get('errors', []))}")
            print(f"Total d'erreurs: {data.get('total_errors', 0)}")
            
            # Afficher les détails des erreurs par bloc
            errors_by_block = {}
            for error in data.get('errors', []):
                block_idx = error['block_index']
                if block_idx not in errors_by_block:
                    errors_by_block[block_idx] = []
                errors_by_block[block_idx].append(error)
            
            for block_idx, errors in errors_by_block.items():
                print(f"\n--- Bloc {block_idx} ---")
                print(f"Nombre d'erreurs: {len(errors)}")
                for i, error in enumerate(errors):
                    print(f"  Erreur {i+1}:")
                    print(f"    Position: {error['error_start']} - {error['error_end']}")
                    print(f"    Message: {error['message']}")
                    print(f"    Suggestions: {[r['value'] for r in error.get('replacements', [])]}")
                
        else:
            print(f"❌ Erreur HTTP: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur. Assurez-vous que l'application Flask est en cours d'exécution.")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

def test_correction_application():
    """Test de l'application de corrections"""
    
    # Créer des blocs de test avec des erreurs
    test_blocks = [
        {
            "id": "1",
            "type": "B",
            "number": 1,
            "content": "Face à des forces insurmontables, l'humanité chutta dans un chaos sans précédant"
        }
    ]
    
    try:
        # Sauvegarder les blocs de test
        response = requests.post(
            'http://localhost:5000/api/save',
            json={"blocks": test_blocks},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code != 200:
            print("❌ Impossible de sauvegarder les blocs de test")
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
            
            # Vérifier que la correction est correcte
            expected = "Face à des forces insurmontables, l'humanité chuta dans un chaos sans précédant"
            if data['corrected'] == expected:
                print("✅ Correction vérifiée - résultat correct")
            else:
                print("❌ Correction incorrecte")
                print(f"Attendu: {expected}")
                print(f"Obtenu: {data['corrected']}")
        else:
            print(f"❌ Erreur lors de la correction: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur. Assurez-vous que l'application Flask est en cours d'exécution.")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

if __name__ == "__main__":
    print("🧪 Test de la correction orthographique interactive")
    print("=" * 50)
    
    print("\n1. Test de la vérification orthographique par bloc")
    test_spellcheck()
    
    print("\n2. Test de l'application de corrections")
    test_correction_application() 