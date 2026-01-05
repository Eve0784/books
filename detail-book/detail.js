import { getBookContent } from '../shared/app-bookshelf.js';

// ========================================
// CONFIGURACIÓN INICIAL
// ========================================
const params = new URLSearchParams(window.location.search);
const bookId = params.get('bookId');
const container = document.getElementById('book-detail-container');

let pages = [];
let currentPage = 0;

// ========================================
// CREAR ELEMENTOS DEL DOM
// ========================================
const titleElem = document.createElement('h2');
titleElem.classList.add('book-title');
container.appendChild(titleElem);

const authorElem = document.createElement('p');
authorElem.classList.add('book-author');
container.appendChild(authorElem);

const pageContainer = document.createElement('div');
pageContainer.classList.add('book-page');
pageContainer.innerHTML = '<p style="text-align:center; padding:3rem;">Loading book...</p>';
container.appendChild(pageContainer);

const footer = document.createElement('div');
footer.classList.add('book-footer');

const prevBtn = document.createElement('button');
prevBtn.textContent = '◀';

const pageNumber = document.createElement('span');
pageNumber.classList.add('page-number');
pageNumber.textContent = '0';

const nextBtn = document.createElement('button');
nextBtn.textContent = '▶';

footer.appendChild(prevBtn);
footer.appendChild(pageNumber);
footer.appendChild(nextBtn);
container.appendChild(footer);

// ========================================
// FUNCIONES DE PROCESAMIENTO DE TEXTO
// ========================================

/**
 * Limpia el texto eliminando prólogos y epílogos de Gutenberg
 */
function cleanGutenbergText(text) {
    let content = text;
    
    // Eliminar header de Gutenberg
    const startMatch = content.match(/\*\*\* START OF (THIS|THE) PROJECT GUTENBERG EBOOK .* \*\*\*/i);
    if (startMatch) {
        content = content.substring(startMatch.index + startMatch[0].length);
    }
    
    // Eliminar footer de Gutenberg
    const endMatch = content.match(/\*\*\* END OF (THIS|THE) PROJECT GUTENBERG EBOOK .* \*\*\*/i);
    if (endMatch) {
        content = content.substring(0, endMatch.index);
    }
    
    return content.trim();
}

/**
 * Divide el contenido en párrafos reales
 */
function splitIntoParagraphs(text) {
    // Dividir por doble salto de línea (párrafos reales)
    let paragraphs = text.split(/\n\s*\n/);
    
    // Limpiar y filtrar
    paragraphs = paragraphs
        .map(p => p.replace(/\s+/g, ' ').trim()) // Normalizar espacios
        .filter(p => p.length > 50); // Solo párrafos significativos (más de 50 caracteres)
    
    return paragraphs;
}

/**
 * Divide un capítulo en sub-páginas de máximo 4 párrafos
 */
function divideChapterIntoPages(chapter, maxParagraphsPerPage = 3) {
    const paragraphs = splitIntoParagraphs(chapter.content);
    const subPages = [];
    
    for (let i = 0; i < paragraphs.length; i += maxParagraphsPerPage) {
        const pageParagraphs = paragraphs.slice(i, i + maxParagraphsPerPage);
        const pageNumber = Math.floor(i / maxParagraphsPerPage) + 1;
        const totalPages = Math.ceil(paragraphs.length / maxParagraphsPerPage);
        
        subPages.push({
            title: totalPages > 1 ? `${chapter.title} (${pageNumber}/${totalPages})` : chapter.title,
            content: pageParagraphs.join('\n\n'),
            isSubPage: totalPages > 1
        });
    }
    
    return subPages;
}

/**
 * Detecta y estructura el libro por capítulos
 */
