// State management
let blocks = [];
let blockTypes = ['HB', 'B', 'DB', 'C', 'HC'];
let customTypes = [];
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

// Initialize app
function init() {
    setTheme(theme);
    
    // Ensure project sidebar is hidden by default
    projectSidebar.setAttribute('data-visible', 'false');
    
    // Ensure tools sidebar is hidden by default
    toolsSidebar.setAttribute('data-visible', 'false');
    
    // Initialize viewer panel
    initializeViewerPanel();
    
    // Hide viewer panel by default
    viewerPanel.classList.add('hidden');
    mainContent.classList.add('full-width');
    
    // Render block type buttons immediately with default types
    renderBlockTypeButtons();
    renderCustomTypes(); // Initialiser la liste des types personnalisés
    
    setupEventListeners();
    
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
}

// Configurer les gestionnaires pour les modals de reformulation
function setupReformulationModalHandlers() {
    // Fermer les modals avec Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const reformulationModal = document.getElementById('reformulation-modal');
            const resultsModal = document.getElementById('reformulation-results-modal');
            
            if (reformulationModal && !reformulationModal.classList.contains('hidden')) {
                closeReformulationModal();
            } else if (resultsModal && !resultsModal.classList.contains('hidden')) {
                closeReformulationResultsModal();
            }
        }
    });
    
    // Fermer les modals en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
        const reformulationModal = document.getElementById('reformulation-modal');
        const resultsModal = document.getElementById('reformulation-results-modal');
        
        if (reformulationModal && !reformulationModal.classList.contains('hidden')) {
            if (e.target === reformulationModal) {
                closeReformulationModal();
            }
        } else if (resultsModal && !resultsModal.classList.contains('hidden')) {
            if (e.target === resultsModal) {
                closeReformulationResultsModal();
            }
        }
    });
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

