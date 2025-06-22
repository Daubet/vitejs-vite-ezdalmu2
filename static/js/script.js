// State management
let blocks = [];
let blockTypes = ['HB', 'B', 'DB', 'C'];
let customTypes = [];
let history = [];
let aiMap = {};
let theme = localStorage.getItem('wtoon-theme') || 'light';
let geminiKey = localStorage.getItem('geminiKey') || '';
let themeClickCount = 0;
let themeClickTimer = null;
let currentPDF = null;
let currentPDFDoc = null;
let currentPage = 1;
let totalPages = 0;
let currentZoom = 1.0;

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
const viewerPanel = document.getElementById('viewer-panel');
const resizer = document.getElementById('resizer');
const mainContent = document.querySelector('.main');
const pdfContainer = document.getElementById('pdf-container');
const imageContainer = document.getElementById('image-container');
const imageViewer = document.getElementById('image-viewer');
const viewerFilename = document.getElementById('viewer-filename');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnCloseViewer = document.getElementById('btn-close-viewer');
const pageInfo = document.getElementById('page-info');
const fileUploadImage = document.getElementById('file-upload-image');
const fileUploadPDF = document.getElementById('file-upload-pdf');

// Initialize app
function init() {
    setTheme(theme);
    geminiKeyInput.value = geminiKey;
    
    // Ensure project sidebar is hidden by default
    projectSidebar.setAttribute('data-visible', 'false');
    
    // Ensure tools sidebar is hidden by default
    toolsSidebar.setAttribute('data-visible', 'false');
    
    // Hide viewer panel by default
    viewerPanel.classList.add('hidden');
    mainContent.classList.add('full-width');
    
    // Render block type buttons immediately with default types
    renderBlockTypeButtons();
    renderCustomTypes(); // Initialiser la liste des types personnalisés
    
    setupEventListeners();
    
    // Load data after UI is set up
    loadData();
    
    // Animate entry
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/static/js/lib/pdf.worker.min.js';
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

    // Setup resizable panel
    setupResizablePanel();
    
    // Viewer controls
    btnPrevPage.addEventListener('click', prevPage);
    btnNextPage.addEventListener('click', nextPage);
    btnZoomIn.addEventListener('click', zoomIn);
    btnZoomOut.addEventListener('click', zoomOut);
    btnCloseViewer.addEventListener('click', closeViewer);
    
    // File upload handlers
    document.getElementById('btn-upload-image').addEventListener('click', () => fileUploadImage.click());
    document.getElementById('btn-upload-pdf').addEventListener('click', () => fileUploadPDF.click());
    fileUploadImage.addEventListener('change', handleImageUpload);
    fileUploadPDF.addEventListener('change', handlePDFUpload);
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

// Setup resizable panel
function setupResizablePanel() {
    let isResizing = false;
    let lastX, lastY;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        lastX = e.clientX;
        lastY = e.clientY;
        resizer.classList.add('active');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });

    function handleMouseMove(e) {
        if (!isResizing) return;

        // Get the container dimensions
        const containerWidth = document.querySelector('.content-wrapper').offsetWidth;

        // Calculate the new width based on mouse position
        let newWidth;

        if (window.innerWidth <= 768) { // Mobile view (vertical resizing)
            const deltaY = e.clientY - lastY;
            const containerHeight = document.querySelector('.content-wrapper').offsetHeight;
            const currentHeight = viewerPanel.offsetHeight;
            newWidth = ((currentHeight + deltaY) / containerHeight) * 100;
            lastY = e.clientY;
            
            // Limit height between 20% and 80%
            newWidth = Math.max(20, Math.min(80, newWidth));
            
            // Update CSS variable for height
            viewerPanel.style.height = `${newWidth}%`;
        } else { // Desktop view (horizontal resizing)
            const deltaX = e.clientX - lastX;
            const currentWidth = viewerPanel.offsetWidth;
            newWidth = ((currentWidth + deltaX) / containerWidth) * 100;
            lastX = e.clientX;
            
            // Limit width between 20% and 80%
            newWidth = Math.max(20, Math.min(80, newWidth));
            
            // Update CSS variable for width
            document.documentElement.style.setProperty('--viewer-width', `${newWidth}%`);
        }
    }

    function stopResize() {
        isResizing = false;
        resizer.classList.remove('active');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Handle PDF upload
function handlePDFUpload(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;
    
    // Show the viewer
    openViewer();

    // Clear any previous content
    pdfContainer.innerHTML = '';
    imageViewer.style.display = 'none';
    
    // Set file name in the viewer
    viewerFilename.textContent = file.name;
    
    // Read the file
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        const typedArray = new Uint8Array(event.target.result);
        loadPdfFromData(typedArray);
    };
    fileReader.readAsArrayBuffer(file);
    
    // Reset file input
    e.target.value = null;
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    // Show the viewer
    openViewer();

    // Clear any previous content
    pdfContainer.innerHTML = '';
    
    // Set file name in the viewer
    viewerFilename.textContent = file.name;
    
    // Disable PDF navigation
    btnPrevPage.disabled = true;
    btnNextPage.disabled = true;
    pageInfo.textContent = '';
    
    // Display the image
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        imageViewer.src = event.target.result;
        imageViewer.style.display = 'block';
        currentZoom = 1.0;
        imageViewer.style.transform = `scale(${currentZoom})`;
    };
    fileReader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = null;
}

