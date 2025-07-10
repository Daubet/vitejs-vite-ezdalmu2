import webbrowser
import threading
import time
from app import app

def open_browser():
    time.sleep(1)  # Laisse le serveur démarrer
    webbrowser.open("http://127.0.0.1:5000/")

if __name__ == "__main__":
    threading.Thread(target=open_browser).start()
    app.run(debug=False) 