// Handle PDF upload
function handlePDFUpload(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;
    
    // Show loading indicator
    showLoading(true);
    
    // Upload file to server
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/api/upload-reader', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
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
        return fetch(data.url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                loadPdfFromData(new Uint8Array(arrayBuffer));
            });
    })
    .catch(error => {
        console.error('Upload error:', error);
        showToast('Erreur lors du téléchargement du fichier', 'error');
    })
    .finally(() => {
        showLoading(false);
        // Reset file input
        e.target.value = null;
    });
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    // Show loading indicator
    showLoading(true);
    
    // Upload file to server
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/api/upload-reader', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
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
    })
    .catch(error => {
        console.error('Upload error:', error);
        showToast('Erreur lors du téléchargement de l\'image', 'error');
    })
    .finally(() => {
        showLoading(false);
        // Reset file input
        e.target.value = null;
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
    
    try {
        // Show loading indicator
        showLoading(true);
        
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
        
        // Hide loading indicator
        showLoading(false);
    } catch (error) {
        console.error('Error rendering PDF pages:', error);
        showToast('Erreur lors du rendu des pages PDF', 'error');
        showLoading(false);
    }
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
    
    try {
        // Show loading while rezoom
        showLoading(true);
        
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
        
        showLoading(false);
    } catch (error) {
        console.error('Error applying zoom:', error);
        showLoading(false);
    }
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
    showLoading(true);
    try {
        const response = await fetch('/api/load');
        const data = await response.json();
        blocks = data.blocks || [];
        blockTypes = data.blockTypes || ['HB', 'B', 'DB', 'C', 'HC'];
        
        // Séparer les types par défaut des types personnalisés
        const defaultTypes = ['HB', 'B', 'DB', 'C', 'HC'];
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

// Export project to ZIP format (uses new backend endpoint)
async function exportZip() {
    try {
        showLoading(true);
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
    } finally {
        showLoading(false);
    }
}

// Import project
async function importProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading(true);
    
    try {
        console.log(`Fichier à importer: ${file.name}, type: ${file.type}, taille: ${file.size} octets`);
        
        // Check if it's a ZIP file (new format) or JSON file (old format)
        const isZip = file.type === 'application/zip' || 
                     file.type === 'application/x-zip-compressed' || 
                     file.name.toLowerCase().endsWith('.zip') ||
                     file.name.toLowerCase().endsWith('.wtoon');
        
        console.log(`Format détecté: ${isZip ? 'ZIP/WTOON' : 'JSON'}`);
        
        if (isZip) {
            // Handle ZIP format (new format)
            await importZipProject(file);
            showToast('Projet importé avec succès (format ZIP)', 'success');
        } else {
            // Handle JSON format (old format)
            await importJsonProject(file);
            showToast('Projet importé avec succès (format JSON)', 'success');
        }
    } catch (error) {
        console.error('Import error:', error);
        showToast(`Erreur d'importation: ${error.message || 'Fichier invalide'}`, 'error');
    } finally {
        showLoading(false);
        fileImport.value = null; // Reset file input
    }
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
    
    // Vérifier le format attendu pour chaque image
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
    
    // Vérifier les URLs des images
    const firstImg = imagesArray[0];
    console.log("URL première image:", firstImg.url);
    console.log("Vérification de l'accès à l'image:", firstImg.url);
    
    // Tenter de charger la première image pour vérification
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

        // Vérifier la taille du fichier
        const fileSizeMB = file.size / (1024 * 1024); // Taille en MB
        if (fileSizeMB > 90) {
            throw new Error(`Fichier trop volumineux (${fileSizeMB.toFixed(1)} MB). La limite est de 90 MB.`);
        }
        
        // Vérifier le type de fichier
        if (!file.name.toLowerCase().endsWith('.zip') && !file.name.toLowerCase().endsWith('.wtoon')) {
            throw new Error('Le fichier doit avoir une extension .zip ou .wtoon');
        }
        
        // Create form data with the ZIP file
                const formData = new FormData();
        formData.append('file', file);
                
        // Send the ZIP file to the new backend endpoint
        const response = await fetch('/api/import-zip', {
                    method: 'POST',
                    body: formData
                });
                
        // Vérifier d'abord si c'est une erreur 413 (entité trop grande)
        if (response.status === 413) {
            throw new Error(`Le fichier est trop volumineux pour le serveur. La limite est de 90 MB. 
Vous pouvez essayer de diviser votre projet en plusieurs fichiers plus petits.`);
        }
        
        // Récupérer le contenu de la réponse pour analyse
        const rawResponse = await response.text();
        console.log('Réponse brute (début):', rawResponse.substring(0, 200) + '...'); 
        
        // Parse JSON response
        let data;
        try {
            data = JSON.parse(rawResponse);
        } catch (parseError) {
            console.error('Erreur de parsing JSON:', parseError);
            console.error('Réponse non JSON (début):', rawResponse.substring(0, 200));
            
            // Afficher un message d'erreur plus détaillé
            let detailedError = 'La réponse du serveur n\'est pas au format JSON valide.';
            
            // Détecter si c'est du HTML (erreur 500 interne, etc.)
            if (rawResponse.trim().startsWith('<!DOCTYPE') || rawResponse.trim().startsWith('<html')) {
                detailedError = 'Le serveur a renvoyé une page HTML au lieu de JSON. Cela peut indiquer une erreur interne du serveur.';
            }
            
            throw new Error(`Erreur d'importation: ${detailedError}`);
        }
        
        // Vérifier si la réponse contient une erreur
        if (data.error) {
            const errorDetails = data.details ? `\nDétails: ${data.details}` : '';
            throw new Error(`${data.error}${errorDetails}`);
        }
        
        if (data.status !== 'success') {
            throw new Error(data.error || 'Import failed');
        }
        
        console.log('Import success:', data);
        
        // Update blocks and blockTypes from the returned project data
        blocks = data.project.blocks || [];
        blockTypes = data.project.blockTypes || ['HB', 'B', 'DB', 'C', 'HC'];
        
                    // If API returned image folder info, update UI to show it
            if (data.imagesFolder) {
                try {
                    console.log('Images folder:', data.imagesFolder);
                    
                    // Récupérer les images du dossier pour les afficher
                    // Construire des objets images à partir des informations du dossier
                    const folderName = data.imagesFolder;
                    const folderPath = `/static/uploads/${folderName}`;
                    
                    // Vérifier s'il y a des métadonnées d'images
                    const images = [];
                    
                    // Si le serveur a renvoyé une liste d'images (nouvelle version)
                    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                        console.log(`Affichage de ${data.images.length} images fournies par le serveur`);
                        
                        // Vérifier et diagnostiquer les problèmes d'images
                        logImageInfo(data.images);
                        
                        // Afficher les images dans l'interface
                        displayExtractedImages(data.images);
                        
                        // Nettoyer le container si les images ne sont pas visibles
                        setTimeout(() => {
                            if (extractedImagesContainer.children.length === 0) {
                                console.error("Les images n'ont pas été affichées correctement. Tentative de récupération...");
                                // Nouvelle tentative d'affichage
                                extractedImagesContainer.innerHTML = '';
                                displayExtractedImages(data.images);
                            }
                        }, 500);
                        
                    } else {
                        // Version de secours: nous devons créer les objets images par simulation
                        console.warn("Pas d'informations détaillées sur les images. Utilisation de la méthode alternative.");
                        
                        // Informer l'utilisateur que les images ont été importées mais sans détails
                        showToast(`Images importées dans le dossier ${folderName}. Utilisez le panneau Projet pour les voir.`, 'info', 7000);
                    }
                    
                    // Mettre à jour les informations sur le statut de l'extraction
                    const nombreImages = data.images ? data.images.length : 0;
                    extractionStatus.textContent = `${nombreImages} images importées avec succès`;
        extractionStatus.className = 'status-message success';
        
                    // Ouvrir le panel du projet et afficher la section extraction
        projectSidebar.setAttribute('data-visible', 'true');
        
                    // Afficher une notification
                    showToast(`Import réussi : ${blocks.length} blocs et ${nombreImages} images.`, 'success');
                } catch (error) {
                    console.error('Error handling images info:', error);
                    // Continue with import even if displaying images fails
                }
            }
        
        // Reset history and update UI
    history = [];
    aiMap = {};
        
        // Don't call loadData() as we already have the project data from the response
        saveData(); // Save the new data to server
    renderBlocks();
    renderBlockTypeButtons();
    updateBlockCount();
    document.getElementById('btn-undo').disabled = true;
        
    } catch (error) {
        console.error('Error importing ZIP:', error);
        
        // Afficher un message d'erreur amélioré
        const errorMessage = error.message || 'Erreur inconnue';
        
        // Proposer des solutions en fonction du message d'erreur
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
        
        showToast('Erreur d\'importation: ' + errorMessage + suggestions, 'error', 10000); // Afficher plus longtemps
        throw error; // Re-throw for the parent import function to handle
    }
}

