#!/usr/bin/env python3
"""
Script pour installer Tesseract OCR sur Windows
"""
import os
import sys
import zipfile
import requests
import subprocess
import shutil
from pathlib import Path

def download_file(url, filename):
    """Télécharger un fichier avec barre de progression"""
    print(f"Téléchargement de {filename}...")
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    with open(filename, 'wb') as f:
        downloaded = 0
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    print(f"\rProgression: {percent:.1f}%", end='', flush=True)
    print()

def install_tesseract():
    """Installer Tesseract OCR"""
    print("=== Installation de Tesseract OCR ===")
    
    # URL de téléchargement pour Windows
    tesseract_url = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.3.20231005/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
    
    # Créer le dossier d'installation
    install_dir = Path("C:/Program Files/Tesseract-OCR")
    if install_dir.exists():
        print("Tesseract est déjà installé dans C:/Program Files/Tesseract-OCR")
        return str(install_dir)
    
    # Télécharger l'installateur
    installer_path = "tesseract-installer.exe"
    try:
        download_file(tesseract_url, installer_path)
        
        print("Installation de Tesseract...")
        print("Suivez les instructions de l'installateur.")
        print("IMPORTANT: Installez dans C:\\Program Files\\Tesseract-OCR")
        
        # Lancer l'installateur
        subprocess.run([installer_path], check=True)
        
        # Attendre que l'installation soit terminée
        input("Appuyez sur Entrée une fois l'installation terminée...")
        
        # Vérifier l'installation
        if install_dir.exists():
            print("✅ Tesseract installé avec succès!")
            
            # Ajouter au PATH
            add_to_path(str(install_dir))
            
            return str(install_dir)
        else:
            print("❌ Installation échouée. Vérifiez que Tesseract est installé dans C:\\Program Files\\Tesseract-OCR")
            return None
            
    except Exception as e:
        print(f"❌ Erreur lors de l'installation: {e}")
        return None
    finally:
        # Nettoyer l'installateur
        if os.path.exists(installer_path):
            os.remove(installer_path)

def add_to_path(tesseract_path):
    """Ajouter Tesseract au PATH système"""
    try:
        # Ajouter au PATH de la session actuelle
        os.environ['PATH'] = tesseract_path + os.pathsep + os.environ.get('PATH', '')
        
        # Ajouter au PATH système (nécessite des droits admin)
        try:
            subprocess.run([
                'setx', 'PATH', 
                f'{tesseract_path};%PATH%'
            ], check=True, shell=True)
            print("✅ Tesseract ajouté au PATH système")
        except subprocess.CalledProcessError:
            print("⚠️ Impossible d'ajouter au PATH système (droits admin requis)")
            print("Vous devrez redémarrer votre terminal ou ajouter manuellement:")
            print(f"   {tesseract_path}")
            
    except Exception as e:
        print(f"⚠️ Erreur lors de l'ajout au PATH: {e}")

def test_tesseract():
    """Tester l'installation de Tesseract"""
    try:
        result = subprocess.run(['tesseract', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Tesseract fonctionne correctement!")
            print(f"Version: {result.stdout.strip()}")
            return True
        else:
            print("❌ Tesseract ne fonctionne pas")
            return False
    except FileNotFoundError:
        print("❌ Tesseract n'est pas trouvé dans le PATH")
        return False
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False

if __name__ == "__main__":
    print("Script d'installation de Tesseract OCR")
    print("=====================================")
    
    # Vérifier si Tesseract est déjà installé
    if test_tesseract():
        print("Tesseract est déjà installé et fonctionnel!")
        sys.exit(0)
    
    # Installer Tesseract
    tesseract_path = install_tesseract()
    
    if tesseract_path:
        print("\n=== Test de l'installation ===")
        if test_tesseract():
            print("\n🎉 Installation réussie! Vous pouvez maintenant utiliser la fonctionnalité OCR.")
        else:
            print("\n⚠️ Installation terminée mais Tesseract n'est pas détecté.")
            print("Redémarrez votre terminal et relancez le serveur Flask.")
    else:
        print("\n❌ Installation échouée.")
        print("Vous pouvez installer Tesseract manuellement depuis:")
        print("https://github.com/UB-Mannheim/tesseract/releases") 