function parseByChapters(text) {
    // Regex más estricto: solo captura "Chapter X" o "CHAPTER X" seguido de salto de línea
    const chapterRegex = /^(CHAPTER|Chapter|CAPÍTULO|Capítulo)\s+([IVXLCDM\d]+|\d+)\s*$/gim;
    const matches = [...text.matchAll(chapterRegex)];
    
    if (matches.length === 0) {
        return null; // No se encontraron capítulos
    }
    
    const chapters = [];
    
    matches.forEach((match, index) => {
        const chapterStart = match.index;
        const chapterTitle = match[0].trim();
        
        // El contenido empieza después del título + saltos de línea
        const contentStart = chapterStart + match[0].length;
        
        // Buscar el siguiente capítulo
        const nextChapterStart = matches[index + 1] ? matches[index + 1].index : text.length;
        
        // Extraer contenido y limpiar saltos de línea al inicio
        let content = text.substring(contentStart, nextChapterStart);
        content = content.replace(/^[\r\n\s]+/, '').trim();
        
        if (content.length > 0) {
            chapters.push({
                title: chapterTitle,
                content: content
            });
        }
    });
    
    // Dividir cada capítulo en sub-páginas
    const allPages = [];
    chapters.forEach(chapter => {
        const subPages = divideChapterIntoPages(chapter);
        allPages.push(...subPages);
    });
    
    return allPages.length > 0 ? allPages : null;
}

/**
 * Divide el texto en páginas si no hay capítulos
 */
function parseByParagraphs(text) {
    const paragraphs = text
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 100);
    
    const pages = [];
    const paragraphsPerPage = 3; // Máximo 4 párrafos por página
    
    for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
        const pageParagraphs = paragraphs.slice(i, i + paragraphsPerPage);
        pages.push({
            title: `Page ${pages.length + 1}`,
            content: pageParagraphs.join('\n\n')
        });
    }
    
    return pages;
}

/**
 * Estructura el contenido del libro
 */
function structureBook(plainText) {
    // 1. Limpiar texto
    const cleanText = cleanGutenbergText(plainText);
    
    // 2. Intentar dividir por capítulos
    let structure = parseByChapters(cleanText);
    
    // 3. Si no hay capítulos, dividir por párrafos
    if (!structure || structure.length === 0) {
        structure = parseByParagraphs(cleanText);
    }
    
    return structure;
}

/**
 * Formatea el texto con HTML apropiado
 */
function formatText(text) {
    // Si el texto ya viene como párrafos unidos con \n\n, dividirlos
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return paragraphs
        .map(para => {
            para = para.trim().replace(/\n/g, ' '); // Unir líneas del mismo párrafo
            
            // Detectar títulos (líneas cortas en mayúsculas)
            if (para.length < 80 && para === para.toUpperCase()) {
                return `<h3 style="text-align:center; margin:2rem 0 1rem;">${para}</h3>`;
            }
            
            return `<p>${para}</p>`;
        })
        .join('');
}

// ========================================
// FUNCIONES DE NAVEGACIÓN
// ========================================

function showPage(index) {
    if (index < 0 || index >= pages.length) return;
    
    currentPage = index;
    const chapter = pages[currentPage];
    const formattedContent = formatText(chapter.content);
    
    pageContainer.innerHTML = `
        <h2 style="text-align:center; margin-bottom:2rem; color:#8b4513;">${chapter.title}</h2>
        <div style="text-align:justify;">${formattedContent}</div>
    `;
    
    pageNumber.textContent = `${currentPage + 1} / ${pages.length}`;
    
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === pages.length - 1;
}

// ========================================
// EVENT LISTENERS
// ========================================

prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
        showPage(currentPage - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

nextBtn.addEventListener('click', () => {
    if (currentPage < pages.length - 1) {
        showPage(currentPage + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// Navegación con teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
});

// ========================================
// CARGAR LIBRO
// ========================================

getBookContent(bookId)
    .then(bookData => {
        if (!bookData) {
            pageContainer.innerHTML = '<p style="color:red; text-align:center;">Book could not be loaded</p>';
            return;
        }
        
        // Mostrar información del libro
        titleElem.textContent = bookData.title;
        authorElem.textContent = `por ${bookData.author}`;
        
        // Estructurar el contenido
        pages = structureBook(bookData.content);
        
        if (pages.length === 0) {
            pageContainer.innerHTML = '<p style="color:red; text-align:center;">Book content could not be structured</p>';
            return;
        }
        
        console.log(`✅Book loaded: "${bookData.title}" - ${pages.length} chapter/pages`);
        
        // Mostrar primera página
        showPage(0);
    })
    .catch(err => {
        console.error('Error:', err);
        pageContainer.innerHTML = '<p style="color:red; text-align:center;">Error loading book</p>';
    });


//----------------------------------------------------------------------------------------------------------------------------------------//
