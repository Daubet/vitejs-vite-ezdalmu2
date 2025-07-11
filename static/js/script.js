// State management
let blocks = [];
let blockTypes = ['HB', 'B', 'DB', 'C', 'HC'];
let customTypes = [];
let glossary = []; // <-- NOUVEAU: variable pour le glossaire
let history = [];
let aiMap = {};
let theme = localStorage.getItem('wtoon-theme') || 'light';
let geminiKey = '';
let firecrawlKey = '';
let themeClickCount = 0;
let themeClickTimer = null;
let currentPDF = null;
let currentPDFDoc = null;
let currentPage = 1;
let totalPages = 0;
let currentZoom = 1.0;

// Variables pour la reformulation intelligente
let currentReformulationBlockIndex = -1;
let currentReformulationContent = '';
let currentReformulationIntention = '';
let currentReformulationCustom = '';

// Variables pour la correction orthographique interactive
let spellErrors = [];
let currentSpellIndex = 0;
let spellHistory = [];

// --- auto-save debounce --------------------------------
let autoSaveTimer = null;
function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveData({showSpinner:false}), 800);
}

// DOM references
const blocksContainer = document.getElementById('blocks-container');
const blockTypesButtons = document.getElementById('block-types-buttons');
const blockCountEl = document.getElementById('block-count');
const projectSidebar = document.getElementById('project-sidebar');
const toolsSidebar = document.getElementById('tools-sidebar');
const fileImport = document.getElementById('file-import');
const geminiKeyInput = document.getElementById('gemini-key');
const toggleGeminiKey = document.getElementById('toggle-gemini-key');
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
const webtoonUrlInput = document.getElementById('webtoon-url');
const btnExtractWebtoon = document.getElementById('btn-extract-webtoon');
const btnExtractFirecrawl = document.getElementById('btn-extract-firecrawl');
const firecrawlKeyInput = document.getElementById('firecrawl-key');
const toggleFirecrawlKey = document.getElementById('toggle-firecrawl-key');
const extractionStatus = document.getElementById('extraction-status');
const extractionProgress = document.getElementById('extraction-progress');
const extractedImagesContainer = document.getElementById('extracted-images-container');
const extractedImageTemplate = document.getElementById('extracted-image-template');
const btnTranslateAi = document.getElementById('btn-translate-ai');
const translationSuggestions = document.getElementById('translation-suggestions');
const suggestionsContainer = document.getElementById('suggestions-container');

// AJOUTÉ : Références pour le glossaire
const glossarySidebar = document.getElementById('glossary-sidebar');
const btnToggleGlossary = document.getElementById('btn-toggle-glossary');
const btnAddGlossaryTerm = document.getElementById('btn-add-glossary-term');
const editableGlossaryTableBody = document.querySelector('#editable-glossary-table tbody');


// Initialize app
function init() {
    setTheme(theme);
    
    // Ensure project sidebar is hidden by default
    projectSidebar.setAttribute('data-visible', 'false');
    
    // Ensure tools sidebar is hidden by default
    toolsSidebar.setAttribute('data-visible', 'false');

    // AJOUTÉ : Assurer que le panneau du glossaire est masqué au démarrage
    glossarySidebar.setAttribute('data-visible', 'false');
    
    // Initialize viewer panel
    initializeViewerPanel();
    
    // Hide viewer panel by default
    viewerPanel.classList.add('hidden');
    mainContent.classList.add('full-width');
    
    // Render block type buttons immediately with default types
    renderBlockTypeButtons();
    renderCustomTypes(); // Initialiser la liste des types personnalisés
    
    setupEventListeners();
    
    // Setup reformulation modal handlers
    setupReformulationModalHandlers();
    
    // Load data after UI is set up
    loadData();
    
    // Load API keys from server
    loadApiKeys();
    
    // Animate entry
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/static/js/lib/pdf.worker.min.js';
}

// Initialize viewer panel with saved dimensions or defaults
function initializeViewerPanel() {
    // Initialize from saved width if available
    const savedWidth = localStorage.getItem('viewer-width');
    if (savedWidth) {
        document.documentElement.style.setProperty('--viewer-width', savedWidth);
    } else {
        // Default to 40% width
        document.documentElement.style.setProperty('--viewer-width', '40%');
    }
    
    // Initialize height for mobile view
    const savedHeight = localStorage.getItem('viewer-height');
    if (savedHeight && window.innerWidth <= 768) {
        viewerPanel.style.height = savedHeight;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Button click handlers
    document.getElementById('btn-export').addEventListener('click', exportZip);
    document.getElementById('btn-import').addEventListener('click', () => fileImport.click());
    document.getElementById('btn-export-microsoft').addEventListener('click', exportDocx);
    document.getElementById('btn-reset').addEventListener('click', resetAll);
    document.getElementById('btn-add-type').addEventListener('click', addType);
    document.getElementById('btn-example-json').addEventListener('click', downloadExampleJson);
    document.getElementById('btn-example-zip').addEventListener('click', downloadExampleZip);
    
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

    // AJOUTÉ : Listener pour le bouton du glossaire
    btnToggleGlossary.addEventListener('click', () => {
        const isVisible = glossarySidebar.getAttribute('data-visible') === 'true';
        glossarySidebar.setAttribute('data-visible', isVisible ? 'false' : 'true');
        showToast(isVisible ? 'Glossaire fermé' : 'Glossaire ouvert');
    });
    btnAddGlossaryTerm.addEventListener('click', addGlossaryTerm);
    
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-docx').addEventListener('click', exportDocx);
    document.getElementById('btn-spellcheck').addEventListener('click', spellCheck);
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    
    // File import handler
    fileImport.addEventListener('change', importProject);
    
    // Gemini key handler
    geminiKeyInput.addEventListener('change', updateGeminiKey);
    
    // Firecrawl key handler
    firecrawlKeyInput.addEventListener('change', updateFirecrawlKey);
    
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

    // Webtoon extraction
    btnExtractWebtoon.addEventListener('click', extractWebtoon);
    btnExtractFirecrawl.addEventListener('click', extractFirecrawl);
    
    // Toggle Firecrawl API key visibility
    toggleFirecrawlKey.addEventListener('click', () => {
        const isVisible = firecrawlKeyInput.type === 'text';
        firecrawlKeyInput.type = isVisible ? 'password' : 'text';
        toggleFirecrawlKey.innerHTML = isVisible ? 
            '<i class="fas fa-eye-slash"></i>' : 
            '<i class="fas fa-eye"></i>';
    });
    
    // Toggle Gemini key visibility
    toggleGeminiKey.addEventListener('click', () => {
        const isVisible = geminiKeyInput.type === 'text';
        geminiKeyInput.type = isVisible ? 'password' : 'text';
        toggleGeminiKey.innerHTML = isVisible ? 
            '<i class="fas fa-eye-slash"></i>' : 
            '<i class="fas fa-eye"></i>';
    });
    
    // Gestionnaires pour les modals de reformulation
    setupReformulationModalHandlers();
    
    // Translation AI button
    btnTranslateAi.addEventListener('click', captureAndTranslate);
    
    // Gestionnaires pour le modal de correction orthographique
    document.getElementById('spellcheck-apply').addEventListener('click', applySpellcheckCorrection);
    document.getElementById('spellcheck-ignore').addEventListener('click', ignoreSpellcheckError);
    document.getElementById('spellcheck-back').addEventListener('click', goBackSpellcheck);
    
    // Raccourcis clavier pour le modal de correction
    document.addEventListener('keydown', (e) => {
        const spellModal = document.getElementById('spellcheck-modal');
        if (spellModal.classList.contains('show')) {
            switch(e.key) {
                case 'Enter':
                    e.preventDefault();
                    if (!document.getElementById('spellcheck-apply').disabled) {
                        applySpellcheckCorrection();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    ignoreSpellcheckError();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (!document.getElementById('spellcheck-back').disabled) {
                        goBackSpellcheck();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    ignoreSpellcheckError();
                    break;
            }
        }
    });
}

// Configurer les gestionnaires pour les modals de reformulation
function setupReformulationModalHandlers() {
    // Fermer les modals avec Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const reformulationModal = document.getElementById('reformulation-modal');
            const resultsModal = document.getElementById('reformulation-results-modal');
            const spellModal = document.getElementById('spellcheck-modal');
            
            if (reformulationModal && !reformulationModal.classList.contains('hidden')) {
                closeReformulationModal();
            } else if (resultsModal && !resultsModal.classList.contains('hidden')) {
                closeReformulationResultsModal();
            } else if (spellModal && spellModal.classList.contains('show')) {
                closeSpellcheckModal();
            }
        }
    });
    
    // Fermer les modals en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
        const reformulationModal = document.getElementById('reformulation-modal');
        const resultsModal = document.getElementById('reformulation-results-modal');
        const spellModal = document.getElementById('spellcheck-modal');
        
        if (reformulationModal && !reformulationModal.classList.contains('hidden')) {
            if (e.target === reformulationModal) {
                closeReformulationModal();
            }
        } else if (resultsModal && !resultsModal.classList.contains('hidden')) {
            if (e.target === resultsModal) {
                closeReformulationResultsModal();
            }
        } else if (spellModal && spellModal.classList.contains('show')) {
            if (e.target === spellModal) {
                closeSpellcheckModal();
            }
        }
    });
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    const activeEl = document.activeElement;
    if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
        return; // Ne pas activer les raccourcis si on tape du texte
    }

    // Vérifier si le modal de correction orthographique est ouvert
    const spellModal = document.getElementById('spellcheck-modal');
    if (spellModal && spellModal.classList.contains('show')) {
        return;
    }
    
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !document.getElementById('btn-undo').disabled) {
        e.preventDefault();
        undo();
        showToast('Action annulée');
    }
    
    // Ctrl/Cmd + S for save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveData({ showSpinner: true });
        showToast('Projet sauvegardé');
    }

    // AJOUTÉ : Raccourci pour le glossaire
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        btnToggleGlossary.click();
    }
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Support for multi-line messages
    if (message.includes('\n')) {
        const lines = message.split('\n');
        lines.forEach((line, index) => {
            const lineEl = document.createElement('div');
            lineEl.textContent = line;
            if (index === 0) lineEl.style.fontWeight = 'bold';
            toast.appendChild(lineEl);
        });
    } else {
    toast.textContent = message;
    }
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Setup resizable panel
function setupResizablePanel() {
    let isResizing = false;
    let startWidth, startHeight;
    let startPosition;
    let startX, startY;
    
    // Throttle function to limit the rate of execution
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    // Smoother resize handler with reduced sensitivity
    const handleResize = throttle((clientX, clientY) => {
        if (!isResizing) return;

        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
            if (window.innerWidth <= 768) { // Mobile view (vertical resizing)
                // Calculate delta with reduced sensitivity
                const deltaY = (clientY - startY) * 0.4; // Reduce sensitivity by 60%
                
                // Apply delta to starting height
                let newHeightPx = startHeight + deltaY;
                let containerHeight = document.querySelector('.content-wrapper').offsetHeight;
                let newHeightPercent = (newHeightPx / containerHeight) * 100;
                
                // Limit height between 20% and 80%
                newHeightPercent = Math.max(20, Math.min(80, newHeightPercent));
                
                // Update CSS for height
                viewerPanel.style.height = `${newHeightPercent}%`;
                
                // Save current height to localStorage
                localStorage.setItem('viewer-height', `${newHeightPercent}%`);
            } else { // Desktop view (horizontal resizing)
                // Calculate delta with reduced sensitivity
                const deltaX = (clientX - startX) * 0.4; // Reduce sensitivity by 60%
                
                // Apply delta to starting width
                let newWidthPx = startWidth + deltaX;
                let containerWidth = document.querySelector('.content-wrapper').offsetWidth;
                let newWidthPercent = (newWidthPx / containerWidth) * 100;
                
                // Limit width between 20% and 80%
                newWidthPercent = Math.max(20, Math.min(80, newWidthPercent));
                
                // Update CSS variable for width
                document.documentElement.style.setProperty('--viewer-width', `${newWidthPercent}%`);
                
                // Save current width to localStorage
                localStorage.setItem('viewer-width', `${newWidthPercent}%`);
            }
        });
    }, 20); // throttle at 20ms for smoother updates

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        
        // Store initial mouse position
        startX = e.clientX;
        startY = e.clientY;
        
        // Store initial dimensions
        startWidth = viewerPanel.offsetWidth;
        startHeight = viewerPanel.offsetHeight;
        
        resizer.classList.add('active');
        document.body.style.cursor = window.innerWidth <= 768 ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none'; // Prevent text selection while resizing
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });

    // Touch events for mobile
    resizer.addEventListener('touchstart', (e) => {
        if (!e.touches[0]) return;
        
        isResizing = true;
        
        // Store initial touch position
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        
        // Store initial dimensions
        startWidth = viewerPanel.offsetWidth;
        startHeight = viewerPanel.offsetHeight;
        
        resizer.classList.add('active');
        document.body.style.userSelect = 'none';
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', stopResize);
        e.preventDefault();
    });

    function mouseMoveHandler(e) {
        if (!isResizing) return;
        handleResize(e.clientX, e.clientY);
    }

    function touchMoveHandler(e) {
        if (!isResizing || !e.touches[0]) return;
        e.preventDefault(); // Prevent scrolling while resizing
        handleResize(e.touches[0].clientX, e.touches[0].clientY);
    }

    function stopResize() {
        if (!isResizing) return;
        
        isResizing = false;
        resizer.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('touchmove', touchMoveHandler);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);
    }
}

