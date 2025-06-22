// State management
let blocks = [];
let blockTypes = ['HB', 'B', 'DB', 'C'];
let history = [];
let aiMap = {};
let theme = localStorage.getItem('wtoon-theme') || 'light';
let geminiKey = localStorage.getItem('geminiKey') || '';
let themeClickCount = 0;
let themeClickTimer = null;

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
    
    // Ensure project sidebar is hidden by default
    projectSidebar.setAttribute('data-visible', 'false');
    
    // Ensure tools sidebar is hidden by default
    toolsSidebar.setAttribute('data-visible', 'false');
    
    // Render block type buttons immediately with default types
    renderBlockTypeButtons();
    
    setupEventListeners();
    
    // Load data after UI is set up
    loadData();
    
    // Animate entry
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
}

// Setup event listeners
function setupEventListeners() {
    // Button click handlers
    document.getElementById('btn-export').addEventListener('click', exportProject);
    document.getElementById('btn-import').addEventListener('click', () => fileImport.click());
    document.getElementById('btn-reset').addEventListener('click', resetAll);
    document.getElementById('btn-add-type').addEventListener('click', addType);
    
    // Toggle sidebar buttons - with direct implementation to ensure they work
    const btnToggleProject = document.getElementById('btn-toggle-project');
    btnToggleProject.addEventListener('click', function(e) {
        e.preventDefault(); // Empêcher tout comportement par défaut
        const isVisible = projectSidebar.getAttribute('data-visible') === 'true';
        const newState = !isVisible ? 'true' : 'false';
        console.log('Toggle project sidebar:', isVisible, '->', newState);
        projectSidebar.setAttribute('data-visible', newState);
        showToast(isVisible ? 'Menu projet fermé' : 'Menu projet ouvert');
    });
    
    const btnToggleTools = document.getElementById('btn-toggle-tools');
    btnToggleTools.addEventListener('click', function(e) {
        e.preventDefault(); // Empêcher tout comportement par défaut
        const isVisible = toolsSidebar.getAttribute('data-visible') === 'true';
        const newState = !isVisible ? 'true' : 'false';
        console.log('Toggle tools sidebar:', isVisible, '->', newState);
        toolsSidebar.setAttribute('data-visible', newState);
        showToast(isVisible ? 'Menu outils fermé' : 'Menu outils ouvert');
    });
    
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-docx').addEventListener('click', exportDocx);
    document.getElementById('btn-spellcheck').addEventListener('click', spellCheck);
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    
    // File import handler
    fileImport.addEventListener('change', importProject);
    
    // Gemini key handler
    geminiKeyInput.addEventListener('change', updateGeminiKey);
    
    // Add shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !document.getElementById('btn-undo').disabled) {
        e.preventDefault();
        undo();
        showToast('Action annulée');
    }
    
    // Ctrl/Cmd + S for save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveData();
        showToast('Projet sauvegardé');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Load data from API
async function loadData() {
    showLoading(true);
    try {
        const response = await fetch('/api/load');
        const data = await response.json();
        blocks = data.blocks || [];
        blockTypes = data.blockTypes || ['HB', 'B', 'DB', 'C'];
        history = [];
        aiMap = {};
        renderBlocks();
        renderBlockTypeButtons();
        updateBlockCount();
        showLoading(false);
    } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Erreur lors du chargement', 'error');
        showLoading(false);
    }
}

// Show loading indicator
function showLoading(show) {
    let loader = document.querySelector('.loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loader';
            loader.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(loader);
        }
        setTimeout(() => loader.classList.add('show'), 10);
    } else if (loader) {
        loader.classList.remove('show');
        setTimeout(() => loader.remove(), 300);
    }
}

// Save data to API
async function saveData() {
    try {
        showLoading(true);
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks, blockTypes })
        });
        showLoading(false);
    } catch (error) {
        console.error('Failed to save data:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
        showLoading(false);
    }
}

