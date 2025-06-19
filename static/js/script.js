// State management
let blocks = [];
let blockTypes = ['HB', 'B', 'DB', 'C'];
let history = [];
let aiMap = {};
let theme = localStorage.getItem('wtoon-theme') || 'light';
let geminiKey = localStorage.getItem('geminiKey') || '';

// DOM references
const blocksContainer = document.getElementById('blocks-container');
const blockTypesButtons = document.getElementById('block-types-buttons');
const blockCountEl = document.getElementById('block-count');
const projectSidebar = document.getElementById('project-sidebar');
const toolsSidebar = document.getElementById('tools-sidebar');
const fileImport = document.getElementById('file-import');
const geminiKeyInput = document.getElementById('gemini-key');
const blockTemplate = document.getElementById('block-template');
const spellcheckResult = document.getElementById('spellcheck-result');

// Initialize app
function init() {
    setTheme(theme);
    geminiKeyInput.value = geminiKey;
    loadData();
    setupEventListeners();
    renderBlockTypeButtons();
}

// Setup event listeners
function setupEventListeners() {
    // Button click handlers
    document.getElementById('btn-export').addEventListener('click', exportProject);
    document.getElementById('btn-import').addEventListener('click', () => fileImport.click());
    document.getElementById('btn-reset').addEventListener('click', resetAll);
    document.getElementById('btn-add-type').addEventListener('click', addType);
    document.getElementById('btn-toggle-project').addEventListener('click', toggleProjectSidebar);
    document.getElementById('btn-toggle-tools').addEventListener('click', toggleToolsSidebar);
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-docx').addEventListener('click', exportDocx);
    document.getElementById('btn-spellcheck').addEventListener('click', spellCheck);
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    
    // File import handler
    fileImport.addEventListener('change', importProject);
    
    // Gemini key handler
    geminiKeyInput.addEventListener('change', updateGeminiKey);
}

// Load data from API
async function loadData() {
    try {
        const response = await fetch('/api/load');
        const data = await response.json();
        blocks = data.blocks || [];
        blockTypes = data.blockTypes || ['HB', 'B', 'DB', 'C'];
        history = [];
        aiMap = {};
        renderBlocks();
        updateBlockCount();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Save data to API
async function saveData() {
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks, blockTypes })
        });
    } catch (error) {
        console.error('Failed to save data:', error);
    }
}

// Render block type buttons
function renderBlockTypeButtons() {
    // Clear existing type buttons
    const undoBtn = document.getElementById('btn-undo');
    const undoBtnParent = undoBtn.parentNode;
    
    // Remove all elements before the undo button
    while (undoBtnParent.firstChild !== undoBtn) {
        undoBtnParent.removeChild(undoBtnParent.firstChild);
    }
    
    // Add block type buttons
    blockTypes.forEach(type => {
        const button = document.createElement('button');
        button.textContent = '+ ' + type;
        button.addEventListener('click', () => addBlock(type));
        undoBtnParent.insertBefore(button, undoBtn);
    });
}

// Render blocks
function renderBlocks() {
    blocksContainer.innerHTML = '';
    
    blocks.forEach((block, index) => {
        const blockEl = document.importNode(blockTemplate.content, true).firstElementChild;
        const strongEl = blockEl.querySelector('strong');
        const textareaEl = blockEl.querySelector('textarea');
        const aiBtn = blockEl.querySelector('.ai-btn');
        const suggestionsEl = blockEl.querySelector('.suggestions');
        
        strongEl.textContent = block.type + block.number;
        textareaEl.value = block.content;
        
        // Update block content
        textareaEl.addEventListener('input', (e) => {
            block.content = e.target.value;
            saveData();
        });
        
        // AI button
        aiBtn.addEventListener('click', () => askAi(index));
        
        // Render AI suggestions if they exist
        if (aiMap[index] && aiMap[index].suggestions && aiMap[index].suggestions.length) {
            renderSuggestions(suggestionsEl, aiMap[index].suggestions, index);
        }
        
        blocksContainer.appendChild(blockEl);
    });
    
    // Scroll to bottom
    blocksContainer.scrollTop = blocksContainer.scrollHeight;
    
    // Focus last textarea
    const textareas = blocksContainer.querySelectorAll('textarea');
    if (textareas.length > 0) {
        textareas[textareas.length - 1].focus();
    }
}

// Render AI suggestions
function renderSuggestions(container, suggestions, blockIndex) {
    container.innerHTML = '';
    container.style.display = 'block';
    
    suggestions.forEach((suggestion, index) => {
        const suggEl = document.createElement('div');
        suggEl.className = 'sugg';
        
        const span = document.createElement('span');
        span.textContent = suggestion;
        
        const button = document.createElement('button');
        button.textContent = '✔';
        button.addEventListener('click', () => acceptSuggestion(blockIndex, suggestion));
        
        suggEl.appendChild(span);
        suggEl.appendChild(button);
        container.appendChild(suggEl);
    });
    
    const moreBtn = document.createElement('button');
    moreBtn.textContent = 'Autres';
    moreBtn.addEventListener('click', () => askAi(blockIndex));
    container.appendChild(moreBtn);
}

// Add block
function addBlock(type) {
    pushHistory();
    const nextNumber = Math.max(0, ...blocks.filter(b => b.type === type).map(b => b.number)) + 1;
    blocks.push({ type, number: nextNumber, content: '' });
    saveData();
    renderBlocks();
    updateBlockCount();
    document.getElementById('btn-undo').disabled = false;
}