// Wrapper for heavy operations that should show a spinner
async function heavyOperation(fn) {
    showLoading(true);
    try {
        await fn();
    } finally {
        showLoading(false);
    }
}

// Handle PDF upload
async function handlePDFUpload(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    await heavyOperation(async () => {
        try {
            // Upload file to server
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload-reader', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Show the viewer
            openViewer();

            // Clear any previous content
            pdfContainer.innerHTML = '';
            imageViewer.style.display = 'none';
            
            // Set file name in the viewer
            viewerFilename.textContent = data.filename;
            
            // Load the PDF from server
            const pdfResponse = await fetch(data.url);
            const arrayBuffer = await pdfResponse.arrayBuffer();
            await loadPdfFromData(new Uint8Array(arrayBuffer));

        } catch (error) {
            console.error('Upload error:', error);
            showToast('Erreur lors du téléchargement du fichier', 'error');
        } finally {
            // Reset file input
            e.target.value = null;
        }
    });
}

// Handle image upload
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    await heavyOperation(async () => {
        try {
            // Upload file to server
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload-reader', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Show the viewer
            openViewer();

            // Clear any previous content
            pdfContainer.innerHTML = '';
            
            // Set file name in the viewer
            viewerFilename.textContent = data.filename;
            
            // Disable PDF navigation
            btnPrevPage.disabled = true;
            btnNextPage.disabled = true;
            pageInfo.textContent = '';
            
            // Display the image
            imageViewer.src = data.url;
            imageViewer.style.display = 'block';
            currentZoom = 1.0;
            imageViewer.style.transform = `scale(${currentZoom})`;

        } catch (error) {
            console.error('Upload error:', error);
            showToast('Erreur lors du téléchargement de l\'image', 'error');
        } finally {
            // Reset file input
            e.target.value = null;
        }
    });
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
        
        // Clear previous content
        pdfContainer.innerHTML = '';
        
        // Create a container for continuous scrolling
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'pdf-scroll-container';
        pdfContainer.appendChild(scrollContainer);
        
        // Render all pages in continuous mode
        await renderAllPDFPages(scrollContainer);
    } catch (error) {
        console.error('Error loading PDF:', error);
        showToast('Erreur lors du chargement du PDF', 'error');
    }
}

// Render all PDF pages in continuous scroll mode
async function renderAllPDFPages(container) {
    if (!currentPDFDoc) return;
    
    await heavyOperation(async () => {
        try {
            // Calculate a reasonable scale based on container width
            const containerWidth = container.clientWidth || pdfContainer.clientWidth;
            const firstPage = await currentPDFDoc.getPage(1);
            const firstViewport = firstPage.getViewport({ scale: 1.0 });
            
            // Calculate scale to fit page width
            const baseScale = Math.min((containerWidth - 20) / firstViewport.width, 1.5);
            currentZoom = baseScale;
            
            // Render each page with spacing
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                // Get the page
                const page = await currentPDFDoc.getPage(pageNum);
                
                // Create a wrapper for this page
                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'pdf-page-wrapper';
                pageWrapper.dataset.pageNum = pageNum;
                container.appendChild(pageWrapper);
                
                // Create a canvas for rendering
                const canvas = document.createElement('canvas');
                pageWrapper.appendChild(canvas);
                
                // Add page number indicator
                const pageLabel = document.createElement('div');
                pageLabel.className = 'pdf-page-label';
                pageLabel.textContent = `${pageNum} / ${totalPages}`;
                pageWrapper.appendChild(pageLabel);
                
                // Calculate viewport with current zoom
                const viewport = page.getViewport({ scale: currentZoom });
                
                // Set canvas dimensions
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                // Render the page
                await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: viewport
                }).promise;
            }
        } catch (error) {
            console.error('Error rendering PDF pages:', error);
            showToast('Erreur lors du rendu des pages PDF', 'error');
        }
    });
}

// Zoom in
function zoomIn() {
    if (currentPDFDoc) {
        // PDF zoom logic
        currentZoom = Math.min(currentZoom * 1.25, 3.0);
        applyZoom();
    } else {
        // Image zoom logic
        currentZoom = Math.min(currentZoom * 1.25, 5.0);
        applyImageZoom();
    }
}

// Zoom out
function zoomOut() {
    if (currentPDFDoc) {
        // PDF zoom logic
        currentZoom = Math.max(currentZoom * 0.8, 0.5);
        applyZoom();
    } else {
        // Image zoom logic
        currentZoom = Math.max(currentZoom * 0.8, 0.1);
        applyImageZoom();
    }
}

// Apply zoom to all PDF pages
async function applyZoom() {
    const scrollContainer = document.querySelector('.pdf-scroll-container');
    if (!scrollContainer || !currentPDFDoc) return;
    
    await heavyOperation(async () => {
        try {
            // Store current scroll position as a percentage
            const scrollPercentage = pdfContainer.scrollTop / pdfContainer.scrollHeight;
            
            // Clear the container
            scrollContainer.innerHTML = '';
            
            // Re-render all pages with new zoom
            await renderAllPDFPages(scrollContainer);
            
            // Restore scroll position by percentage
            setTimeout(() => {
                pdfContainer.scrollTop = scrollPercentage * pdfContainer.scrollHeight;
            }, 50);
        } catch (error) {
            console.error('Error applying zoom:', error);
        }
    });
}

// Adjust the nextPage and prevPage functions for the new scroll view
function nextPage() {
    const pageWrappers = document.querySelectorAll('.pdf-page-wrapper');
    if (!pageWrappers.length) return;
    
    // Find the first fully visible page wrapper
    let currentVisiblePage = 1;
    for (let i = 0; i < pageWrappers.length; i++) {
        const rect = pageWrappers[i].getBoundingClientRect();
        const containerRect = pdfContainer.getBoundingClientRect();
        
        // If the top of the page is above the bottom of the viewport and the bottom is below the top
        if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
            currentVisiblePage = parseInt(pageWrappers[i].dataset.pageNum);
            break;
        }
    }
    
    // Go to next page if not the last
    if (currentVisiblePage < totalPages) {
        const nextPageEl = document.querySelector(`.pdf-page-wrapper[data-page-num="${currentVisiblePage + 1}"]`);
        if (nextPageEl) {
            nextPageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            currentPage = currentVisiblePage + 1;
            pageInfo.textContent = `Page: ${currentPage}/${totalPages}`;
        }
    }
}