// Render block type buttons
function renderBlockTypeButtons() {
    // Use default types if none are loaded yet
    const typesToRender = blockTypes.length > 0 ? blockTypes : ['HB', 'B', 'DB', 'C'];
    
    // Clear existing type buttons
    const undoBtn = document.getElementById('btn-undo');
    const undoBtnParent = undoBtn.parentNode;
    
    // Remove all elements before the undo button
    while (undoBtnParent.firstChild !== undoBtn) {
        undoBtnParent.removeChild(undoBtnParent.firstChild);
    }
    
    // Add block type buttons
    typesToRender.forEach(type => {
        const button = document.createElement('button');
        button.innerHTML = `<i class="fas fa-plus"></i> ${type}`;
        button.addEventListener('click', () => addBlock(type));
        button.classList.add('btn-add-block');
        undoBtnParent.insertBefore(button, undoBtn);
        
        // Add ripple effect
        button.addEventListener('click', createRipple);
    });
    
    // Ensure the undo button is properly positioned
    if (undoBtn.parentNode !== undoBtnParent) {
        undoBtnParent.appendChild(undoBtn);
    }
}

// Ripple effect for buttons
function createRipple(e) {
    const button = e.currentTarget;
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - diameter / 2}px`;
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - diameter / 2}px`;
    circle.classList.add('ripple');
    
    const ripple = button.getElementsByClassName('ripple')[0];
    if (ripple) {
        ripple.remove();
    }
    
    button.appendChild(circle);
}