// Load PDF from data
async function loadPdfFromData(data) {
    try {
        // Load the PDF
        currentPDFDoc = await pdfjsLib.getDocument({ data: data }).promise;
        totalPages = currentPDFDoc.numPages;
        currentPage = 1;
        
        // Enable/disable navigation based on page count
        btnNextPage.disabled = totalPages <= 1;
        btnPrevPage.disabled = true;
        
        // Update page info
        pageInfo.textContent = `Page: ${currentPage}/${totalPages}`;
        
        // Render the first page
        renderPDFPage(currentPage);
    } catch (error) {
        console.error('Error loading PDF:', error);
        showToast('Erreur lors du chargement du PDF', 'error');
    }
}

// Render PDF page
async function renderPDFPage(pageNumber) {
    if (!currentPDFDoc) return;
    
    try {
        // Get the page
        const page = await currentPDFDoc.getPage(pageNumber);
        
        // Clear previous content
        pdfContainer.innerHTML = '';
        
        // Create a canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        pdfContainer.appendChild(canvas);
        
        // Calculate scale to fit the width
        const viewport = page.getViewport({ scale: currentZoom });
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Update page info
        pageInfo.textContent = `Page: ${pageNumber}/${totalPages}`;
        
        // Update navigation buttons
        btnPrevPage.disabled = pageNumber <= 1;
        btnNextPage.disabled = pageNumber >= totalPages;
    } catch (error) {
        console.error('Error rendering PDF page:', error);
        showToast('Erreur lors du rendu de la page PDF', 'error');
    }
}

// Next page
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderPDFPage(currentPage);
    }
}

// Previous page
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPDFPage(currentPage);
    }
}

// Zoom in
function zoomIn() {
    currentZoom += 0.2;
    if (currentZoom > 3) currentZoom = 3;
    
    if (currentPDFDoc) {
        renderPDFPage(currentPage);
    } else if (imageViewer.style.display !== 'none') {
        imageViewer.style.transform = `scale(${currentZoom})`;
    }
}

// Zoom out
function zoomOut() {
    currentZoom -= 0.2;
    if (currentZoom < 0.5) currentZoom = 0.5;
    
    if (currentPDFDoc) {
        renderPDFPage(currentPage);
    } else if (imageViewer.style.display !== 'none') {
        imageViewer.style.transform = `scale(${currentZoom})`;
    }
}

// Open viewer
function openViewer() {
    viewerPanel.classList.remove('hidden');
    mainContent.classList.remove('full-width');
    currentPDFDoc = null;
    currentPage = 1;
    totalPages = 0;
    currentZoom = 1.0;
}

// Close viewer
function closeViewer() {
    viewerPanel.classList.add('hidden');
    mainContent.classList.add('full-width');
    currentPDFDoc = null;
}

// Load data from API
async function loadData() {
    showLoading(true);
    try {
        const response = await fetch('/api/load');
        const data = await response.json();
        blocks = data.blocks || [];
        blockTypes = data.blockTypes || ['HB', 'B', 'DB', 'C'];
        
        // Séparer les types par défaut des types personnalisés
        const defaultTypes = ['HB', 'B', 'DB', 'C'];
        customTypes = blockTypes.filter(type => !defaultTypes.includes(type));
        
        history = [];
        aiMap = {};
        renderBlocks();
        renderBlockTypeButtons();
        renderCustomTypes(); // Afficher les types personnalisés
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
        const deleteBtn = blockEl.querySelector('.delete-btn');
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
            pushHistory();
            block.content = e.target.value;
            autoResizeTextarea(e.target);
            saveData();
            document.getElementById('btn-undo').disabled = false;
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
                autoResizeTextarea(commentTextarea);
            }
        });
        
        // AI button
        aiBtn.addEventListener('click', () => askAi(index));
        
        // Gestionnaire d'événements pour le bouton de suppression
        deleteBtn.addEventListener('click', () => deleteBlock(index));
        
        // Render AI suggestions if they exist
        if (aiMap[index] && aiMap[index].suggestions && aiMap[index].suggestions.length) {
            renderSuggestions(suggestionsEl, aiMap[index].suggestions, index);
        }
        
        blocksContainer.appendChild(blockEl);
    });
    
    // Scroll to bottom if adding a new block
    if (blocks.length > 0 && blocks[blocks.length - 1].content === '') {
        blocksContainer.scrollTop = blocksContainer.scrollHeight;
        
        // Focus last textarea
        const textareas = blocksContainer.querySelectorAll('textarea');
        if (textareas.length > 0) {
            textareas[textareas.length - 1].focus();
        }
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
            // Ajouter aux deux tableaux
            blockTypes.push(newType);
            customTypes.push(newType);
            
            // Mettre à jour l'UI avec animation
            renderBlockTypeButtons();
            
            // Animation pour le nouveau type
            const container = document.getElementById('custom-types-container');
            if (container) {
                // Supprimer le message "Aucun type personnalisé" si présent
                const infoText = container.querySelector('.info-text');
                if (infoText) {
                    infoText.remove();
                }
                
                // Créer le nouvel élément
                const typeItem = document.createElement('div');
                typeItem.className = 'custom-type-item';
                typeItem.style.opacity = '0';
                typeItem.style.transform = 'scale(0.8)';
                
                const typeName = document.createElement('span');
                typeName.className = 'custom-type-name';
                typeName.textContent = newType;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'custom-type-delete';
                deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                deleteBtn.title = 'Supprimer ce type';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteCustomType(newType);
                });
                
                typeItem.appendChild(typeName);
                typeItem.appendChild(deleteBtn);
                container.appendChild(typeItem);
                
                // Animation d'entrée
                setTimeout(() => {
                    typeItem.style.opacity = '1';
                    typeItem.style.transform = 'scale(1)';
                }, 10);
            } else {
                // Fallback si le conteneur n'est pas trouvé
                renderCustomTypes();
            }
            
            // Sauvegarder
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