function prevPage() {
    const pageWrappers = document.querySelectorAll('.pdf-page-wrapper');
    if (!pageWrappers.length) return;
    
    // Find the first fully visible page wrapper
    let currentVisiblePage = 1;
    for (let i = 0; i < pageWrappers.length; i++) {
        const rect = pageWrappers[i].getBoundingClientRect();
        const containerRect = pdfContainer.getBoundingClientRect();
        
        // If the top of the page is above the bottom of the viewport and the bottom is below the top
        if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
            currentVisiblePage = parseInt(pageWrappers[i].dataset.pageNum);
            break;
        }
    }
    
    // Go to previous page if not the first
    if (currentVisiblePage > 1) {
        const prevPageEl = document.querySelector(`.pdf-page-wrapper[data-page-num="${currentVisiblePage - 1}"]`);
        if (prevPageEl) {
            prevPageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            currentPage = currentVisiblePage - 1;
            pageInfo.textContent = `Page: ${currentPage}/${totalPages}`;
        }
    }
}

// Open viewer
function openViewer() {
    viewerPanel.classList.remove('hidden');
    mainContent.classList.remove('full-width');
    
    // Reset state
    currentPDFDoc = null;
    currentPage = 1;
    totalPages = 0;
    currentZoom = 1.0;
    
    // Make sure the viewer panel is visible
    viewerPanel.style.display = 'flex';
    
    // Reset containers
    pdfContainer.innerHTML = '';
    imageViewer.src = '';
    imageViewer.style.display = 'none';
}

// Close viewer
function closeViewer() {
    viewerPanel.classList.add('hidden');
    mainContent.classList.add('full-width');
    currentPDFDoc = null;
}

// Load data from API
async function loadData() {
    await heavyOperation(async () => {
        try {
            const response = await fetch('/api/load');
            const data = await response.json();
            blocks = data.blocks || [];
            blockTypes = data.blockTypes || ['HB', 'B', 'DB', 'C', 'HC'];
            glossary = data.glossary || []; // <-- MODIFIÉ: Chargement du glossaire

            // Séparer les types par défaut des types personnalisés
            const defaultTypes = ['HB', 'B', 'DB', 'C', 'HC'];
            customTypes = blockTypes.filter(type => !defaultTypes.includes(type));
            
            history = [];
            aiMap = {};
            renderBlocks();
            renderBlockTypeButtons();
            renderCustomTypes(); // Afficher les types personnalisés
            renderGlossary();    // <-- MODIFIÉ: Affichage du glossaire
            updateBlockCount();
        } catch (error) {
            console.error('Failed to load data:', error);
            showToast('Erreur lors du chargement', 'error');
        }
    });
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
async function saveData(opts = {showSpinner: false}) {
    const {showSpinner} = opts;
    try {
        if (showSpinner) showLoading(true);
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks, blockTypes, glossary }) // <-- MODIFIÉ: Envoi du glossaire
        });
    } catch (error) {
        console.error('Failed to save data:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        if (showSpinner) showLoading(false);
    }
}

// Render block type buttons
function renderBlockTypeButtons() {
    // Use default types if none are loaded yet
    const typesToRender = blockTypes.length > 0 ? blockTypes : ['HB', 'B', 'DB', 'C', 'HC'];
    
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

// **NEW** Creates a DOM element for a single block
function createBlockElement(block, index) {
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

    if (block.comment) {
        commentTextarea.value = block.comment;
        commentContainer.style.display = 'block';
        commentBtn.classList.add('active');
    }

    textareaEl.setAttribute('data-min-rows', '2');
    autoResizeTextarea(textareaEl);
    commentTextarea.setAttribute('data-min-rows', '1');
    autoResizeTextarea(commentTextarea);

    textareaEl.addEventListener('input', (e) => {
        pushHistory();
        block.content = e.target.value;
        autoResizeTextarea(e.target);
        scheduleAutoSave();
        document.getElementById('btn-undo').disabled = false;
    });

    commentTextarea.addEventListener('input', (e) => {
        block.comment = e.target.value;
        autoResizeTextarea(e.target);
        scheduleAutoSave();
    });

    commentBtn.addEventListener('click', () => {
        commentContainer.style.display = commentContainer.style.display === 'none' ? 'block' : 'none';
        commentBtn.classList.toggle('active');
        if (commentContainer.style.display === 'block') {
            commentTextarea.focus();
            autoResizeTextarea(commentTextarea);
        }
    });

    aiBtn.addEventListener('click', () => askAi(index));
    deleteBtn.addEventListener('click', () => deleteBlock(index));

    if (aiMap[index] && aiMap[index].suggestions && aiMap[index].suggestions.length) {
        renderSuggestions(suggestionsEl, aiMap[index].suggestions, index);
    }
    
    // Set opacity to 1 to avoid the default staggered animation on full re-renders
    blockEl.style.opacity = 1;

    return blockEl;
}


// **MODIFIED** Renders all blocks from scratch (used for initial load, import, delete)
function renderBlocks() {
    blocksContainer.innerHTML = '';
    blocks.forEach((block, index) => {
        const el = createBlockElement(block, index);
        blocksContainer.appendChild(el);
    });
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
    
    // Ajouter des informations sur la source si disponibles
    const aiData = aiMap[blockIndex];
    if (aiData && aiData.sourceLang && aiData.ocrText) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'suggestion-info mb-3';
        infoDiv.innerHTML = `
            <small style="color: var(--text-light); font-style: italic;">
                <i class="fas fa-language"></i> Langue détectée: ${aiData.sourceLang} | 
                <i class="fas fa-eye"></i> Texte original: "${aiData.ocrText.substring(0, 50)}${aiData.ocrText.length > 50 ? '...' : ''}"
            </small>
        `;
        container.appendChild(infoDiv);
    }
    
    suggestions.forEach((suggestion, index) => {
        const suggEl = document.createElement('div');
        suggEl.className = 'suggestion-card';
        suggEl.style.animationDelay = `${index * 0.1}s`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'suggestion-content';
        
        // Si c'est une suggestion OCR, l'afficher différemment
        if (suggestion.startsWith('[OCR: ')) {
            contentDiv.innerHTML = `<i class="fas fa-eye"></i> <strong>Texte détecté:</strong> ${suggestion.replace('[OCR: ', '').replace(']', '')}`;
            suggEl.style.backgroundColor = 'var(--info-light)';
            suggEl.style.borderLeft = '3px solid var(--info)';
        } else {
            contentDiv.textContent = suggestion;
        }
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'suggestion-actions';
        
        const button = document.createElement('button');
        button.innerHTML = '<i class="fas fa-check"></i> Appliquer';
        button.className = 'suggestion-apply';
        button.addEventListener('click', () => acceptSuggestion(blockIndex, suggestion));
        button.addEventListener('click', createRipple);
        
        actionsDiv.appendChild(button);
        suggEl.appendChild(contentDiv);
        suggEl.appendChild(actionsDiv);
        container.appendChild(suggEl);
    });
    
    // Bouton pour masquer les suggestions
    const hideBtn = document.createElement('button');
    hideBtn.innerHTML = '<i class="fas fa-times"></i> Masquer les suggestions';
    hideBtn.className = 'btn btn-secondary btn-sm mt-3';
    hideBtn.addEventListener('click', () => {
        if (aiMap[blockIndex]) {
            delete aiMap[blockIndex];
        }
        renderBlocks();
    });
    hideBtn.addEventListener('click', createRipple);
    container.appendChild(hideBtn);
}

// **MODIFIED** Add block efficiently without re-rendering everything
function addBlock(type) {
    pushHistory();
    const nextNumber = Math.max(0, ...blocks.filter(b => b.type === type).map(b => b.number)) + 1;
    const newBlock = { type, number: nextNumber, content: '', comment: '' };
    blocks.push(newBlock);

    // Create and append only the new block element
    const newBlockElement = createBlockElement(newBlock, blocks.length - 1);
    
    // Add a class for a subtle fade-in animation
    newBlockElement.classList.add('new-block-fade-in');
    
    blocksContainer.appendChild(newBlockElement);
    
    // Scroll to the new block and focus its textarea
    newBlockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    newBlockElement.querySelector('textarea').focus();

    updateBlockCount();
    scheduleAutoSave();
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
    scheduleAutoSave();
    renderBlocks();
    updateBlockCount();
    
    document.getElementById('btn-undo').disabled = history.length === 0;
}

// Export project to ZIP format (uses new backend endpoint)
async function exportZip() {
    await heavyOperation(async () => {
        try {
            showToast('Création du fichier ZIP...', 'info');
            
            // Call the backend endpoint to create the ZIP
            const response = await fetch('/api/export-zip');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur de serveur');
            }
                    
            // Get the ZIP file as a blob
            const blob = await response.blob();
                    
            // Create a URL for the blob
            const url = URL.createObjectURL(blob);
            
            // Create a download link
            const a = document.createElement('a');
            a.href = url;
            a.download = 'webtoon_export.zip';
            document.body.appendChild(a);
            
            // Click the download link
            a.click();
            
            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Export ZIP réussi', 'success');
        } catch (error) {
            console.error('Export ZIP error:', error);
            showToast('Erreur lors de l\'export ZIP: ' + error.message, 'error');
        }
    });
}

