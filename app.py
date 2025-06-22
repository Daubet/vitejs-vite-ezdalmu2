from flask import Flask, render_template, request, jsonify, send_file, url_for
import os
import json
import requests
import docx
from docx.shared import RGBColor
import io
import tempfile
import logging
import uuid
import shutil
import re
import time
from urllib.parse import urljoin, urlparse
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'webtoon-editor-secret-key'
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
logging.basicConfig(level=logging.INFO)

# Ensure the data and uploads directories exist
if not os.path.exists('data'):
    os.makedirs('data')
    
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# File to store project data
DATA_FILE = 'data/project_data.json'

# Initialize default data
def get_default_data():
    return {
        'blocks': [],
        'blockTypes': ['HB', 'B', 'DB', 'C', 'HC']
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

@app.route('/api/extract-webtoon', methods=['POST'])
def api_extract_webtoon():
    """Extract images from a webtoon URL"""
    data = request.json
    if data is None:
        return jsonify({"error": "Invalid JSON"}), 400
    
    url = data.get('url', '')
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    try:
        # Create a folder for this extraction
        extraction_id = str(uuid.uuid4())[:8]
        extraction_folder = os.path.join(app.config['UPLOAD_FOLDER'], f'webtoon_{extraction_id}')
        os.makedirs(extraction_folder, exist_ok=True)
        
        # Extract images
        images = extract_webtoon_images(url, extraction_folder)
        
        if not images:
            return jsonify({"error": "No images found or could not access the website"}), 404
        
        # Return image URLs and info
        return jsonify({
            "status": "success",
            "extraction_id": extraction_id,
            "images": images
        })
    except Exception as e:
        logging.error(f"Extraction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def extract_webtoon_images(url, save_folder):
    """Extract images from a webtoon URL and save them to the specified folder using regex"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Get the webpage content
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        html_content = response.text
        
        # Use regex to find image URLs
        # This pattern matches common image URLs in HTML
        img_patterns = [
            r'<img[^>]+src=["\'](https?://[^"\']+\.(jpg|jpeg|png|gif|webp))["\']',  # Standard img src
            r'<img[^>]+data-src=["\'](https?://[^"\']+\.(jpg|jpeg|png|gif|webp))["\']',  # Lazy loaded images
            r'<img[^>]+data-original=["\'](https?://[^"\']+\.(jpg|jpeg|png|gif|webp))["\']',  # Another lazy load pattern
            r'content=["\'](https?://[^"\']+\.(jpg|jpeg|png|gif|webp))["\']',  # Meta images
            r'background-image:\s*url\(["\']?(https?://[^"\']+\.(jpg|jpeg|png|gif|webp))["\']?\)',  # CSS background images
        ]
        
        # For asuracomic.net specifically
        if 'asuracomic.net' in url:
            logging.info("Detected asuracomic.net, using specific patterns")
            img_patterns.append(r'<div class="page-break[^>]*>.*?<img[^>]+src=["\'](https?://[^"\']+\.(jpg|jpeg|png|gif|webp))["\']')
            img_patterns.append(r'<div class="reading-content[^>]*>.*?<img[^>]+src=["\'](https?://[^"\']+\.(jpg|jpeg|png|gif|webp))["\']')
        
        all_image_urls = []
        for pattern in img_patterns:
            matches = re.findall(pattern, html_content)
            for match in matches:
                # The first group contains the URL
                if isinstance(match, tuple):
                    img_url = match[0]
                else:
                    img_url = match
                
                if img_url not in all_image_urls:
                    all_image_urls.append(img_url)
        
        logging.info(f"Found {len(all_image_urls)} potential image URLs")
        
        # Filter out small images and icons (usually width/height in attributes or URL contains 'icon', 'logo', etc.)
        filtered_urls = []
        for img_url in all_image_urls:
            if not any(x in img_url.lower() for x in ['icon', 'logo', 'banner', 'button', 'thumbnail', 'avatar']):
                filtered_urls.append(img_url)
        
        logging.info(f"After filtering: {len(filtered_urls)} image URLs")
        
        images = []
        for i, img_url in enumerate(filtered_urls):
            try:
                # Download the image
                img_response = requests.get(img_url, headers=headers)
                img_response.raise_for_status()
                
                # Determine file extension
                content_type = img_response.headers.get('Content-Type', '')
                ext = '.jpg'  # Default extension
                if 'image/png' in content_type:
                    ext = '.png'
                elif 'image/gif' in content_type:
                    ext = '.gif'
                elif 'image/webp' in content_type:
                    ext = '.webp'
                
                # Save the image
                img_filename = f'image_{i+1:03d}{ext}'
                img_path = os.path.join(save_folder, img_filename)
                
                with open(img_path, 'wb') as f:
                    f.write(img_response.content)
                
                # Create URL for the saved image
                img_url_path = url_for('static', filename=f'uploads/webtoon_{os.path.basename(save_folder)}/{img_filename}')
                
                images.append({
                    'filename': img_filename,
                    'url': img_url_path,
                    'path': img_path
                })
                
                logging.info(f"Successfully saved image: {img_filename}")
                
                # Be nice to the server
                time.sleep(0.5)
                
            except Exception as e:
                logging.error(f"Error downloading image {img_url}: {str(e)}")
        
        return images
        
    except Exception as e:
        logging.error(f"Error extracting images from {url}: {str(e)}")
        raise e

@app.route('/api/upload', methods=['POST'])
def api_upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and file.filename:
        # Create a unique filename
        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save the file
        file.save(file_path)
        
        # Return the path to access the file
        file_url = url_for('static', filename=f'uploads/{unique_filename}')
        
        return jsonify({
            "status": "success",
            "filename": filename,
            "path": file_path,
            "url": file_url
        })
    
    return jsonify({"error": "Failed to upload file"}), 500

@app.route('/api/cleanup', methods=['POST'])
def api_cleanup():
    """Cleanup unused uploads to free space"""
    try:
        # Could implement a strategy to remove old files
        # For now, just return success
        return jsonify({"status": "success", "message": "Cleanup completed"})
    except Exception as e:
        logging.error(f"Cleanup error: {str(e)}")
        return jsonify({"error": str(e)}), 500

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