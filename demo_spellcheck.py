#!/usr/bin/env python3
"""
Démonstration de l'amélioration de la correction orthographique
"""

import requests
import json
import time

def demo_spellcheck_improvement():
    """Démonstration de l'amélioration de la correction orthographique"""
    
    print("🎯 Démonstration de la correction orthographique améliorée")
    print("=" * 60)
    
    # Données de test avec des erreurs évidentes
    test_data = {
        "blocks": [
            {
                "id": "1",
                "type": "B",
                "number": 1,
                "content": "Face à des forces insurmontables, l'humanité chutta dans un chaos sans précédant."
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
        print("📝 Test avec les blocs suivants:")
        for i, block in enumerate(test_data['blocks']):
            print(f"  Bloc {i+1} ({block['type']}{block['number']}): {block['content']}")
        
        print("\n🔍 Vérification orthographique...")
        start_time = time.time()
        
        response = requests.post(
            'http://localhost:5000/api/spellcheck',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        end_time = time.time()
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Vérification terminée en {end_time - start_time:.2f}s")
            print(f"📊 Résultats:")
            print(f"  - Total d'erreurs: {data.get('total_errors', 0)}")
            print(f"  - Erreurs détaillées: {len(data.get('errors', []))}")
            
            # Afficher les erreurs par bloc
            errors_by_block = {}
            for error in data.get('errors', []):
                block_idx = error['block_index']
                if block_idx not in errors_by_block:
                    errors_by_block[block_idx] = []
                errors_by_block[block_idx].append(error)
            
            for block_idx, errors in errors_by_block.items():
                block = test_data['blocks'][block_idx]
                print(f"\n📋 Bloc {block_idx + 1} ({block['type']}{block['number']}):")
                print(f"  Contenu: {block['content']}")
                print(f"  Erreurs trouvées: {len(errors)}")
                
                for i, error in enumerate(errors):
                    print(f"    Erreur {i+1}:")
                    print(f"      Position: {error['error_start']}-{error['error_end']}")
                    print(f"      Texte: '{block['content'][error['error_start']:error['error_end']]}'")
                    print(f"      Message: {error['message']}")
                    suggestions = [r['value'] for r in error.get('replacements', [])]
                    print(f"      Suggestions: {suggestions}")
            
            # Tester une correction
            if data.get('errors'):
                print(f"\n🔧 Test d'application de correction...")
                first_error = data['errors'][0]
                
                correction_data = {
                    "block_index": first_error['block_index'],
                    "error_start": first_error['error_start'],
                    "error_end": first_error['error_end'],
                    "replacement": first_error['replacements'][0]['value'] if first_error.get('replacements') else "correction"
                }
                
                response = requests.post(
                    'http://localhost:5000/api/apply-correction',
                    json=correction_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    correction_result = response.json()
                    print("✅ Correction appliquée avec succès!")
                    print(f"  Avant: {correction_result['original']}")
                    print(f"  Après: {correction_result['corrected']}")
                else:
                    print(f"❌ Erreur lors de la correction: {response.status_code}")
            
        else:
            print(f"❌ Erreur HTTP: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur.")
        print("💡 Assurez-vous que l'application Flask est en cours d'exécution:")
        print("   python app.py")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

def show_improvements():
    """Afficher les améliorations apportées"""
    
    print("\n🚀 Améliorations apportées:")
    print("=" * 40)
    
    improvements = [
        "✅ Approche par bloc: chaque bloc est vérifié individuellement",
        "✅ Localisation précise: les positions sont directement relatives au contenu",
        "✅ Plus de décalage d'index: évite les erreurs de position",
        "✅ Gestion robuste: timeout et gestion d'erreurs par bloc",
        "✅ Interface interactive: modal avec navigation et raccourcis",
        "✅ Corrections précises: slice-splice pour remplacer exactement",
        "✅ Historique: possibilité d'annuler les corrections",
        "✅ API dédiée: endpoint /api/apply-correction pour les corrections"
    ]
    
    for improvement in improvements:
        print(f"  {improvement}")

if __name__ == "__main__":
    print("🧪 Démonstration de la correction orthographique")
    print("=" * 60)
    
    demo_spellcheck_improvement()
    show_improvements()
    
    print("\n🎉 Démonstration terminée!")
    print("💡 Vous pouvez maintenant tester l'interface web en ouvrant http://localhost:5000") 