// Import project
async function importProject(e) {
    const file = e.target.files[0];
    if (!file) return;

    await heavyOperation(async () => {
        try {
            console.log(`Fichier à importer: ${file.name}, type: ${file.type}, taille: ${file.size} octets`);
            
            const isZip = file.type === 'application/zip' || 
                         file.type === 'application/x-zip-compressed' || 
                         file.name.toLowerCase().endsWith('.zip') ||
                         file.name.toLowerCase().endsWith('.wtoon');
            
            console.log(`Format détecté: ${isZip ? 'ZIP/WTOON' : 'JSON'}`);
            
            if (isZip) {
                await importZipProject(file);
                showToast('Projet importé avec succès (format ZIP)', 'success');
            } else {
                await importJsonProject(file);
                showToast('Projet importé avec succès (format JSON)', 'success');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast(`Erreur d'importation: ${error.message || 'Fichier invalide'}`, 'error');
        } finally {
            fileImport.value = null; // Reset file input
        }
    });
}

// Vérifie et affiche les informations de débogage sur les images importées
function logImageInfo(imagesArray) {
    if (!Array.isArray(imagesArray)) {
        console.error("logImageInfo: ce n'est pas un tableau d'images", imagesArray);
        return false;
    }
    
    if (imagesArray.length === 0) {
        console.warn("logImageInfo: tableau d'images vide");
        return false;
    }
    
    console.log(`Images (${imagesArray.length} au total):`, imagesArray);
    
    let validFormat = true;
    for (let i = 0; i < Math.min(5, imagesArray.length); i++) {
        const img = imagesArray[i];
        if (!img.url || !img.filename) {
            console.error(`Image ${i} invalide, format attendu:`, {
                filename: String,
                url: String,
                path: String
            });
            validFormat = false;
            break;
        }
    }
    
    const firstImg = imagesArray[0];
    console.log("URL première image:", firstImg.url);
    console.log("Vérification de l'accès à l'image:", firstImg.url);
    
    const img = new Image();
    img.onload = () => console.log("✅ Image chargée avec succès");
    img.onerror = () => console.error("❌ Erreur de chargement de l'image");
    img.src = firstImg.url;
    
    return validFormat;
}

// Import project from ZIP format
async function importZipProject(file) {
    try {
        showToast('Importation du fichier ZIP...', 'info');
        
        console.log('Préparation du fichier pour import:', file.name, file.type, file.size + ' octets');

        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 90) {
            throw new Error(`Fichier trop volumineux (${fileSizeMB.toFixed(1)} MB). La limite est de 90 MB.`);
        }
        
        if (!file.name.toLowerCase().endsWith('.zip') && !file.name.toLowerCase().endsWith('.wtoon')) {
            throw new Error('Le fichier doit avoir une extension .zip ou .wtoon');
        }
        
        const formData = new FormData();
        formData.append('file', file);
                
        const response = await fetch('/api/import-zip', {
            method: 'POST',
            body: formData
        });
                
        if (response.status === 413) {
            throw new Error(`Le fichier est trop volumineux pour le serveur. La limite est de 90 MB. 
Vous pouvez essayer de diviser votre projet en plusieurs fichiers plus petits.`);
        }
        
        const rawResponse = await response.text();
        console.log('Réponse brute (début):', rawResponse.substring(0, 200) + '...'); 
        
        let data;
        try {
            data = JSON.parse(rawResponse);
        } catch (parseError) {
            console.error('Erreur de parsing JSON:', parseError);
            console.error('Réponse non JSON (début):', rawResponse.substring(0, 200));
            
            let detailedError = 'La réponse du serveur n\'est pas au format JSON valide.';
            
            if (rawResponse.trim().startsWith('<!DOCTYPE') || rawResponse.trim().startsWith('<html')) {
                detailedError = 'Le serveur a renvoyé une page HTML au lieu de JSON. Cela peut indiquer une erreur interne du serveur.';
            }
            
            throw new Error(`Erreur d'importation: ${detailedError}`);
        }
        
        if (data.error) {
            const errorDetails = data.details ? `\nDétails: ${data.details}` : '';
            throw new Error(`${data.error}${errorDetails}`);
        }
        
        if (data.status !== 'success') {
            throw new Error(data.error || 'Import failed');
        }
        
        console.log('Import success:', data);
        
        // MODIFIÉ : Mise à jour des données incluant le glossaire
        blocks = data.project.blocks || [];
        blockTypes = data.project.blockTypes || ['HB', 'B', 'DB', 'C', 'HC'];
        glossary = data.project.glossary || []; // <-- NOUVEAU

        if (data.imagesFolder) {
            try {
                console.log('Images folder:', data.imagesFolder);
                const folderName = data.imagesFolder;
                const folderPath = `/static/uploads/${folderName}`;
                
                if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                    console.log(`Affichage de ${data.images.length} images fournies par le serveur`);
                    logImageInfo(data.images);
                    displayExtractedImages(data.images);
                    
                    setTimeout(() => {
                        if (extractedImagesContainer.children.length === 0) {
                            console.error("Les images n'ont pas été affichées correctement. Tentative de récupération...");
                            extractedImagesContainer.innerHTML = '';
                            displayExtractedImages(data.images);
                        }
                    }, 500);
                } else {
                    console.warn("Pas d'informations détaillées sur les images. Utilisation de la méthode alternative.");
                    showToast(`Images importées dans le dossier ${folderName}. Utilisez le panneau Projet pour les voir.`, 'info', 7000);
                }
                
                const nombreImages = data.images ? data.images.length : 0;
                extractionStatus.textContent = `${nombreImages} images importées avec succès`;
                extractionStatus.className = 'status-message success';
                projectSidebar.setAttribute('data-visible', 'true');
                showToast(`Import réussi : ${blocks.length} blocs et ${nombreImages} images.`, 'success');
            } catch (error) {
                console.error('Error handling images info:', error);
            }
        }
        
        history = [];
        aiMap = {};
        
        saveData();
        renderBlocks();
        renderBlockTypeButtons();
        renderGlossary(); // <-- NOUVEAU
        updateBlockCount();
        document.getElementById('btn-undo').disabled = true;
        
    } catch (error) {
        console.error('Error importing ZIP:', error);
        
        const errorMessage = error.message || 'Erreur inconnue';
        
        let suggestions = '';
        if (errorMessage.includes('HTML') || errorMessage.includes('<!DOCTYPE')) {
            suggestions = '\nEssayez de recharger la page et réessayer.';
        } else if (errorMessage.includes('project_data.json missing')) {
            suggestions = '\nVérifiez que votre archive ZIP contient un fichier project_data.json à la racine.';
        } else if (errorMessage.includes('JSON decode error') || errorMessage.includes('parse')) { 
            suggestions = '\nLe fichier JSON est mal formaté. Vérifiez sa structure.';
        } else if (errorMessage.includes('Bad ZIP format')) {
            suggestions = '\nVérifiez que votre fichier n\'est pas corrompu.';
        }
        
        showToast('Erreur d\'importation: ' + errorMessage + suggestions, 'error', 10000);
        throw error;
    }
}

// Import project from JSON format (legacy)
async function importJsonProject(file) {
    return new Promise((resolve, reject) => {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 90) {
            reject(new Error(`Fichier trop volumineux (${fileSizeMB.toFixed(1)} MB). La limite est de 90 MB.`));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const data = JSON.parse(event.target.result);
                blocks = data.blocks || [];
                blockTypes = data.blockTypes || ['HB', 'B', 'DB', 'C', 'HC'];
                glossary = data.glossary || []; // <-- NOUVEAU

                if (data.embeddedImages && Object.keys(data.embeddedImages).length > 0) {
                    const importId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
                    const importFolder = `webtoon_${importId}`;
                    
                    await fetch('/api/create-folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folderName: importFolder })
                    });
                    
                    const importedImages = [];
                    
                    for (const [path, base64] of Object.entries(data.embeddedImages)) {
                        try {
                            const filename = path.split('/').pop();
                            const fetchResponse = await fetch(base64);
                            const blob = await fetchResponse.blob();
                            
                            const formData = new FormData();
                            formData.append('file', blob, filename);
                            formData.append('targetFolder', importFolder);
                            
                            const uploadResponse = await fetch('/api/upload-to-folder', {
                                method: 'POST',
                                body: formData
                            });
                            
                            const uploadData = await uploadResponse.json();
                            
                            importedImages.push({
                                filename: filename,
                                url: uploadData.url,
                                path: uploadData.path
                            });
                            
                            blocks.forEach(block => {
                                if (block.content) {
                                    block.content = block.content.replaceAll(
                                        path, 
                                        uploadData.url
                                    );
                                }
                            });
                        } catch (error) {
                            console.error(`Failed to process embedded image ${path}:`, error);
                        }
                    }
                    
                    if (importedImages.length > 0) {
                        extractionStatus.textContent = `${importedImages.length} images importées avec succès`;
                        extractionStatus.className = 'status-message success';
                        displayExtractedImages(importedImages);
                        projectSidebar.setAttribute('data-visible', 'true');
                        showToast(`${importedImages.length} images restaurées depuis le fichier importé`, 'success');
                    }
                }
                
                history = [];
                aiMap = {};
                saveData();
                renderBlocks();
                renderBlockTypeButtons();
                renderGlossary(); // <-- NOUVEAU
                updateBlockCount();
                document.getElementById('btn-undo').disabled = true;
                
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Erreur de lecture du fichier'));
        };
        
        reader.readAsText(file);
    });
}

// Reset all
function resetAll() {
    if (confirm('Tout effacer ?')) {
        blocks = [];
        glossary = []; // <-- MODIFIÉ
        history = [];
        aiMap = {};
        spellcheckResult.innerHTML = '<p>Aucun rapport.</p>';
        saveData({ showSpinner: true });
        renderBlocks();
        renderGlossary(); // <-- MODIFIÉ
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
            customTypes.push(newType);
            
            renderBlockTypeButtons();
            
            const container = document.getElementById('custom-types-container');
            if (container) {
                const infoText = container.querySelector('.info-text');
                if (infoText) {
                    infoText.remove();
                }
                
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
                
                setTimeout(() => {
                    typeItem.style.opacity = '1';
                    typeItem.style.transform = 'scale(1)';
                }, 10);
            } else {
                renderCustomTypes();
            }
            
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
    
    await heavyOperation(async () => {
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
            
        } catch (error) {
            console.error('Failed to export DOCX:', error);
            showToast('Erreur export DOCX', 'error');
        }
    });
}

// Spellcheck function - nouvelle version interactive
async function spellCheck() {
    if (blocks.length === 0) {
        showToast('Aucun bloc à vérifier', 'error');
        return;
    }
    
    await heavyOperation(async () => {
        try {
            const response = await fetch('/api/spellcheck', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocks })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.errors && data.errors.length > 0) {
                    spellErrors = data.errors;
                    currentSpellIndex = 0;
                    spellHistory = [];
                    
                    showSpellcheckModal();
                } else {
                    spellcheckResult.innerHTML = `<pre>${data.report}</pre>`;
                    toggleToolsSidebar(true);
                    showToast('Aucune erreur trouvée', 'success');
                }
            } else {
                spellcheckResult.innerHTML = '<p class="error">Erreur de connexion</p>';
                showToast('Erreur de connexion', 'error');
            }
            
        } catch (error) {
            console.error('Failed to spellcheck:', error);
            spellcheckResult.innerHTML = '<p class="error">Erreur de connexion</p>';
            showToast('Erreur de connexion', 'error');
        }
    });
}

