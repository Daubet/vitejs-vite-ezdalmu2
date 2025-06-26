from app import app

# Configuration pour augmenter la taille maximale des requêtes
# Ces paramètres seront utilisés par le serveur WSGI (comme gunicorn, uwsgi)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB

if __name__ == "__main__":
    app.run() 