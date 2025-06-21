from flask import Flask, render_template, request, jsonify, send_file
import os
import json
import requests
import docx
from docx.shared import RGBColor
import io
import tempfile
import logging

app = Flask(__name__)
app.config['SECRET_KEY'] = 'webtoon-editor-secret-key'
logging.basicConfig(level=logging.INFO)

# Ensure the data directory exists
if not os.path.exists('data'):
    os.makedirs('data')

# File to store project data
DATA_FILE = 'data/project_data.json'

# Initialize default data
def get_default_data():
    return {
        'blocks': [],
        'blockTypes': ['HB', 'B', 'DB', 'C']
    }

# Load project data
def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Error loading data: {str(e)}")
            return get_default_data()
    return get_default_data()

# Save project data
def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/load', methods=['GET'])
def api_load():
    return jsonify(load_data())

@app.route('/api/save', methods=['POST'])
def api_save():
    data = request.json
    if data is None:
        return jsonify({"error": "Invalid JSON"}), 400
    save_data(data)
    return jsonify({"status": "success"})

@app.route('/api/spellcheck', methods=['POST'])
def api_spellcheck():
    data = request.json
    if data is None:
        return jsonify({"error": "Invalid JSON"}), 400
    
    blocks = data.get('blocks', [])
    
    if not blocks:
        return jsonify({"error": "No blocks to check"})
    
    # Prepare text for LanguageTool API
    text = "\n".join([f"{b['type']}{b['number']} {b['content']}" for b in blocks])
    
    try:
        response = requests.post(
            'https://api.languagetool.org/v2/check',
            data={
                'text': text,
                'language': 'fr'
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if not data.get('matches', []):
                return jsonify({"report": "✅ Aucun problème"})
            
            matches = data.get('matches', [])[:20]
            report = f"Problèmes : {len(data.get('matches', []))}\n\n"
            report += "\n".join([f"→ {m.get('message', '')}" for m in matches])
            
            return jsonify({"report": report})
        else:
            return jsonify({"error": "API Error", "details": response.text})
    except Exception as e:
        logging.error(f"Spellcheck error: {str(e)}")
        return jsonify({"error": "Network Error", "details": str(e)})

@app.route('/api/gemini', methods=['POST'])
def api_gemini():
    data = request.json
    if data is None:
        return jsonify({"error": "Invalid JSON"}), 400
    
    api_key = data.get('api_key', '')
    content = data.get('content', '')
    
    if not api_key or not content:
        return jsonify({"error": "Missing API key or content"})
    
    prompt = f"""
Réécris ou corrige en français.
Fournis 3 variantes concises, **sans parenthèses ni explication**, une par ligne :
« {content} »"""
    
    try:
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}',
            json={
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {'temperature': 0.8, 'candidateCount': 1}
            }
        )
        
        if response.status_code != 200:
            return jsonify({"error": response.json().get('error', {}).get('message', response.text)})
        
        data = response.json()
        raw_text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        
        suggestions = []
        for line in raw_text.split('\n'):
            line = line.strip()
            if line:
                # Remove bullets, numbers, and explanations in parentheses
                line = line.lstrip('•-0123456789. \t')
                line = line.split('(', 1)[0].strip()
                if line:
                    suggestions.append(line)
        
        return jsonify({"suggestions": suggestions[:3]})
    except Exception as e:
        logging.error(f"Gemini API error: {str(e)}")
        return jsonify({"error": str(e)})

@app.route('/api/export-docx', methods=['POST'])
def export_docx():
    data = request.json
    if data is None:
        return jsonify({"error": "Invalid JSON"}), 400
    
    blocks = data.get('blocks', [])
    
    if not blocks:
        return jsonify({"error": "No blocks to export"})
    
    # Create document
    doc = docx.Document()
    
    # Add blocks
    for block in blocks:
        p = doc.add_paragraph()
        block_type_number = f"{block['type']}{block['number']} "
        p.add_run(block_type_number).bold = True
        p.add_run(block['content'])
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
        doc.save(tmp.name)
        tmp_path = tmp.name
    
    # Send file
    return send_file(
        tmp_path,
        as_attachment=True,
        download_name='script_webtoon.docx',
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

if __name__ == '__main__':
    app.run(debug=True) 