// Afficher le modal de correction orthographique
function showSpellcheckModal() {
    const modal = document.getElementById('spellcheck-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    showNextError();
}

// Fermer le modal de correction orthographique
function closeSpellcheckModal() {
    const modal = document.getElementById('spellcheck-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    
    spellErrors = [];
    currentSpellIndex = 0;
    spellHistory = [];
}

// Afficher l'erreur suivante
function showNextError() {
    if (currentSpellIndex >= spellErrors.length) {
        closeSpellcheckModal();
        showToast('Correction terminée !', 'success');
        return;
    }
    
    const error = spellErrors[currentSpellIndex];
    const block = blocks[error.block_index];
    
    console.log('Erreur actuelle:', {
        blockIndex: error.block_index,
        errorStart: error.error_start,
        errorEnd: error.error_end,
        blockContent: block.content,
        errorText: block.content.substring(error.error_start, error.error_end)
    });
    
    document.getElementById('spellcheck-counter').textContent = 
        `${currentSpellIndex + 1} / ${spellErrors.length}`;
    
    document.getElementById('spellcheck-block-info').textContent = 
        `Bloc: ${block.type}${block.number}`;
    
    const contextText = document.getElementById('spellcheck-context-text');
    const blockContent = block.content;
    
    if (error.error_start >= 0 && error.error_end <= blockContent.length && error.error_start < error.error_end) {
        const beforeError = blockContent.substring(0, error.error_start);
        const errorText = blockContent.substring(error.error_start, error.error_end);
        const afterError = blockContent.substring(error.error_end);
        
        contextText.innerHTML = `${beforeError}<span class="highlight">${errorText}</span>${afterError}`;
    } else {
        contextText.innerHTML = `<span class="highlight">Erreur de position</span>${blockContent}`;
        console.error('Position d\'erreur invalide:', error);
    }
    
    document.getElementById('spellcheck-error-message').textContent = error.message;
    
    const suggestionsList = document.getElementById('spellcheck-suggestions-list');
    suggestionsList.innerHTML = '';
    
    if (error.replacements && error.replacements.length > 0) {
        error.replacements.slice(0, 5).forEach((replacement, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <span class="suggestion-text">${replacement.value}</span>
                <button class="suggestion-apply-btn btn btn-primary btn-sm">
                    <i class="fas fa-check"></i> Appliquer
                </button>
            `;
            
            suggestionItem.addEventListener('click', () => {
                suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                suggestionItem.classList.add('selected');
                document.getElementById('spellcheck-apply').disabled = false;
            });
            
            suggestionsList.appendChild(suggestionItem);
        });
    } else {
        const noSuggestions = document.createElement('div');
        noSuggestions.className = 'suggestion-item';
        noSuggestions.innerHTML = '<span class="suggestion-text">Aucune suggestion disponible</span>';
        suggestionsList.appendChild(noSuggestions);
        document.getElementById('spellcheck-apply').disabled = true;
    }
    
    document.getElementById('spellcheck-apply').disabled = true;
    document.getElementById('spellcheck-back').disabled = currentSpellIndex === 0;
}

// Appliquer la correction sélectionnée
async function applySpellcheckCorrection() {
    const error = spellErrors[currentSpellIndex];
    const selectedSuggestion = document.querySelector('.suggestion-item.selected');
    
    if (!selectedSuggestion) {
        showToast('Sélectionnez une suggestion', 'warning');
        return;
    }
    
    const suggestionText = selectedSuggestion.querySelector('.suggestion-text').textContent;
    
    try {
        const response = await fetch('/api/apply-correction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                block_index: error.block_index,
                error_start: error.error_start,
                error_end: error.error_end,
                replacement: suggestionText
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            spellHistory.push({
                blockIndex: error.block_index,
                oldContent: data.original,
                errorIndex: currentSpellIndex
            });
            
            blocks[error.block_index].content = data.corrected;
            renderBlocks();
            
            currentSpellIndex++;
            showNextError();
            
            showToast('Correction appliquée', 'success');
        } else {
            const errorData = await response.json();
            showToast(`Erreur: ${errorData.error}`, 'error');
        }
    } catch (error) {
        console.error('Error applying correction:', error);
        showToast('Erreur lors de l\'application de la correction', 'error');
    }
}

// Ignorer l'erreur actuelle
function ignoreSpellcheckError() {
    currentSpellIndex++;
    showNextError();
}

// Revenir à l'erreur précédente
function goBackSpellcheck() {
    if (currentSpellIndex > 0) {
        currentSpellIndex--;
        showNextError();
    }
}

// Annuler la dernière correction
async function undoLastSpellcheck() {
    if (spellHistory.length > 0) {
        const lastAction = spellHistory.pop();
        const block = blocks[lastAction.blockIndex];
        
        try {
            const response = await fetch('/api/apply-correction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    block_index: lastAction.blockIndex,
                    error_start: 0,
                    error_end: block.content.length,
                    replacement: lastAction.oldContent
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                block.content = data.corrected;
                renderBlocks();
                
                currentSpellIndex = lastAction.errorIndex;
                showNextError();
                
                showToast('Dernière correction annulée', 'info');
            } else {
                const errorData = await response.json();
                showToast(`Erreur lors de l'annulation: ${errorData.error}`, 'error');
            }
        } catch (error) {
            console.error('Error undoing correction:', error);
            showToast('Erreur lors de l\'annulation', 'error');
        }
    }
}

// Ask AI for suggestions
async function askAi(blockIndex) {
    const block = blocks[blockIndex];
    if (!block || !block.content.trim()) {
        showToast('Le bloc doit contenir du texte pour être reformulé', 'warning');
        return;
    }
    
    if (!geminiKey) {
        showToast('Configurez d\'abord votre clé Gemini dans les outils', 'warning');
        return;
    }
    
    currentReformulationBlockIndex = blockIndex;
    currentReformulationContent = block.content;
    currentReformulationIntention = '';
    currentReformulationCustom = '';
    
    openReformulationModal();
}

// Ouvrir le modal de sélection d'intention
function openReformulationModal() {
    const modal = document.getElementById('reformulation-modal');
    const generateBtn = document.getElementById('generate-reformulation');
    const customTextarea = document.getElementById('custom-intention');
    
    document.querySelectorAll('.intention-option').forEach(option => {
        option.classList.remove('selected');
    });
    customTextarea.value = '';
    generateBtn.disabled = true;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    document.querySelectorAll('.intention-option').forEach(option => {
        option.removeEventListener('click', handleIntentionClick);
    });
    
    document.querySelectorAll('.intention-option').forEach(option => {
        option.addEventListener('click', handleIntentionClick);
    });
    
    customTextarea.removeEventListener('input', handleCustomIntention);
    customTextarea.addEventListener('input', handleCustomIntention);
    
    generateBtn.removeEventListener('click', generateReformulation);
    generateBtn.addEventListener('click', generateReformulation);
}

// Gestionnaire pour le clic sur une option d'intention
function handleIntentionClick(event) {
    const option = event.currentTarget;
    selectIntention(option);
}

// Gestionnaire pour le textarea personnalisé
function handleCustomIntention(event) {
    const customTextarea = event.target;
    const customOption = document.querySelector('[data-intention="custom"]');
    const generateBtn = document.getElementById('generate-reformulation');
    
    if (customTextarea.value.trim()) {
        document.querySelectorAll('.intention-option').forEach(option => {
            if (option !== customOption) {
                option.classList.remove('selected');
            }
        });
        
        customOption.classList.add('selected');
        currentReformulationIntention = 'custom';
        currentReformulationCustom = customTextarea.value.trim();
        generateBtn.disabled = false;
    } else {
        customOption.classList.remove('selected');
        if (currentReformulationIntention === 'custom') {
            currentReformulationIntention = '';
            generateBtn.disabled = true;
        }
    }
}

// Sélectionner une intention
function selectIntention(optionElement) {
    document.querySelectorAll('.intention-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    optionElement.classList.add('selected');
    
    currentReformulationIntention = optionElement.dataset.intention;
    currentReformulationCustom = '';
    
    if (currentReformulationIntention !== 'custom') {
        const customTextarea = document.getElementById('custom-intention');
        customTextarea.value = '';
    }
    
    const generateBtn = document.getElementById('generate-reformulation');
    generateBtn.disabled = false;
    
    if (currentReformulationIntention === 'custom') {
        const customTextarea = document.getElementById('custom-intention');
        customTextarea.focus();
    }
    
    showToast(`Intention sélectionnée : ${optionElement.querySelector('h4').textContent}`, 'info');
}

// Générer la reformulation
async function generateReformulation() {
    if (!currentReformulationIntention) {
        showToast('Sélectionnez une intention de reformulation', 'warning');
        return;
    }
    
    const generateBtn = document.getElementById('generate-reformulation');
    const originalText = generateBtn.innerHTML;
    
    try {
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
        generateBtn.disabled = true;
        
        const response = await fetch('/api/reformulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: geminiKey,
                content: currentReformulationContent,
                intention: currentReformulationIntention,
                custom_intention: currentReformulationCustom
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de la reformulation');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            closeReformulationModal();
            displayReformulationResults(data.suggestions);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
        
    } catch (error) {
        console.error('Reformulation error:', error);
        showToast(`Erreur: ${error.message}`, 'error');
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

// Afficher les résultats de reformulation
function displayReformulationResults(suggestions) {
    const modal = document.getElementById('reformulation-results-modal');
    const resultsContainer = document.getElementById('reformulation-results');
    const template = document.getElementById('reformulation-suggestion-template');
    
    resultsContainer.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
        const suggestionElement = document.importNode(template.content, true).firstElementChild;
        const contentDiv = suggestionElement.querySelector('.suggestion-content');
        const applyBtn = suggestionElement.querySelector('.suggestion-apply');
        
        contentDiv.textContent = suggestion;
        
        applyBtn.addEventListener('click', () => {
            applyReformulationSuggestion(suggestion);
        });
        
        resultsContainer.appendChild(suggestionElement);
    });
    
    document.getElementById('regenerate-reformulation').addEventListener('click', () => {
        closeReformulationResultsModal();
        openReformulationModal();
    });
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Appliquer une suggestion de reformulation
function applyReformulationSuggestion(suggestion) {
    if (currentReformulationBlockIndex >= 0 && currentReformulationBlockIndex < blocks.length) {
        pushHistory();
        blocks[currentReformulationBlockIndex].content = suggestion;
        saveData();
        renderBlocks();
        
        closeReformulationResultsModal();
        
        const blockElements = document.querySelectorAll('.block');
        if (currentReformulationBlockIndex < blockElements.length) {
            blockElements[currentReformulationBlockIndex].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
        
        document.getElementById('btn-undo').disabled = false;
        showToast('Reformulation appliquée', 'success');
    }
}

// Fermer le modal de sélection d'intention
function closeReformulationModal() {
    const modal = document.getElementById('reformulation-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Fermer le modal des résultats
function closeReformulationResultsModal() {
    const modal = document.getElementById('reformulation-results-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Accept AI suggestion
function acceptSuggestion(blockIndex, suggestion) {
    const block = blocks[blockIndex];
    if (!block) return;
    
    pushHistory();
    
    if (suggestion.startsWith('[OCR: ')) {
        suggestion = suggestion.replace('[OCR: ', '').replace(']', '');
    }
    
    block.content = suggestion;
    saveData();
    
    if (aiMap[blockIndex]) {
        delete aiMap[blockIndex];
    }
    
    renderBlocks();
    
    document.getElementById('btn-undo').disabled = false;
    showToast('Suggestion appliquée', 'success');
}

// Toggle project sidebar
function toggleProjectSidebar(show) {
    const isVisible = projectSidebar.getAttribute('data-visible') === 'true';
    
    if (show === undefined) {
        projectSidebar.setAttribute('data-visible', isVisible ? 'false' : 'true');
    } else {
        projectSidebar.setAttribute('data-visible', show ? 'true' : 'false');
    }
}

// Toggle tools sidebar
function toggleToolsSidebar(show) {
    const isVisible = toolsSidebar.getAttribute('data-visible') === 'true';
    
    if (show === undefined) {
        toolsSidebar.setAttribute('data-visible', isVisible ? 'false' : 'true');
    } else {
        toolsSidebar.setAttribute('data-visible', show ? 'true' : 'false');
    }
}

// Toggle theme
function toggleTheme() {
    clearTimeout(themeClickTimer);
    themeClickCount++;
    
    themeClickTimer = setTimeout(() => {
        themeClickCount = 0;
    }, 1000);
    
    if (themeClickCount >= 3) {
        theme = 'obsidian';
        themeClickCount = 0;
    } else if (theme === 'light') {
        theme = 'dark';
    } else if (theme === 'dark' && themeClickCount < 3) {
        theme = 'light';
    } else if (theme === 'obsidian') {
        theme = 'light';
    }
    
    localStorage.setItem('wtoon-theme', theme);
    setTheme(theme);
    
    let themeName = theme === 'light' ? 'clair' : (theme === 'dark' ? 'sombre' : 'obsidienne');
    showToast(`Thème ${themeName} activé`, 'info');
}

// Set theme
function setTheme(newTheme) {
    document.body.classList.remove('light', 'dark', 'obsidian');
    document.body.classList.add(newTheme);
    
    const themeBtn = document.getElementById('btn-theme');
    if (newTheme === 'light') {
        themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else if (newTheme === 'dark') {
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else if (theme === 'obsidian') {
        themeBtn.innerHTML = '<i class="fas fa-star"></i>';
    }
}

// Update Gemini key
function updateGeminiKey() {
    geminiKey = geminiKeyInput.value;
    localStorage.setItem('geminiKey', geminiKey);
    saveApiKeys(geminiKey, firecrawlKey);
}

// Update Firecrawl key
function updateFirecrawlKey() {
    firecrawlKey = firecrawlKeyInput.value;
    saveApiKeys(geminiKey, firecrawlKey);
}

// Update block count
function updateBlockCount() {
    blockCountEl.textContent = `${blocks.length} bloc${blocks.length > 1 ? 's' : ''}`;
}

// Render custom types in the project sidebar
function renderCustomTypes() {
    const container = document.getElementById('custom-types-container');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (customTypes.length === 0) {
        container.innerHTML = '<p class="info-text">Aucun type personnalisé</p>';
        return;
    }
    
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
            e.stopPropagation();
            deleteCustomType(type);
        });
        
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
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le type "${type}" ?`)) {
        return;
    }
    
    const usedBlocks = blocks.filter(block => block.type === type);
    if (usedBlocks.length > 0) {
        if (!confirm(`Ce type est utilisé par ${usedBlocks.length} bloc(s). Ces blocs seront également supprimés. Voulez-vous continuer ?`)) {
            return;
        }
        
        pushHistory();
        blocks = blocks.filter(block => block.type !== type);
        document.getElementById('btn-undo').disabled = false;
    }
    
    const container = document.getElementById('custom-types-container');
    const items = container.querySelectorAll('.custom-type-item');
    let itemToRemove = null;
    
    items.forEach(item => {
        const nameEl = item.querySelector('.custom-type-name');
        if (nameEl && nameEl.textContent === type) {
            itemToRemove = item;
        }
    });
    
    if (itemToRemove) {
        itemToRemove.style.opacity = '0';
        itemToRemove.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            customTypes = customTypes.filter(t => t !== type);
            blockTypes = blockTypes.filter(t => t !== type);
            
            renderCustomTypes();
            renderBlockTypeButtons();
            renderBlocks();
            updateBlockCount();
            
            saveData();
            
            showToast(`Type "${type}" et ses blocs associés supprimés`, 'success');
        }, 300);
    } else {
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
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce bloc ${block.type}${block.number} ?`)) {
        return;
    }
    
    pushHistory();
    blocks.splice(index, 1);
    
    const sameTypeBlocks = blocks.filter(b => b.type === block.type);
    sameTypeBlocks.forEach((b, i) => {
        b.number = i + 1;
    });
    
    renderBlocks();
    updateBlockCount();
    saveData();
    document.getElementById('btn-undo').disabled = false;
    showToast(`Bloc ${block.type}${block.number} supprimé`, 'success');
}

// Extract webtoon from URL
async function extractWebtoon() {
    let url = webtoonUrlInput.value.trim();
    if (!url) {
        showToast('Veuillez entrer une URL valide', 'error');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    if (url.startsWith('@http')) {
        url = url.substring(1);
    }
    
    webtoonUrlInput.value = url;
    
    await heavyOperation(async () => {
        try {
            btnExtractWebtoon.disabled = true;
            btnExtractFirecrawl.disabled = true;
            extractionStatus.textContent = 'Extraction en cours...';
            extractionStatus.className = 'status-message';
            extractionProgress.classList.add('active');
            extractionProgress.querySelector('.progress-bar').style.width = '10%';
            extractedImagesContainer.innerHTML = '';
            
            const response = await fetch('/api/extract-webtoon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            
            extractionProgress.querySelector('.progress-bar').style.width = '50%';
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'extraction');
            }
            
            const data = await response.json();
            
            extractionProgress.querySelector('.progress-bar').style.width = '80%';
            
            if (data.images && data.images.length > 0) {
                displayExtractedImages(data.images);
                extractionStatus.textContent = `${data.images.length} images extraites avec succès`;
                extractionStatus.className = 'status-message success';
                
                if (projectSidebar.getAttribute('data-visible') === 'false') {
                    projectSidebar.setAttribute('data-visible', 'true');
                }
            } else {
                extractionStatus.textContent = 'Aucune image trouvée';
                extractionStatus.className = 'status-message error';
            }
        } catch (error) {
            console.error('Extraction error:', error);
            extractionStatus.textContent = `Erreur: ${error.message}`;
            extractionStatus.className = 'status-message error';
        } finally {
            extractionProgress.querySelector('.progress-bar').style.width = '100%';
            setTimeout(() => {
                extractionProgress.classList.remove('active');
                extractionProgress.querySelector('.progress-bar').style.width = '0';
            }, 1000);
            
            btnExtractWebtoon.disabled = false;
            btnExtractFirecrawl.disabled = false;
        }
    });
}

// Extract webtoon using Firecrawl
async function extractFirecrawl() {
    let url = webtoonUrlInput.value.trim();
    if (!url) {
        showToast('Veuillez entrer une URL valide', 'error');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    if (url.startsWith('@http')) {
        url = url.substring(1);
    }
    
    webtoonUrlInput.value = url;
    
    await heavyOperation(async () => {
        try {
            showToast('Extraction Firecrawl démarrée...', 'info');
            btnExtractWebtoon.disabled = true;
            btnExtractFirecrawl.disabled = true;
            extractionStatus.textContent = 'Extraction Firecrawl en cours...';
            extractionStatus.className = 'status-message';
            extractionProgress.classList.add('active');
            extractionProgress.querySelector('.progress-bar').style.width = '10%';
            extractedImagesContainer.innerHTML = '';
        
            const response = await fetch('/api/extract-firecrawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url, 
                    api_key: firecrawlKey || undefined
                })
            });
            
            extractionProgress.querySelector('.progress-bar').style.width = '50%';
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'extraction avec Firecrawl');
            }
            
            const data = await response.json();
            
            extractionProgress.querySelector('.progress-bar').style.width = '80%';
            
            if (data.images && data.images.length > 0) {
                displayExtractedImages(data.images);
                extractionStatus.textContent = `${data.images.length} images extraites avec succès via Firecrawl`;
                extractionStatus.className = 'status-message success';
                
                if (projectSidebar.getAttribute('data-visible') === 'false') {
                    projectSidebar.setAttribute('data-visible', 'true');
                }
            } else {
                extractionStatus.textContent = 'Aucune image trouvée via Firecrawl';
                extractionStatus.className = 'status-message error';
            }
        } catch (error) {
            console.error('Firecrawl extraction error:', error);
            extractionStatus.textContent = `Erreur Firecrawl: ${error.message}`;
            extractionStatus.className = 'status-message error';
        } finally {
            extractionProgress.querySelector('.progress-bar').style.width = '100%';
            setTimeout(() => {
                extractionProgress.classList.remove('active');
                extractionProgress.querySelector('.progress-bar').style.width = '0';
            }, 1000);
            
            btnExtractWebtoon.disabled = false;
            btnExtractFirecrawl.disabled = false;
        }
    });
}

// Display extracted images
function displayExtractedImages(images) {
    if (!images || !Array.isArray(images) || images.length === 0) {
        console.error("displayExtractedImages: données d'images invalides ou vides", images);
        extractedImagesContainer.innerHTML = '<div class="error-message">Aucune image trouvée ou format invalide</div>';
        return;
    }
    
    console.log(`Affichage de ${images.length} images dans le conteneur`);
    extractedImagesContainer.innerHTML = '';
    
    window.extractedImages = images;
    
    const fragment = document.createDocumentFragment();
    
    images.forEach((image, index) => {
        try {
            const imageElement = extractedImageTemplate.content.cloneNode(true);
            const thumbnail = imageElement.querySelector('.thumbnail');
            
            thumbnail.onerror = function() {
                this.onerror = null;
                console.error(`Erreur de chargement de l'image ${index}:`, image.url);
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlIGludHJvdXZhYmxlPC90ZXh0Pjwvc3ZnPg==';
                this.alt = 'Image introuvable';
            };
            
            thumbnail.src = image.url;
            thumbnail.alt = image.filename || `Image ${index + 1}`;
        
            const viewBtn = imageElement.querySelector('.view-btn');
            viewBtn.innerHTML = '<i class="fas fa-eye"></i> Voir';
            viewBtn.addEventListener('click', () => {
                showExtractedImage(image, index);
            });
            
            const useBtn = imageElement.querySelector('.use-btn');
            if (useBtn) {
                useBtn.remove();
            }
        
            fragment.appendChild(imageElement);
        } catch (error) {
            console.error(`Erreur lors de l'ajout de l'image ${index}:`, error);
        }
    });
    
    extractedImagesContainer.appendChild(fragment);
    
    console.log(`${extractedImagesContainer.children.length} éléments d'images ajoutés au conteneur`);
}

// Show extracted image in viewer
function showExtractedImage(image, index) {
    openViewer();

    pdfContainer.innerHTML = '';
    
    const existingControls = imageContainer.querySelector('.image-nav-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    const existingArrows = document.querySelectorAll('.image-nav-arrow, .image-counter');
    existingArrows.forEach(arrow => arrow.remove());
    
    viewerFilename.textContent = image.filename;
    
    currentZoom = 1.0;
    
    const navControls = document.createElement('div');
    navControls.className = 'image-nav-controls';
    
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
    zoomInBtn.title = 'Zoom in';
    zoomInBtn.addEventListener('click', zoomIn);
    
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
    zoomOutBtn.title = 'Zoom out';
    zoomOutBtn.addEventListener('click', zoomOut);
    
    const fitWidthBtn = document.createElement('button');
    fitWidthBtn.innerHTML = '<i class="fas fa-arrows-alt-h"></i>';
    fitWidthBtn.title = 'Fit to width';
    fitWidthBtn.addEventListener('click', fitImageToWidth);
    
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    resetZoomBtn.title = 'Reset view';
    resetZoomBtn.addEventListener('click', resetImageZoom);
    
    const zoomLevel = document.createElement('span');
    zoomLevel.className = 'zoom-level';
    zoomLevel.textContent = '100%';
    
    const zoomHelp = document.createElement('span');
    zoomHelp.className = 'zoom-help';
    zoomHelp.innerHTML = '<i class="fas fa-info-circle"></i> Ctrl+Molette pour zoomer';
    
    navControls.appendChild(zoomInBtn);
    navControls.appendChild(zoomOutBtn);
    navControls.appendChild(fitWidthBtn);
    navControls.appendChild(resetZoomBtn);
    navControls.appendChild(zoomLevel);
    navControls.appendChild(zoomHelp);
    
    imageContainer.appendChild(navControls);
    
    imageContainer.style.display = 'flex';
    pdfContainer.style.display = 'none';
    
    imageViewer.src = image.url;
    imageViewer.style.display = 'block';
    imageViewer.style.transform = `scale(${currentZoom})`;
    
    console.log("Total images:", window.extractedImages?.length, "Current index:", index);
    
    if (window.extractedImages && window.extractedImages.length > 1) {
        btnPrevPage.disabled = index <= 0;
        btnNextPage.disabled = index >= window.extractedImages.length - 1;
        
        pageInfo.textContent = `${index + 1} / ${window.extractedImages.length}`;
        
        btnPrevPage.onclick = function() {
            if (index > 0) {
                showExtractedImage(window.extractedImages[index - 1], index - 1);
            }
        };
        
        btnNextPage.onclick = function() {
            if (index < window.extractedImages.length - 1) {
                showExtractedImage(window.extractedImages[index + 1], index + 1);
            }
        };
        
        const handleKeyNav = (e) => {
            if (e.key === 'ArrowLeft' && index > 0) {
                showExtractedImage(window.extractedImages[index - 1], index - 1);
            } else if (e.key === 'ArrowRight' && index < window.extractedImages.length - 1) {
                showExtractedImage(window.extractedImages[index + 1], index + 1);
            }
        };
        
        document.removeEventListener('keydown', window.currentKeyNavHandler);
        
        window.currentKeyNavHandler = handleKeyNav;
        document.addEventListener('keydown', window.currentKeyNavHandler);
    } else {
        btnPrevPage.disabled = true;
        btnNextPage.disabled = true;
        pageInfo.textContent = '';
    }
    
    imageViewer.onload = function() {
        const aspectRatio = this.naturalWidth / this.naturalHeight;
        
        if (aspectRatio < 0.5) {
            imageViewer.classList.add('webtoon-format');
            setTimeout(fitImageToWidth, 100);
        } else {
            imageViewer.classList.remove('webtoon-format');
            resetImageZoom();
        }
        
        updateZoomLevelDisplay();
        showToast('Utilisez Ctrl+Molette pour zoomer, ou les boutons de contrôle', 'info');
    };
    
    imageContainer.onwheel = handleImageWheel;
}

// Fit image to width
function fitImageToWidth() {
    const containerWidth = imageContainer.clientWidth;
    const imageWidth = imageViewer.naturalWidth;
    
    currentZoom = (containerWidth * 0.95) / imageWidth;
    
    applyImageZoom();
    imageContainer.scrollTop = 0;
}

// Reset image zoom
function resetImageZoom() {
    currentZoom = 1.0;
    applyImageZoom();
    imageContainer.scrollTop = 0;
}

// Apply image zoom
function applyImageZoom() {
    imageViewer.style.transform = `scale(${currentZoom})`;
    updateZoomLevelDisplay();
}

// Update zoom level display
function updateZoomLevelDisplay() {
    const zoomLevelEl = imageContainer.querySelector('.zoom-level');
    if (zoomLevelEl) {
        zoomLevelEl.textContent = `${Math.round(currentZoom * 100)}%`;
    }
}

// Handle mouse wheel on image
function handleImageWheel(e) {
    if (!e.ctrlKey) {
        return;
    }
    
    e.preventDefault();
    
    const rect = imageContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scrollXBefore = imageContainer.scrollLeft;
    const scrollYBefore = imageContainer.scrollTop;
    
    const imageX = scrollXBefore + mouseX;
    const imageY = scrollYBefore + mouseY;
    
    const delta = -e.deltaY;
    const zoomChange = delta > 0 ? 1.1 : 0.9;
    
    const oldZoom = currentZoom;
    currentZoom *= zoomChange;
    
    currentZoom = Math.max(0.1, Math.min(currentZoom, 5.0));
    
    applyImageZoom();
    
    const zoomRatio = currentZoom / oldZoom;
    const newScrollX = imageX * zoomRatio - mouseX;
    const newScrollY = imageY * zoomRatio - mouseY;
    
    imageContainer.scrollLeft = newScrollX;
    imageContainer.scrollTop = newScrollY;
}

// Use extracted image (add a block with reference)
function useExtractedImage(image) {
    showExtractedImage(image);
    showToast('Image ouverte dans la fenêtre d\'affichage');
}

// Load API keys from server
async function loadApiKeys() {
    try {
        const response = await fetch('/api/get-keys');
        const keys = await response.json();
        
        geminiKey = keys.gemini || '';
        firecrawlKey = keys.firecrawl || '';
        
        geminiKeyInput.value = geminiKey;
        firecrawlKeyInput.value = firecrawlKey;
    } catch (error) {
        console.error('Error loading API keys:', error);
    }
}

// Save API keys to server
async function saveApiKeys(gemini, firecrawl) {
    try {
        await fetch('/api/set-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                gemini: gemini,
                firecrawl: firecrawl
            })
        });
    } catch (error) {
        console.error('Error saving API keys:', error);
    }
}

// Cleanup uploads
async function cleanupUploads() {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer le dossier uploads ?\n\nCela supprimera tous les dossiers de webtoons sauf le plus récent.\nLes images utilisées dans votre projet sont sauvegardées lors de l\'exportation.')) {
        return;
    }
    
    await heavyOperation(async () => {
        try {
            extractionStatus.textContent = 'Nettoyage en cours...';
            extractionStatus.className = 'status-message';
            extractionProgress.classList.add('active');
            extractionProgress.querySelector('.progress-bar').style.width = '50%';
        
            const response = await fetch('/api/cleanup', {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors du nettoyage');
            }
            
            const data = await response.json();
            
            extractionProgress.querySelector('.progress-bar').style.width = '100%';
            extractionStatus.textContent = data.message;
            extractionStatus.className = 'status-message success';
            
            const stats = data.stats;
            const detailedMessage = `
                Avant: ${stats.before.directories} dossiers, ${stats.before.files} fichiers
                Après: ${stats.after.directories} dossiers, ${stats.after.files} fichiers
                Espace libéré: ${stats.deleted.directories} dossiers, ${stats.deleted.files} fichiers
            `;
            
            showToast(detailedMessage, 'success');
        } catch (error) {
            console.error('Cleanup error:', error);
            extractionStatus.textContent = `Erreur: ${error.message}`;
            extractionStatus.className = 'status-message error';
            showToast('Erreur lors du nettoyage des uploads', 'error');
        } finally {
            setTimeout(() => {
                extractionProgress.classList.remove('active');
                extractionProgress.querySelector('.progress-bar').style.width = '0';
            }, 1000);
        }
    });
}

// Télécharger un exemple de JSON valide
async function downloadExampleJson() {
    try {
        showToast('Téléchargement de l\'exemple JSON...', 'info');
        
        const response = await fetch('/api/example-json');
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de l\'exemple');
        }
        
        const blob = await response.blob();
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'example_project_data.json';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('Exemple JSON téléchargé avec succès', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors du téléchargement de l\'exemple', 'error');
    }
}