// Render blocks
function renderBlocks() {
    blocksContainer.innerHTML = '';
    
    blocks.forEach((block, index) => {
        const blockEl = document.importNode(blockTemplate.content, true).firstElementChild;
        const strongEl = blockEl.querySelector('strong');
        const textareaEl = blockEl.querySelector('textarea');
        const aiBtn = blockEl.querySelector('.ai-btn');
        const commentBtn = blockEl.querySelector('.comment-btn');
        const commentContainer = blockEl.querySelector('.comment-container');
        const commentTextarea = blockEl.querySelector('.comment-textarea');
        const suggestionsEl = blockEl.querySelector('.suggestions');
        
        strongEl.textContent = block.type + block.number;
        textareaEl.value = block.content;
        
        // Set comment if exists
        if (block.comment) {
            commentTextarea.value = block.comment;
            commentContainer.style.display = 'block';
            commentBtn.classList.add('active');
        }
        
        // Add animation delay
        blockEl.style.animationDelay = `${index * 0.05}s`;
        
        // Auto resize textarea
        textareaEl.setAttribute('data-min-rows', '2');
        autoResizeTextarea(textareaEl);
        
        // Auto resize comment textarea
        commentTextarea.setAttribute('data-min-rows', '1');
        autoResizeTextarea(commentTextarea);
        
        // Update block content
        textareaEl.addEventListener('input', (e) => {
            block.content = e.target.value;
            autoResizeTextarea(e.target);
            saveData();
        });
        
        // Update comment content
        commentTextarea.addEventListener('input', (e) => {
            block.comment = e.target.value;
            autoResizeTextarea(e.target);
            saveData();
        });
        
        // Toggle comment visibility
        commentBtn.addEventListener('click', () => {
            commentContainer.style.display = commentContainer.style.display === 'none' ? 'block' : 'none';
            commentBtn.classList.toggle('active');
            if (commentContainer.style.display === 'block') {
                commentTextarea.focus();
            }
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

// Auto resize textarea
function autoResizeTextarea(textarea) {
    const minRows = parseInt(textarea.getAttribute('data-min-rows')) || 2;
    
    textarea.rows = minRows;
    const rows = Math.ceil((textarea.scrollHeight - 20) / 20);
    textarea.rows = Math.max(minRows, Math.min(rows, 15)); // Cap at 15 rows max
}

// Render AI suggestions
function renderSuggestions(container, suggestions, blockIndex) {
    container.innerHTML = '';
    container.style.display = 'block';
    
    suggestions.forEach((suggestion, index) => {
        const suggEl = document.createElement('div');
        suggEl.className = 'sugg';
        suggEl.style.animationDelay = `${index * 0.1}s`;
        
        const span = document.createElement('span');
        span.textContent = suggestion;
        
        const button = document.createElement('button');
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.addEventListener('click', () => acceptSuggestion(blockIndex, suggestion));
        button.addEventListener('click', createRipple);
        
        suggEl.appendChild(span);
        suggEl.appendChild(button);
        container.appendChild(suggEl);
    });
    
    const moreBtn = document.createElement('button');
    moreBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Autres suggestions';
    moreBtn.addEventListener('click', () => askAi(blockIndex));
    moreBtn.addEventListener('click', createRipple);
    container.appendChild(moreBtn);
}

// Add block
function addBlock(type) {
    pushHistory();
    const nextNumber = Math.max(0, ...blocks.filter(b => b.type === type).map(b => b.number)) + 1;
    blocks.push({ type, number: nextNumber, content: '', comment: '' });
    saveData();
    renderBlocks();
    updateBlockCount();
    document.getElementById('btn-undo').disabled = false;
    showToast(`Bloc ${type}${nextNumber} ajouté`, 'success');
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
    
    showToast('Projet exporté avec succès', 'success');
}

// Import project
function importProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading(true);
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
            showLoading(false);
            showToast('Projet importé avec succès', 'success');
        } catch (error) {
            showLoading(false);
            showToast('Fichier invalide', 'error');
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
        showToast('Projet réinitialisé', 'info');
    }
}

// Add block type
function addType() {
    const newType = prompt('Nouveau type de bloc:');
    if (newType && /^[A-Z]+$/.test(newType)) {
        if (!blockTypes.includes(newType)) {
            blockTypes.push(newType);
            renderBlockTypeButtons();
            saveData();
            showToast(`Type ${newType} ajouté`, 'success');
        } else {
            showToast('Ce type existe déjà', 'error');
        }
    } else if (newType) {
        showToast('Le type doit être en majuscules', 'error');
    }
}

// Export to DOCX
async function exportDocx() {
    if (blocks.length === 0) {
        showToast('Aucun bloc à exporter', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch('/api/export-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'script_webtoon.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            showToast('Export DOCX réussi', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Erreur export DOCX', 'error');
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Failed to export DOCX:', error);
        showToast('Erreur export DOCX', 'error');
        showLoading(false);
    }
}

// Spellcheck function
async function spellCheck() {
    if (blocks.length === 0) {
        showToast('Aucun bloc à vérifier', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch('/api/spellcheck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.report) {
                spellcheckResult.innerHTML = `<pre>${data.report}</pre>`;
                toggleToolsSidebar(true);
                showToast('Vérification terminée', 'success');
            } else if (data.error) {
                spellcheckResult.innerHTML = `<p class="error">${data.error}</p>`;
                showToast('Erreur de vérification', 'error');
            }
        } else {
            spellcheckResult.innerHTML = '<p class="error">Erreur de connexion</p>';
            showToast('Erreur de connexion', 'error');
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Failed to spellcheck:', error);
        spellcheckResult.innerHTML = '<p class="error">Erreur de connexion</p>';
        showToast('Erreur de connexion', 'error');
        showLoading(false);
    }
}

// Ask AI for suggestions
async function askAi(blockIndex) {
    const block = blocks[blockIndex];
    if (!block || !block.content) {
        showToast('Aucun contenu à améliorer', 'error');
        return;
    }
    
    const key = geminiKeyInput.value.trim();
    if (!key) {
        showToast('Clé Gemini requise', 'error');
        toggleToolsSidebar(true);
        geminiKeyInput.focus();
        return;
    }
    
    const blockEl = blocksContainer.children[blockIndex];
    const suggestionsEl = blockEl.querySelector('.suggestions');
    suggestionsEl.innerHTML = '<div class="ai-loading"><i class="fas fa-spinner fa-spin"></i> Génération en cours...</div>';
    suggestionsEl.style.display = 'block';
    
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key, content: block.content })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.suggestions && data.suggestions.length) {
                aiMap[blockIndex] = { suggestions: data.suggestions };
                renderSuggestions(suggestionsEl, data.suggestions, blockIndex);
            } else if (data.error) {
                suggestionsEl.innerHTML = `<p class="error"><i class="fas fa-exclamation-triangle"></i> ${data.error}</p>`;
            } else {
                suggestionsEl.innerHTML = '<p class="error"><i class="fas fa-exclamation-triangle"></i> Aucune suggestion générée</p>';
            }
        } else {
            suggestionsEl.innerHTML = '<p class="error"><i class="fas fa-exclamation-triangle"></i> Erreur de connexion</p>';
        }
    } catch (error) {
        console.error('Failed to get AI suggestions:', error);
        suggestionsEl.innerHTML = '<p class="error"><i class="fas fa-exclamation-triangle"></i> Erreur de connexion</p>';
    }
}

// Accept AI suggestion
function acceptSuggestion(blockIndex, suggestion) {
    const block = blocks[blockIndex];
    if (!block) return;
    
    pushHistory();
    block.content = suggestion;
    saveData();
    renderBlocks();
    
    // Hide suggestions container
    const blockEl = blocksContainer.children[blockIndex];
    if (blockEl) {
        const suggestionsEl = blockEl.querySelector('.suggestions');
        if (suggestionsEl) {
            suggestionsEl.style.display = 'none';
        }
    }
    
    document.getElementById('btn-undo').disabled = false;
    showToast('Suggestion appliquée', 'success');
}

// Toggle project sidebar
function toggleProjectSidebar(show) {
    // Get current visibility state
    const isVisible = projectSidebar.getAttribute('data-visible') === 'true';
    
    if (show === undefined) {
        // Toggle mode - invert current state
        projectSidebar.setAttribute('data-visible', isVisible ? 'false' : 'true');
    } else {
        // Explicit mode
        projectSidebar.setAttribute('data-visible', show ? 'true' : 'false');
    }
}

// Toggle tools sidebar
function toggleToolsSidebar(show) {
    // Get current visibility state
    const isVisible = toolsSidebar.getAttribute('data-visible') === 'true';
    
    if (show === undefined) {
        // Toggle mode - invert current state
        toolsSidebar.setAttribute('data-visible', isVisible ? 'false' : 'true');
    } else {
        // Explicit mode
        toolsSidebar.setAttribute('data-visible', show ? 'true' : 'false');
    }
}

// Toggle theme
function toggleTheme() {
    // Reset timer and increment click count
    clearTimeout(themeClickTimer);
    themeClickCount++;
    
    // Set timer to reset click count after 1 second
    themeClickTimer = setTimeout(() => {
        themeClickCount = 0;
    }, 1000);
    
    // Cycle through themes based on click count
    if (themeClickCount >= 3) {
        // Third+ click within 1 second - obsidian theme
        theme = 'obsidian';
        themeClickCount = 0; // Reset after reaching obsidian
    } else if (theme === 'light') {
        // Light to dark
        theme = 'dark';
    } else if (theme === 'dark' && themeClickCount < 3) {
        // Dark to light (unless rapid clicking for obsidian)
        theme = 'light';
    } else if (theme === 'obsidian') {
        // Obsidian to light
        theme = 'light';
    }
    
    // Save and apply theme
    localStorage.setItem('wtoon-theme', theme);
    setTheme(theme);
    
    // Show toast with theme name
    let themeName = theme === 'light' ? 'clair' : (theme === 'dark' ? 'sombre' : 'obsidienne');
    showToast(`Thème ${themeName} activé`, 'info');
}

// Set theme
function setTheme(newTheme) {
    // Remove all theme classes first
    document.body.classList.remove('light', 'dark', 'obsidian');
    // Add the current theme class
    document.body.classList.add(newTheme);
    
    // Update theme button icon
    const themeBtn = document.getElementById('btn-theme');
    if (newTheme === 'light') {
        themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else if (newTheme === 'dark') {
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else if (newTheme === 'obsidian') {
        themeBtn.innerHTML = '<i class="fas fa-star"></i>';
    }
}

// Update Gemini key
function updateGeminiKey() {
    geminiKey = geminiKeyInput.value;
    localStorage.setItem('geminiKey', geminiKey);
    showToast('Clé Gemini sauvegardée', 'success');
}

// Update block count
function updateBlockCount() {
    blockCountEl.textContent = `${blocks.length} bloc${blocks.length > 1 ? 's' : ''}`;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 