// Push history
function pushHistory() {
    history.push(JSON.parse(JSON.stringify(blocks)));
}

// Undo
function undo() {
    if (history.length === 0) return;
    
    blocks = history.pop();
    saveData();
    renderBlocks();
    updateBlockCount();
    
    document.getElementById('btn-undo').disabled = history.length === 0;
}

// Export project
function exportProject() {
    const data = JSON.stringify({ blocks, blockTypes }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.wtoon';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Import project
function importProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            blocks = data.blocks;
            blockTypes = data.blockTypes;
            history = [];
            aiMap = {};
            saveData();
            renderBlocks();
            renderBlockTypeButtons();
            updateBlockCount();
            document.getElementById('btn-undo').disabled = true;
        } catch (error) {
            alert('Fichier invalide');
        }
    };
    reader.readAsText(file);
    fileImport.value = null; // Reset file input
}

// Reset all
function resetAll() {
    if (confirm('Tout effacer ?')) {
        blocks = [];
        history = [];
        aiMap = {};
        spellcheckResult.innerHTML = '<p>Aucun rapport.</p>';
        saveData();
        renderBlocks();
        updateBlockCount();
        document.getElementById('btn-undo').disabled = true;
    }
}

// Add block type
function addType() {
    const newType = prompt('Nouveau type');
    if (!newType) return;
    
    const formattedType = newType.trim().toUpperCase();
    if (formattedType && !blockTypes.includes(formattedType)) {
        blockTypes.push(formattedType);
        saveData();
        renderBlockTypeButtons();
    }
}

// Export DOCX
async function exportDocx() {
    if (blocks.length === 0) {
        alert('Aucun bloc à exporter');
        return;
    }
    
    try {
        const response = await fetch('/api/export-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        
        if (!response.ok) throw new Error('Failed to export DOCX');
        
        // Get the blob
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Download the file
        const a = document.createElement('a');
        a.href = url;
        a.download = 'script_webtoon.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting DOCX:', error);
        alert('Erreur lors de l\'export DOCX');
    }
}

// Spell check
async function spellCheck() {
    if (blocks.length === 0) {
        alert('Aucun bloc à analyser');
        return;
    }
    
    spellcheckResult.innerHTML = '<p>Analyse...</p>';
    
    try {
        const response = await fetch('/api/spellcheck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        
        const data = await response.json();
        
        if (data.error) {
            spellcheckResult.innerHTML = `<p>Erreur: ${data.error}</p>`;
            return;
        }
        
        spellcheckResult.innerHTML = `<pre>${data.report}</pre>`;
        
    } catch (error) {
        console.error('Error checking spelling:', error);
        spellcheckResult.innerHTML = '<p>Erreur réseau</p>';
    }
}

// Ask AI for suggestions
async function askAi(blockIndex) {
    if (!geminiKey) {
        alert('Ajoute une clé Gemini dans Outils');
        return;
    }
    
    // Update UI - show loading
    const blockEl = blocksContainer.children[blockIndex];
    const aiBtn = blockEl.querySelector('.ai-btn');
    const suggestionsEl = blockEl.querySelector('.suggestions');
    
    aiBtn.textContent = '…';
    aiBtn.disabled = true;
    
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: geminiKey,
                content: blocks[blockIndex].content
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Erreur Gemini : ' + data.error);
            aiBtn.textContent = 'IA';
            aiBtn.disabled = false;
            return;
        }
        
        // Store suggestions in aiMap
        aiMap[blockIndex] = {
            loading: false,
            suggestions: data.suggestions
        };
        
        // Render suggestions
        renderSuggestions(suggestionsEl, data.suggestions, blockIndex);
        
    } catch (error) {
        console.error('Error with AI request:', error);
        alert('Erreur réseau');
    } finally {
        aiBtn.textContent = 'IA';
        aiBtn.disabled = false;
    }
}

// Accept AI suggestion
function acceptSuggestion(blockIndex, suggestion) {
    blocks[blockIndex].content = suggestion;
    saveData();
    renderBlocks();
    
    // Clear suggestions
    aiMap[blockIndex] = {
        loading: false,
        suggestions: []
    };
}

// Toggle project sidebar
function toggleProjectSidebar() {
    const isVisible = projectSidebar.style.display !== 'none';
    projectSidebar.style.display = isVisible ? 'none' : 'block';
    document.getElementById('btn-toggle-project').textContent = isVisible ? '📁' : '📂';
}

// Toggle tools sidebar
function toggleToolsSidebar() {
    const isVisible = toolsSidebar.style.display !== 'none';
    toolsSidebar.style.display = isVisible ? 'none' : 'block';
}

// Toggle theme
function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
    localStorage.setItem('wtoon-theme', theme);
}

// Set theme
function setTheme(newTheme) {
    document.body.className = newTheme === 'dark' ? 'dark' : '';
    document.getElementById('btn-theme').textContent = newTheme === 'dark' ? '🌞' : '🌙';
}

// Update Gemini key
function updateGeminiKey() {
    geminiKey = geminiKeyInput.value;
    localStorage.setItem('geminiKey', geminiKey);
}

// Update block count
function updateBlockCount() {
    blockCountEl.textContent = blocks.length + ' blocs';
}

// Initialize the app when document is fully loaded
document.addEventListener('DOMContentLoaded', init); 