// Télécharger un exemple de ZIP valide
async function downloadExampleZip() {
    try {
        showToast('Téléchargement de l\'exemple ZIP...', 'info');
        
        const response = await fetch('/api/example-zip');
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de l\'exemple');
        }
        
        const blob = await response.blob();
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exemple_webtoon.zip';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('Exemple ZIP téléchargé avec succès', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors du téléchargement de l\'exemple', 'error');
    }
}

// Capture d'écran et traduction IA
async function captureAndTranslate() {
    try {
        if (viewerPanel.classList.contains('hidden')) {
            showToast('Ouvrez d\'abord un fichier dans le lecteur', 'warning');
            return;
        }
        
        if (!geminiKey) {
            showToast('Configurez d\'abord votre clé Gemini dans les outils', 'warning');
            return;
        }
        
        let targetElement;
        if (currentPDFDoc) {
            targetElement = pdfContainer;
        } else if (imageViewer.style.display !== 'none') {
            targetElement = imageContainer;
        } else {
            showToast('Aucun contenu à capturer', 'warning');
            return;
        }
        
        showToast('Sélectionnez la zone à traduire en cliquant et glissant', 'info');
        await enableZoneSelection(targetElement);
        
    } catch (error) {
        console.error('Capture error:', error);
        showToast('Erreur lors de la capture d\'écran', 'error');
    }
}