// Render custom types in the project sidebar
function renderCustomTypes() {
    const container = document.getElementById('custom-types-container');
    
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // If no custom types, show message
    if (customTypes.length === 0) {
        container.innerHTML = '<p class="info-text">Aucun type personnalisé</p>';
        return;
    }
    
    // Add each custom type with delete button
    customTypes.forEach(type => {
        const typeItem = document.createElement('div');
        typeItem.className = 'custom-type-item';
        
        const typeName = document.createElement('span');
        typeName.className = 'custom-type-name';
        typeName.textContent = type;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'custom-type-delete';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.title = 'Supprimer ce type';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Éviter la propagation du clic
            deleteCustomType(type);
        });
        
        // Animation d'entrée
        typeItem.style.opacity = '0';
        setTimeout(() => {
            typeItem.style.opacity = '1';
        }, 10);
        
        typeItem.appendChild(typeName);
        typeItem.appendChild(deleteBtn);
        container.appendChild(typeItem);
    });
}

// Delete a custom type
function deleteCustomType(type) {
    // Confirm deletion
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le type "${type}" ?`)) {
        return;
    }
    
    // Check if type is used by any blocks
    const usedBlocks = blocks.filter(block => block.type === type);
    if (usedBlocks.length > 0) {
        if (!confirm(`Ce type est utilisé par ${usedBlocks.length} bloc(s). Ces blocs seront également supprimés. Voulez-vous continuer ?`)) {
            return;
        }
        
        // Remove all blocks of this type
        pushHistory(); // Save state for undo
        blocks = blocks.filter(block => block.type !== type);
        document.getElementById('btn-undo').disabled = false;
    }
    
    // Trouver l'élément à supprimer
    const container = document.getElementById('custom-types-container');
    const items = container.querySelectorAll('.custom-type-item');
    let itemToRemove = null;
    
    items.forEach(item => {
        const nameEl = item.querySelector('.custom-type-name');
        if (nameEl && nameEl.textContent === type) {
            itemToRemove = item;
        }
    });
    
    // Animation de sortie
    if (itemToRemove) {
        itemToRemove.style.opacity = '0';
        itemToRemove.style.transform = 'scale(0.8)';
        
        // Attendre la fin de l'animation avant de supprimer
        setTimeout(() => {
            // Remove from customTypes
            customTypes = customTypes.filter(t => t !== type);
            
            // Remove from blockTypes
            blockTypes = blockTypes.filter(t => t !== type);
            
            // Update UI
            renderCustomTypes();
            renderBlockTypeButtons();
            renderBlocks(); // Re-render blocks to reflect changes
            updateBlockCount(); // Update block count
            
            // Save changes
            saveData();
            
            showToast(`Type "${type}" et ses blocs associés supprimés`, 'success');
        }, 300);
    } else {
        // Fallback si l'élément n'est pas trouvé
        customTypes = customTypes.filter(t => t !== type);
        blockTypes = blockTypes.filter(t => t !== type);
        renderCustomTypes();
        renderBlockTypeButtons();
        renderBlocks();
        updateBlockCount();
        saveData();
        showToast(`Type "${type}" et ses blocs associés supprimés`, 'success');
    }
}

// Delete a block
function deleteBlock(index) {
    if (index < 0 || index >= blocks.length) return;
    
    const block = blocks[index];
    
    // Confirm deletion
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce bloc ${block.type}${block.number} ?`)) {
        return;
    }
    
    // Save state for undo
    pushHistory();
    
    // Remove the block
    blocks.splice(index, 1);
    
    // Update block numbers for remaining blocks of the same type
    const sameTypeBlocks = blocks.filter(b => b.type === block.type);
    sameTypeBlocks.forEach((b, i) => {
        b.number = i + 1;
    });
    
    // Update UI
    renderBlocks();
    updateBlockCount();
    
    // Save changes
    saveData();
    
    // Enable undo button
    document.getElementById('btn-undo').disabled = false;
    
    showToast(`Bloc ${block.type}${block.number} supprimé`, 'success');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 