// Import project from JSON format (legacy)
async function importJsonProject(file) {
    return new Promise((resolve, reject) => {
        // Vérifier la taille du fichier
        const fileSizeMB = file.size / (1024 * 1024); // Taille en MB
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
                
                // Process embedded images if they exist
                if (data.embeddedImages && Object.keys(data.embeddedImages).length > 0) {
                    // Create a unique folder for this import
                    const importId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
                    const importFolder = `webtoon_${importId}`;
                    
                    // Create the folder on the server
                    await fetch('/api/create-folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folderName: importFolder })
                    });
                    
                    // Prepare array to collect imported images for display
                    const importedImages = [];
                    
                    // Upload each embedded image
                    for (const [path, base64] of Object.entries(data.embeddedImages)) {
                        try {
                            // Extract filename from path
                            const filename = path.split('/').pop();
                            
                            // Convert base64 to blob
                            const fetchResponse = await fetch(base64);
                            const blob = await fetchResponse.blob();
                            
                            // Create form data
                            const formData = new FormData();
                            formData.append('file', blob, filename);
                            formData.append('targetFolder', importFolder);
                            
                            // Upload to server
                            const uploadResponse = await fetch('/api/upload-to-folder', {
                                method: 'POST',
                                body: formData
                            });
                            
                            const uploadData = await uploadResponse.json();
                            
                            // Add to imported images array
                            importedImages.push({
                                filename: filename,
                                url: uploadData.url,
                                path: uploadData.path
                            });
                            
                            // Update references in blocks
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
                    
                    // Display imported images in the extracted images container
                    if (importedImages.length > 0) {
                        // Update extraction status
                        extractionStatus.textContent = `${importedImages.length} images importées avec succès`;
                        extractionStatus.className = 'status-message success';
                        
                        // Display the images
                        displayExtractedImages(importedImages);
                        
                        // Open project sidebar to show the images
                        projectSidebar.setAttribute('data-visible', 'true');
                        
                        // Show toast
                        showToast(`${importedImages.length} images restaurées depuis le fichier importé`, 'success');
                    }
                }
                
                history = [];
                aiMap = {};
                saveData();
                renderBlocks();
                renderBlockTypeButtons();
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
    if (!block || !block.content.trim()) {
        showToast('Le bloc doit contenir du texte pour être reformulé', 'warning');
        return;
    }
    
    if (!geminiKey) {
        showToast('Configurez d\'abord votre clé Gemini dans les outils', 'warning');
        return;
    }
    
    // Stocker les informations pour la reformulation
    currentReformulationBlockIndex = blockIndex;
    currentReformulationContent = block.content;
    currentReformulationIntention = '';
    currentReformulationCustom = '';
    
    // Ouvrir le modal de sélection d'intention
    openReformulationModal();
}

// Ouvrir le modal de sélection d'intention
function openReformulationModal() {
    const modal = document.getElementById('reformulation-modal');
    const generateBtn = document.getElementById('generate-reformulation');
    const customTextarea = document.getElementById('custom-intention');
    
    // Réinitialiser l'interface
    document.querySelectorAll('.intention-option').forEach(option => {
        option.classList.remove('selected');
    });
    customTextarea.value = '';
    generateBtn.disabled = true;
    
    // Afficher le modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Supprimer les anciens gestionnaires d'événements
    document.querySelectorAll('.intention-option').forEach(option => {
        option.removeEventListener('click', handleIntentionClick);
    });
    
    // Ajouter les nouveaux gestionnaires d'événements pour les options
    document.querySelectorAll('.intention-option').forEach(option => {
        option.addEventListener('click', handleIntentionClick);
    });
    
    // Gestionnaire pour le textarea personnalisé
    customTextarea.removeEventListener('input', handleCustomIntention);
    customTextarea.addEventListener('input', handleCustomIntention);
    
    // Gestionnaire pour le bouton générer
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
        // Désélectionner toutes les autres options
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
    // Désélectionner toutes les options
    document.querySelectorAll('.intention-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Sélectionner l'option cliquée
    optionElement.classList.add('selected');
    
    // Mettre à jour les variables
    currentReformulationIntention = optionElement.dataset.intention;
    currentReformulationCustom = '';
    
    // Vider le textarea personnalisé si on sélectionne une autre option
    if (currentReformulationIntention !== 'custom') {
        const customTextarea = document.getElementById('custom-intention');
        customTextarea.value = '';
    }
    
    // Activer le bouton générer
    const generateBtn = document.getElementById('generate-reformulation');
    generateBtn.disabled = false;
    
    // Focus sur le textarea si c'est l'option personnalisée
    if (currentReformulationIntention === 'custom') {
        const customTextarea = document.getElementById('custom-intention');
        customTextarea.focus();
    }
    
    // Feedback visuel
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
        // Afficher le spinner
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
        generateBtn.disabled = true;
        
        // Appeler l'API de reformulation
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
            // Fermer le modal de sélection
            closeReformulationModal();
            
            // Afficher les résultats
            displayReformulationResults(data.suggestions);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
        
    } catch (error) {
        console.error('Reformulation error:', error);
        showToast(`Erreur: ${error.message}`, 'error');
    } finally {
        // Restaurer le bouton
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

// Afficher les résultats de reformulation
function displayReformulationResults(suggestions) {
    const modal = document.getElementById('reformulation-results-modal');
    const resultsContainer = document.getElementById('reformulation-results');
    const template = document.getElementById('reformulation-suggestion-template');
    
    // Vider le conteneur
    resultsContainer.innerHTML = '';
    
    // Ajouter chaque suggestion
    suggestions.forEach((suggestion, index) => {
        const suggestionElement = document.importNode(template.content, true).firstElementChild;
        const contentDiv = suggestionElement.querySelector('.suggestion-content');
        const applyBtn = suggestionElement.querySelector('.suggestion-apply');
        
        contentDiv.textContent = suggestion;
        
        // Gestionnaire pour appliquer la suggestion
        applyBtn.addEventListener('click', () => {
            applyReformulationSuggestion(suggestion);
        });
        
        resultsContainer.appendChild(suggestionElement);
    });
    
    // Gestionnaire pour régénérer
    document.getElementById('regenerate-reformulation').addEventListener('click', () => {
        closeReformulationResultsModal();
        openReformulationModal();
    });
    
    // Afficher le modal
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
        
        // Fermer le modal des résultats
        closeReformulationResultsModal();
        
        // Faire défiler vers le bloc modifié
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
    
    // Si c'est une suggestion OCR, extraire le texte sans le préfixe [OCR: ]
    if (suggestion.startsWith('[OCR: ')) {
        suggestion = suggestion.replace('[OCR: ', '').replace(']', '');
    }
    
    block.content = suggestion;
    saveData();
    
    // Supprimer les suggestions de ce bloc
    if (aiMap[blockIndex]) {
        delete aiMap[blockIndex];
    }
    
    renderBlocks();
    
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

// Extract webtoon from URL
async function extractWebtoon() {
    let url = webtoonUrlInput.value.trim();
    if (!url) {
        showToast('Veuillez entrer une URL valide', 'error');
        return;
    }
    
    // Check if URL is valid
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Remove @ symbol if present (common when copying URLs)
    if (url.startsWith('@http')) {
        url = url.substring(1);
    }
    
    // Update the input field with the cleaned URL
    webtoonUrlInput.value = url;
    
    // Show loading state
    btnExtractWebtoon.disabled = true;
    btnExtractFirecrawl.disabled = true;
    extractionStatus.textContent = 'Extraction en cours...';
    extractionStatus.className = 'status-message';
    extractionProgress.classList.add('active');
    extractionProgress.querySelector('.progress-bar').style.width = '10%';
    extractedImagesContainer.innerHTML = '';
    
    try {
        // Call the API to extract images
        const response = await fetch('/api/extract-webtoon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        // Update progress
        extractionProgress.querySelector('.progress-bar').style.width = '50%';
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de l\'extraction');
        }
        
        const data = await response.json();
        
        // Update progress
        extractionProgress.querySelector('.progress-bar').style.width = '80%';
        
        if (data.images && data.images.length > 0) {
            // Display extracted images
            displayExtractedImages(data.images);
            
            extractionStatus.textContent = `${data.images.length} images extraites avec succès`;
            extractionStatus.className = 'status-message success';
            
            // Open project sidebar if it's not already open
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
        // Complete progress bar
        extractionProgress.querySelector('.progress-bar').style.width = '100%';
        setTimeout(() => {
            extractionProgress.classList.remove('active');
            extractionProgress.querySelector('.progress-bar').style.width = '0';
        }, 1000);
        
        btnExtractWebtoon.disabled = false;
        btnExtractFirecrawl.disabled = false;
        showLoading(false);
    }
}

// Extract webtoon using Firecrawl
async function extractFirecrawl() {
    let url = webtoonUrlInput.value.trim();
    if (!url) {
        showToast('Veuillez entrer une URL valide', 'error');
        return;
    }
    
    // Check if URL is valid
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Remove @ symbol if present (common when copying URLs)
    if (url.startsWith('@http')) {
        url = url.substring(1);
    }
    
    // Update the input field with the cleaned URL
    webtoonUrlInput.value = url;
    
    // Show loading state
    showToast('Extraction Firecrawl démarrée...', 'info');
    showLoading(true);
    btnExtractWebtoon.disabled = true;
    btnExtractFirecrawl.disabled = true;
    extractionStatus.textContent = 'Extraction Firecrawl en cours...';
    extractionStatus.className = 'status-message';
    extractionProgress.classList.add('active');
    extractionProgress.querySelector('.progress-bar').style.width = '10%';
    extractedImagesContainer.innerHTML = '';
    
    try {
        // Call the API to extract images using Firecrawl
        const response = await fetch('/api/extract-firecrawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url, 
                api_key: firecrawlKey || undefined  // Only send if provided
            })
        });
        
        // Update progress
        extractionProgress.querySelector('.progress-bar').style.width = '50%';
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de l\'extraction avec Firecrawl');
        }
        
        const data = await response.json();
        
        // Update progress
        extractionProgress.querySelector('.progress-bar').style.width = '80%';
        
        if (data.images && data.images.length > 0) {
            // Display extracted images
            displayExtractedImages(data.images);
            
            extractionStatus.textContent = `${data.images.length} images extraites avec succès via Firecrawl`;
            extractionStatus.className = 'status-message success';
            
            // Open project sidebar if it's not already open
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
        // Complete progress bar
        extractionProgress.querySelector('.progress-bar').style.width = '100%';
        setTimeout(() => {
            extractionProgress.classList.remove('active');
            extractionProgress.querySelector('.progress-bar').style.width = '0';
        }, 1000);
        
        btnExtractWebtoon.disabled = false;
        btnExtractFirecrawl.disabled = false;
        showLoading(false);
    }
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
    
    // Store images in a global variable for navigation
    window.extractedImages = images;
    
    // Créer tous les éléments d'images
    const fragment = document.createDocumentFragment();
    
    images.forEach((image, index) => {
        try {
        // Clone the template
        const imageElement = extractedImageTemplate.content.cloneNode(true);
        
            // Set image source with error handling
        const thumbnail = imageElement.querySelector('.thumbnail');
            
            // Définir un gestionnaire d'erreur avant de définir la source
            thumbnail.onerror = function() {
                this.onerror = null; // Éviter les boucles infinies
                console.error(`Erreur de chargement de l'image ${index}:`, image.url);
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlIGludHJvdXZhYmxlPC90ZXh0Pjwvc3ZnPg=='; // Image d'erreur
                this.alt = 'Image introuvable';
            };
            
        thumbnail.src = image.url;
            thumbnail.alt = image.filename || `Image ${index + 1}`;
        
        // Add event listener to the view button
        const viewBtn = imageElement.querySelector('.view-btn');
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> Voir';
        viewBtn.addEventListener('click', () => {
            showExtractedImage(image, index);
        });
        
        // Remove the use button as it's redundant
        const useBtn = imageElement.querySelector('.use-btn');
        if (useBtn) {
            useBtn.remove();
        }
        
            // Add to fragment (plus efficace pour de nombreux éléments)
            fragment.appendChild(imageElement);
        } catch (error) {
            console.error(`Erreur lors de l'ajout de l'image ${index}:`, error);
        }
    });
    
    // Add all images to container in one operation
    extractedImagesContainer.appendChild(fragment);
    
    // Log le résultat
    console.log(`${extractedImagesContainer.children.length} éléments d'images ajoutés au conteneur`);
}

// Show extracted image in viewer
function showExtractedImage(image, index) {
    // Show the viewer
    openViewer();

    // Clear any previous content
    pdfContainer.innerHTML = '';
    
    // Remove any existing navigation controls
    const existingControls = imageContainer.querySelector('.image-nav-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    // Remove existing navigation arrows if any
    const existingArrows = document.querySelectorAll('.image-nav-arrow, .image-counter');
    existingArrows.forEach(arrow => arrow.remove());
    
    // Set file name in the viewer
    viewerFilename.textContent = image.filename;
    
    // Reset zoom before loading new image
    currentZoom = 1.0;
    
    // Create and add image navigation controls
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
    
    // Add help text for Ctrl+wheel zoom
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
    
    // Make sure image container is visible and PDF container is hidden
    imageContainer.style.display = 'flex';
    pdfContainer.style.display = 'none';
    
    // Display the image
    console.log("Setting image source to:", image.url);
    imageViewer.src = image.url;
    imageViewer.style.display = 'block';
    imageViewer.style.transform = `scale(${currentZoom})`;
    
    console.log("Total images:", window.extractedImages?.length, "Current index:", index);
    
    // Configure navigation buttons if we have multiple images
    if (window.extractedImages && window.extractedImages.length > 1) {
        // Enable/disable navigation buttons based on position
        btnPrevPage.disabled = index <= 0;
        btnNextPage.disabled = index >= window.extractedImages.length - 1;
        
        // Update page info to show image position
        pageInfo.textContent = `${index + 1} / ${window.extractedImages.length}`;
        
        // Set up navigation button click handlers
        btnPrevPage.onclick = function() {
            if (index > 0) {
                console.log("Previous button clicked");
                showExtractedImage(window.extractedImages[index - 1], index - 1);
            }
        };
        
        btnNextPage.onclick = function() {
            if (index < window.extractedImages.length - 1) {
                console.log("Next button clicked");
                showExtractedImage(window.extractedImages[index + 1], index + 1);
            }
        };
        
        // Add keyboard navigation
        const handleKeyNav = (e) => {
            if (e.key === 'ArrowLeft' && index > 0) {
                showExtractedImage(window.extractedImages[index - 1], index - 1);
            } else if (e.key === 'ArrowRight' && index < window.extractedImages.length - 1) {
                showExtractedImage(window.extractedImages[index + 1], index + 1);
            }
        };
        
        // Remove existing listener if any
        document.removeEventListener('keydown', window.currentKeyNavHandler);
        
        // Add new listener
        window.currentKeyNavHandler = handleKeyNav;
        document.addEventListener('keydown', window.currentKeyNavHandler);
    } else {
        // Disable navigation if only one image
        btnPrevPage.disabled = true;
        btnNextPage.disabled = true;
        pageInfo.textContent = '';
    }
    
    // Check if this is a webtoon format image after it loads
    imageViewer.onload = function() {
        console.log("Image loaded:", this.naturalWidth, "x", this.naturalHeight);
        const aspectRatio = this.naturalWidth / this.naturalHeight;
        
        // If image is tall and narrow (typical webtoon format)
        if (aspectRatio < 0.5) {
            // Add webtoon format class
            imageViewer.classList.add('webtoon-format');
            
            // Auto fit to width for better viewing
            setTimeout(fitImageToWidth, 100);
        } else {
            imageViewer.classList.remove('webtoon-format');
            resetImageZoom();
        }
        
        // Update zoom level display
        updateZoomLevelDisplay();
        
        // Show a toast notification about Ctrl+wheel zoom
        showToast('Utilisez Ctrl+Molette pour zoomer, ou les boutons de contrôle', 'info');
    };
    
    // Add wheel zoom functionality
    imageContainer.onwheel = handleImageWheel;
}

// Fit image to width
function fitImageToWidth() {
    const containerWidth = imageContainer.clientWidth;
    const imageWidth = imageViewer.naturalWidth;
    
    // Calculate zoom to fit width (with small margin)
    currentZoom = (containerWidth * 0.95) / imageWidth;
    
    // Apply zoom
    applyImageZoom();
    
    // Scroll to top
    imageContainer.scrollTop = 0;
}

// Reset image zoom
function resetImageZoom() {
    currentZoom = 1.0;
    applyImageZoom();
    
    // Center the image
    imageContainer.scrollTop = 0;
}

// Apply image zoom
function applyImageZoom() {
    // Apply zoom transform
    imageViewer.style.transform = `scale(${currentZoom})`;
    
    // Update zoom level display
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
    // Only handle zoom if Ctrl key is pressed, otherwise allow normal scrolling
    if (!e.ctrlKey) {
        return; // Allow default scrolling behavior when Ctrl is not pressed
    }
    
    // Prevent default scrolling when Ctrl is pressed
    e.preventDefault();
    
    // Get mouse position relative to container
    const rect = imageContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Get scroll position before zoom
    const scrollXBefore = imageContainer.scrollLeft;
    const scrollYBefore = imageContainer.scrollTop;
    
    // Calculate position on image
    const imageX = scrollXBefore + mouseX;
    const imageY = scrollYBefore + mouseY;
    
    // Calculate zoom change
    const delta = -e.deltaY;
    const zoomChange = delta > 0 ? 1.1 : 0.9;
    
    // Apply zoom
    const oldZoom = currentZoom;
    currentZoom *= zoomChange;
    
    // Limit zoom range
    currentZoom = Math.max(0.1, Math.min(currentZoom, 5.0));
    
    // Apply zoom
    applyImageZoom();
    
    // Calculate new scroll position to keep mouse point fixed
    const zoomRatio = currentZoom / oldZoom;
    const newScrollX = imageX * zoomRatio - mouseX;
    const newScrollY = imageY * zoomRatio - mouseY;
    
    // Set new scroll position
    imageContainer.scrollLeft = newScrollX;
    imageContainer.scrollTop = newScrollY;
}

// Use extracted image (add a block with reference)
function useExtractedImage(image) {
    // Show the image in the viewer panel instead of creating a block
    showExtractedImage(image);
    
    // Show toast
    showToast('Image ouverte dans la fenêtre d\'affichage');
}

// Load API keys from server
async function loadApiKeys() {
    try {
        const response = await fetch('/api/get-keys');
        const keys = await response.json();
        
        // Update keys in memory
        geminiKey = keys.gemini || '';
        firecrawlKey = keys.firecrawl || '';
        
        // Update UI
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
    // Confirm before cleaning up
    if (!confirm('Êtes-vous sûr de vouloir nettoyer le dossier uploads ?\n\nCela supprimera tous les dossiers de webtoons sauf le plus récent.\nLes images utilisées dans votre projet sont sauvegardées lors de l\'exportation.')) {
        return;
    }
    
    // Show loading
    showLoading(true);
    extractionStatus.textContent = 'Nettoyage en cours...';
    extractionStatus.className = 'status-message';
    extractionProgress.classList.add('active');
    extractionProgress.querySelector('.progress-bar').style.width = '50%';
    
    try {
        // Call the cleanup API
        const response = await fetch('/api/cleanup', {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors du nettoyage');
        }
        
        const data = await response.json();
        
        // Update progress
        extractionProgress.querySelector('.progress-bar').style.width = '100%';
        
        // Show success message
        extractionStatus.textContent = data.message;
        extractionStatus.className = 'status-message success';
        
        // Show detailed statistics in a toast
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
        // Hide progress bar after a delay
        setTimeout(() => {
            extractionProgress.classList.remove('active');
            extractionProgress.querySelector('.progress-bar').style.width = '0';
            showLoading(false);
        }, 1000);
    }
}

// Télécharger un exemple de JSON valide
async function downloadExampleJson() {
    try {
        showToast('Téléchargement de l\'exemple JSON...', 'info');
        
        // Appeler l'API pour récupérer l'exemple
        const response = await fetch('/api/example-json');
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de l\'exemple');
        }
        
        // Récupérer le contenu en blob
        const blob = await response.blob();
        
        // Créer un lien de téléchargement
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'example_project_data.json';
        document.body.appendChild(a);
        a.click();
        
        // Nettoyer
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
        
        // Appeler l'API pour récupérer l'exemple
        const response = await fetch('/api/example-zip');
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de l\'exemple');
        }
        
        // Récupérer le contenu en blob
        const blob = await response.blob();
        
        // Créer un lien de téléchargement
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exemple_webtoon.zip';
        document.body.appendChild(a);
        a.click();
        
        // Nettoyer
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
        // Vérifier si le lecteur est ouvert
        if (viewerPanel.classList.contains('hidden')) {
            showToast('Ouvrez d\'abord un fichier dans le lecteur', 'warning');
            return;
        }
        
        // Vérifier si la clé Gemini est configurée
        if (!geminiKey) {
            showToast('Configurez d\'abord votre clé Gemini dans les outils', 'warning');
            return;
        }
        
        // Déterminer quelle zone capturer
        let targetElement;
        if (currentPDFDoc) {
            // Si c'est un PDF, capturer le conteneur PDF
            targetElement = pdfContainer;
        } else if (imageViewer.style.display !== 'none') {
            // Si c'est une image, capturer le conteneur d'image
            targetElement = imageContainer;
        } else {
            showToast('Aucun contenu à capturer', 'warning');
            return;
        }
        
        // Activer le mode de sélection de zone
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
        // Créer l'overlay de sélection
        const overlay = document.createElement('div');
        overlay.id = 'zone-selection-overlay';
        
        // Créer la zone de sélection
        const selectionBox = document.createElement('div');
        selectionBox.id = 'zone-selection-box';
        
        overlay.appendChild(selectionBox);
        document.body.appendChild(overlay);
        
        let isSelecting = false;
        let startX, startY, endX, endY;
        
        // Fonction pour mettre à jour la zone de sélection
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
        
        // Gestionnaire de clic pour commencer la sélection
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
        
        // Gestionnaire de mouvement pour redimensionner la sélection
        function updateSelection(e) {
            if (!isSelecting) return;
            
            e.preventDefault();
            endX = e.clientX || e.touches[0].clientX;
            endY = e.clientY || e.touches[0].clientY;
            
            updateSelectionBox();
        }
        
        // Gestionnaire de relâchement pour finaliser la sélection
        async function endSelection(e) {
            if (!isSelecting) return;
            
            isSelecting = false;
            
            // Vérifier que la sélection a une taille minimale
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            
            if (width < 50 || height < 50) {
                showToast('Sélection trop petite, essayez de sélectionner une zone plus grande', 'warning');
                return;
            }
            
            // Masquer l'overlay
            document.body.removeChild(overlay);
            
            // Capturer la zone sélectionnée
            await captureSelectedZone(targetElement, startX, startY, endX, endY);
            resolve();
        }
        
        // Événements souris
        overlay.addEventListener('mousedown', startSelection);
        overlay.addEventListener('mousemove', updateSelection);
        overlay.addEventListener('mouseup', endSelection);
        
        // Événements tactiles
        overlay.addEventListener('touchstart', startSelection, { passive: false });
        overlay.addEventListener('touchmove', updateSelection, { passive: false });
        overlay.addEventListener('touchend', endSelection, { passive: false });
        
        // Gestionnaire d'échappement pour annuler
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
                showToast('Sélection annulée', 'info');
                resolve();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        // Instructions visuelles
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
        
        // Capturer l'écran complet avec html2canvas
        const canvas = await html2canvas(targetElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scale: 2, // Haute résolution pour un meilleur OCR
            logging: false
        });
        
        // Calculer les coordonnées relatives à l'élément cible
        const targetRect = targetElement.getBoundingClientRect();
        const relativeStartX = (startX - targetRect.left) * 2; // *2 pour le scale
        const relativeStartY = (startY - targetRect.top) * 2;
        const relativeEndX = (endX - targetRect.left) * 2;
        const relativeEndY = (endY - targetRect.top) * 2;
        
        // Créer un nouveau canvas avec la zone sélectionnée
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        
        const cropWidth = Math.abs(relativeEndX - relativeStartX);
        const cropHeight = Math.abs(relativeEndY - relativeStartY);
        
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        
        // Dessiner la zone sélectionnée
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
        
        // Convertir en blob et envoyer
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
    // Trouver le dernier bloc de texte (pas un commentaire)
    let lastBlockIndex = -1;
    for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type !== 'C' && blocks[i].type !== 'HC') {
            lastBlockIndex = i;
            break;
        }
    }
    
    // Si aucun bloc trouvé, créer un nouveau bloc
    if (lastBlockIndex === -1) {
        addBlock('B');
        lastBlockIndex = blocks.length - 1;
    }
    
    // Stocker les suggestions dans aiMap pour qu'elles persistent
    if (!aiMap[lastBlockIndex]) {
        aiMap[lastBlockIndex] = {};
    }
    
    // Préparer les suggestions avec le texte OCR
    let suggestions = [];
    
    // Ajouter le texte OCR comme première suggestion si disponible
    if (data.ocr && data.ocr.trim()) {
        suggestions.push(`[OCR: ${data.ocr}]`);
    }
    
    // Ajouter les suggestions de traduction
    if (data.suggestions && data.suggestions.length > 0) {
        suggestions = suggestions.concat(data.suggestions);
    }
    
    // Si aucune suggestion, ajouter un message
    if (suggestions.length === 0) {
        suggestions.push('Aucune suggestion disponible');
    }
    
    // Stocker les suggestions
    aiMap[lastBlockIndex].suggestions = suggestions;
    aiMap[lastBlockIndex].sourceLang = data.sourceLang || 'unknown';
    aiMap[lastBlockIndex].ocrText = data.ocr || '';
    
    // Re-rendre les blocs pour afficher les suggestions
    renderBlocks();
    
    // Faire défiler vers le bloc
    const blockElements = document.querySelectorAll('.block');
    if (lastBlockIndex < blockElements.length) {
        blockElements[lastBlockIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    showToast(`Suggestions ajoutées au bloc ${blocks[lastBlockIndex].type}${blocks[lastBlockIndex].number}`, 'success');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 