// Activer la sélection de zone
async function enableZoneSelection(targetElement) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'zone-selection-overlay';
        
        const selectionBox = document.createElement('div');
        selectionBox.id = 'zone-selection-box';
        
        overlay.appendChild(selectionBox);
        document.body.appendChild(overlay);
        
        let isSelecting = false;
        let startX, startY, endX, endY;
        
        function updateSelectionBox() {
            const left = Math.min(startX, endX);
            const top = Math.min(startY, endY);
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            
            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
        }
        
        function startSelection(e) {
            isSelecting = true;
            startX = e.clientX || e.touches[0].clientX;
            startY = e.clientY || e.touches[0].clientY;
            
            selectionBox.style.display = 'block';
            selectionBox.style.left = startX + 'px';
            selectionBox.style.top = startY + 'px';
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
        }
        
        function updateSelection(e) {
            if (!isSelecting) return;
            
            e.preventDefault();
            endX = e.clientX || e.touches[0].clientX;
            endY = e.clientY || e.touches[0].clientY;
            
            updateSelectionBox();
        }
        
        async function endSelection(e) {
            if (!isSelecting) return;
            
            isSelecting = false;
            
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            
            if (width < 50 || height < 50) {
                showToast('Sélection trop petite, essayez de sélectionner une zone plus grande', 'warning');
                return;
            }
            
            document.body.removeChild(overlay);
            
            await captureSelectedZone(targetElement, startX, startY, endX, endY);
            resolve();
        }
        
        overlay.addEventListener('mousedown', startSelection);
        overlay.addEventListener('mousemove', updateSelection);
        overlay.addEventListener('mouseup', endSelection);
        
        overlay.addEventListener('touchstart', startSelection, { passive: false });
        overlay.addEventListener('touchmove', updateSelection, { passive: false });
        overlay.addEventListener('touchend', endSelection, { passive: false });
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
                showToast('Sélection annulée', 'info');
                resolve();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        const instructions = document.createElement('div');
        instructions.className = 'zone-selection-instructions';
        instructions.innerHTML = `
            <i class="fas fa-mouse-pointer"></i> Cliquez et glissez pour sélectionner la zone à traduire<br>
            <i class="fas fa-keyboard"></i> Appuyez sur Échap pour annuler
        `;
        overlay.appendChild(instructions);
    });
}

// Capturer la zone sélectionnée
async function captureSelectedZone(targetElement, startX, startY, endX, endY) {
    try {
        showToast('Capture de la zone sélectionnée...', 'info');
        
        const canvas = await html2canvas(targetElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false
        });
        
        const targetRect = targetElement.getBoundingClientRect();
        const relativeStartX = (startX - targetRect.left) * 2;
        const relativeStartY = (startY - targetRect.top) * 2;
        const relativeEndX = (endX - targetRect.left) * 2;
        const relativeEndY = (endY - targetRect.top) * 2;
        
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        
        const cropWidth = Math.abs(relativeEndX - relativeStartX);
        const cropHeight = Math.abs(relativeEndY - relativeStartY);
        
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        
        croppedCtx.drawImage(
            canvas,
            Math.min(relativeStartX, relativeEndX),
            Math.min(relativeStartY, relativeEndY),
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
        );
        
        showToast('Analyse du texte en cours...', 'info');
        
        croppedCanvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('Erreur lors de la capture de la zone', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('image', blob, 'capture.png');
            
            try {
                const response = await fetch('/api/ocr-translate', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erreur lors de la traduction');
                }
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    displayTranslationSuggestionsInBlock(data);
                    showToast('Traduction terminée !', 'success');
                } else {
                    throw new Error(data.error || 'Erreur inconnue');
                }
            } catch (error) {
                console.error('Translation error:', error);
                showToast(`Erreur: ${error.message}`, 'error');
            }
        }, 'image/png');
        
    } catch (error) {
        console.error('Zone capture error:', error);
        showToast('Erreur lors de la capture de la zone', 'error');
    }
}

// Afficher les suggestions de traduction dans le dernier bloc
function displayTranslationSuggestionsInBlock(data) {
    let lastBlockIndex = -1;
    for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type !== 'C' && blocks[i].type !== 'HC') {
            lastBlockIndex = i;
            break;
        }
    }
    
    if (lastBlockIndex === -1) {
        addBlock('B');
        lastBlockIndex = blocks.length - 1;
    }
    
    if (!aiMap[lastBlockIndex]) {
        aiMap[lastBlockIndex] = {};
    }
    
    let suggestions = [];
    
    if (data.ocr && data.ocr.trim()) {
        suggestions.push(`[OCR: ${data.ocr}]`);
    }
    
    if (data.suggestions && data.suggestions.length > 0) {
        suggestions = suggestions.concat(data.suggestions);
    }
    
    if (suggestions.length === 0) {
        suggestions.push('Aucune suggestion disponible');
    }
    
    aiMap[lastBlockIndex].suggestions = suggestions;
    aiMap[lastBlockIndex].sourceLang = data.sourceLang || 'unknown';
    aiMap[lastBlockIndex].ocrText = data.ocr || '';
    
    renderBlocks();
    
    const blockElements = document.querySelectorAll('.block');
    if (lastBlockIndex < blockElements.length) {
        blockElements[lastBlockIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    showToast(`Suggestions ajoutées au bloc ${blocks[lastBlockIndex].type}${blocks[lastBlockIndex].number}`, 'success');
}


// =================================================================
// NOUVELLES FONCTIONS POUR LE GLOSSAIRE
// =================================================================

/**
 * Affiche le glossaire éditable dans le tableau HTML.
 */
function renderGlossary() {
    if (!editableGlossaryTableBody) return;

    editableGlossaryTableBody.innerHTML = '';

    if (glossary.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="info-text">Aucun terme. Cliquez sur "Ajouter".</td>`;
        editableGlossaryTableBody.appendChild(tr);
        return;
    }

    glossary.forEach((term, index) => {
        const tr = document.createElement('tr');

        // Crée une cellule éditable
        const createCell = (content, key) => {
            const td = document.createElement('td');
            td.textContent = content;
            td.contentEditable = "true";
            td.addEventListener('blur', () => {
                // Mettre à jour l'objet glossary lorsque l'utilisateur a fini d'éditer
                glossary[index][key] = td.textContent.trim();
                scheduleAutoSave();
            });
            return td;
        };
        
        tr.appendChild(createCell(term.vo, 'vo'));
        tr.appendChild(createCell(term.vf, 'vf'));
        tr.appendChild(createCell(term.note, 'note'));

        // Bouton de suppression
        const actionTd = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'glossary-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Supprimer ce terme';
        deleteBtn.addEventListener('click', () => deleteGlossaryTerm(index));
        actionTd.appendChild(deleteBtn);
        tr.appendChild(actionTd);

        editableGlossaryTableBody.appendChild(tr);
    });
}

/**
 * Ajoute un nouveau terme vide au glossaire.
 */
function addGlossaryTerm() {
    glossary.unshift({ vo: 'Nouveau terme', vf: '', note: '' }); // Ajoute au début pour une meilleure visibilité
    renderGlossary();
    scheduleAutoSave();

    // Focus sur la première cellule du nouveau terme
    const firstRow = editableGlossaryTableBody.querySelector('tr:first-child');
    if (firstRow) {
        const firstCell = firstRow.querySelector('td');
        if (firstCell) {
            firstCell.focus();
            // Sélectionne le texte pour le remplacer facilement
            document.execCommand('selectAll', false, null); 
        }
    }
}

/**
 * Supprime un terme du glossaire à un index donné.
 * @param {number} index - L'index du terme à supprimer.
 */
function deleteGlossaryTerm(index) {
    if (confirm(`Supprimer le terme "${glossary[index].vo || 'vide'}" ?`)) {
        glossary.splice(index, 1);
        renderGlossary();
        scheduleAutoSave();
        showToast('Terme supprimé', 'success');
    }
}


// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);