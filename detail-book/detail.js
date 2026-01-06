import { getBookContent } from '../shared/app-bookshelf.js';

// ========================================
// CONFIGURACIÓN INICIAL
// ========================================
const params = new URLSearchParams(window.location.search);
const bookId = params.get('bookId');
const container = document.getElementById('book-detail-container');

let pages = [];
let currentPage = 0;

// ⚙️ CONFIGURACIÓN: Cambia este número para ajustar párrafos por página
const PARAGRAPHS_PER_PAGE = 3;

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

    const startMatch = content.match(/\*\*\* START OF (THIS|THE) PROJECT GUTENBERG EBOOK .* \*\*\*/i);
    if (startMatch) {
        content = content.substring(startMatch.index + startMatch[0].length);
    }

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
    let paragraphs = text.split(/\n\s*\n/);

    paragraphs = paragraphs
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 50);

    return paragraphs;
}

/**
 * Divide un capítulo en sub-páginas de máximo N párrafos
 */
function divideChapterIntoPages(chapter) {
    const paragraphs = splitIntoParagraphs(chapter.content);
    const subPages = [];

    for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
        const pageParagraphs = paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE);
        const pageNumber = Math.floor(i / PARAGRAPHS_PER_PAGE) + 1;
        const totalPages = Math.ceil(paragraphs.length / PARAGRAPHS_PER_PAGE);

        let displayTitle = chapter.title;
        if (totalPages > 1) {
            displayTitle = `${chapter.title}<br><small style="font-size:0.7em; color:#999;">(Page ${pageNumber} of ${totalPages})</small>`;
        }

        subPages.push({
            title: displayTitle,
            content: pageParagraphs.join('\n\n'),
            paragraphCount: pageParagraphs.length,
            isSubPage: totalPages > 1
        });
    }

    return subPages;
}

/**
 * Convierte números romanos a arábigos
 */
function romanToArabic(roman) {
    const romanMap = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let result = 0;
    for (let i = 0; i < roman.length; i++) {
        const current = romanMap[roman[i]];
        const next = romanMap[roman[i + 1]];
        if (next && current < next) {
            result -= current;
        } else {
            result += current;
        }
    }
    return result;
}

/**
 * Extrae el número de capítulo (soporta romanos y arábigos)
 */
function extractChapterNumber(numberStr) {
    if (/^\d+$/.test(numberStr)) {
        return parseInt(numberStr);
    }
    if (/^[IVXLCDM]+$/.test(numberStr)) {
        return romanToArabic(numberStr);
    }
    return 0;
}

/**
 * Detecta y extrae contenido previo (cartas, introducción, etc.)
 */
function extractPreliminaryContent(text) {
    // Buscar el primer capítulo/stave real
    const firstChapterRegex = /^(CHAPTER|Chapter|STAVE|Stave)\s+(I\b|1\b|ONE\b)[\s.:]/m;
    const match = text.match(firstChapterRegex);

    if (!match) return { preliminary: '', mainText: text };

    const preliminaryContent = text.substring(0, match.index).trim();
    const mainText = text.substring(match.index);

    console.log(`📄 Found preliminary content: ${preliminaryContent.length} chars`);
    console.log(`📖 Main text starts at: "${mainText.substring(0, 50).trim()}..."`);

    return { preliminary: preliminaryContent, mainText };
}

/**
 * Procesa contenido preliminar (cartas, prefacios, índices, etc.)
 */
function processPreliminaryContent(preliminaryText) {
    if (!preliminaryText || preliminaryText.length < 200) return [];

    const sections = [];
    let cleanedText = preliminaryText;
    
    // Detectar y ELIMINAR índices/contenidos
    // 1. Buscar líneas consecutivas con pattern "Stave I: Title"
    const staveIndexRegex = /^(Stave|STAVE)\s+([IVX]+):\s*[^\n]+(\n(Stave|STAVE)\s+([IVX]+):\s*[^\n]+)+/m;
    const staveIndexMatch = cleanedText.match(staveIndexRegex);
    
    if (staveIndexMatch) {
        console.log(`🗑️ Removing Stave index (${staveIndexMatch[0].length} chars)`);
        cleanedText = cleanedText.replace(staveIndexMatch[0], '').trim();
    }
    
    // 2. Otros índices comunes
    const contentsPatterns = [
        /^(CONTENTS|Contents|TABLE OF CONTENTS)[\s\S]{0,2000}?(?=^[A-Z]{2,}|\n\n[A-Z])/m,
        /^(ACT [IVX]+\s*\n[\s\S]{0,1000}?)+(?=\n\n)/m,
        /^(Chapter|CHAPTER)\s+([IVX]+|\d+)[^\n]*(\n(Chapter|CHAPTER)\s+([IVX]+|\d+)[^\n]*)+/m
    ];
    
    for (const pattern of contentsPatterns) {
        const match = cleanedText.match(pattern);
        if (match) {
            console.log(`🗑️ Removing table of contents (${match[0].length} chars)`);
            cleanedText = cleanedText.replace(match[0], '').trim();
        }
    }
    
    // Detectar cartas
    const letterRegex = /^(LETTER|Letter)\s+([IVXLCDM]+|\d+)/gm;
    const letterMatches = [...cleanedText.matchAll(letterRegex)];

    if (letterMatches.length > 0) {
        letterMatches.forEach((match, index) => {
            const letterWord = match[1];
            const letterNumber = match[2];
            const title = `${letterWord} ${letterNumber}`;

            const contentStart = match.index + match[0].length;
            const nextStart = letterMatches[index + 1]?.index ?? cleanedText.length;

            const content = cleanedText.substring(contentStart, nextStart)
                .replace(/^[\r\n\s]+/, '')
                .trim();

            if (content.length > 100) {
                sections.push({ title, content });
            }
        });
    } else if (cleanedText.length > 500) {
        const hasRealContent = cleanedText.split(/\n\s*\n/).some(p => p.length > 200);
        
        if (hasRealContent) {
            sections.push({
                title: 'Introduction / Preface',
                content: cleanedText
            });
        }
    }

    return sections;
}

/**
 * Detecta si el libro es una obra de teatro
 */
function isPlayFormat(text) {
    const playPatterns = [
        /^ACT [IVX]+/m,
        /^Scene [IVX]+\./m,
        /^SCENE [IVX]+\./m
    ];
    return playPatterns.some(pattern => pattern.test(text));
}

/**
 * Parsea obras de teatro (ACT/Scene)
 */
function parseByActsAndScenes(text) {
    const { preliminary, mainText } = extractPreliminaryContent(text);
    
    const actRegex = /^ACT ([IVX]+)/gm;
    const sceneRegex = /^(Scene|SCENE) ([IVX]+)\.\s*([^\n]{0,60})/gm;
    
    const actMatches = [...mainText.matchAll(actRegex)];
    const sceneMatches = [...mainText.matchAll(sceneRegex)];
    
    console.log(`🎭 Found ${actMatches.length} acts and ${sceneMatches.length} scenes`);
    
    if (sceneMatches.length === 0) return null;
    
    const scenes = [];
    
    sceneMatches.forEach((match, index) => {
        const sceneWord = match[1]; 
        const sceneNumber = match[2];
        const sceneLocation = match[3]?.trim();
        
        let actNumber = 'I';
        for (const actMatch of actMatches) {
            if (actMatch.index < match.index) {
                actNumber = actMatch[1];
            } else {
                break;
            }
        }
        
        const title = `Act ${actNumber}, Scene ${sceneNumber}${sceneLocation ? ': ' + sceneLocation : ''}`;
        
        const contentStart = match.index + match[0].length;
        const nextStart = sceneMatches[index + 1]?.index ?? mainText.length;
        
        let content = mainText.substring(contentStart, nextStart)
            .replace(/^[\r\n\s]+/, '')
            .trim();
        
        const realParagraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
        
        if (realParagraphs.length >= 1) {
            scenes.push({
                title,
                content,
                actNumber: romanToArabic(actNumber),
                sceneNumber: romanToArabic(sceneNumber)
            });
        }
    });
    
    scenes.sort((a, b) => {
        if (a.actNumber !== b.actNumber) {
            return a.actNumber - b.actNumber;
        }
        return a.sceneNumber - b.sceneNumber;
    });
    
    console.log(`🎭 ${scenes.length} scenes processed and ordered`);
    
    const preliminaryPages = [];
    const preliminarySections = processPreliminaryContent(preliminary);
    preliminarySections.forEach(section => {
        preliminaryPages.push(...divideChapterIntoPages(section));
    });
    
    const scenePages = [];
    scenes.forEach(scene => {
        scenePages.push(...divideChapterIntoPages(scene));
    });
    
    return [...preliminaryPages, ...scenePages];
}

/**
 * Parsea libros con capítulos sin numeración (solo títulos)
 * Ejemplo: Dr. Jekyll and Mr. Hyde
 */
function parseByTitlesOnly(text) {
    // Detectar líneas cortas en mayúsculas que actúan como títulos
    // Ejemplo: "STORY OF THE DOOR", "SEARCH FOR MR. HYDE"
    const titleRegex = /^([A-Z][A-Z\s]{10,60})$/gm;
    
    const matches = [...text.matchAll(titleRegex)];
    
    // Filtrar títulos que probablemente sean encabezados de capítulos
    const validTitles = matches.filter((match, index) => {
        const titleText = match[0].trim();
        
        // Debe tener al menos 3 palabras
        const wordCount = titleText.split(/\s+/).length;
        if (wordCount < 3) return false;
        
        // Verificar que hay contenido después
        const nextMatch = matches[index + 1];
        const contentStart = match.index + match[0].length;
        const contentEnd = nextMatch ? nextMatch.index : text.length;
        const content = text.substring(contentStart, contentEnd).trim();
        
        // Debe haber al menos 500 caracteres de contenido
        return content.length > 500;
    });
    
    console.log(`📚 Found ${validTitles.length} title-based chapters`);
    
    if (validTitles.length === 0) return null;
    
    const chapters = [];
    
    validTitles.forEach((match, index) => {
        const title = match[0].trim();
        
        const contentStart = match.index + match[0].length;
        const nextStart = validTitles[index + 1]?.index ?? text.length;
        
        let content = text.substring(contentStart, nextStart)
            .replace(/^[\r\n\s]+/, '')
            .trim();
        
        const realParagraphs = content
            .split(/\n\s*\n/)
            .filter(p => p.trim().length > 50);
        
        if (realParagraphs.length >= 1) {
            chapters.push({ 
                title: `Chapter ${index + 1}. ${title}`,
                content,
                chapterNumber: index + 1
            });
        }
    });
    
    console.log(`📚 ${chapters.length} title-based chapters processed`);
    
    return chapters;
}
function parseByChapters(text) {
    const { preliminary, mainText } = extractPreliminaryContent(text);

    // Regex que captura tanto "STAVE I" como "STAVE I: Title"
    const chapterRegex = /^(CHAPTER|Chapter|STAVE|Stave|BOOK|Book|PART|Part)\s+([IVXLCDM]+|\d+)(?:[:.\s]+([^\r\n]{3,80}?))?\.?\s*$/gm;

    const matches = [...mainText.matchAll(chapterRegex)];

    console.log(`📚 Found ${matches.length} chapter markers`);
    if (matches.length > 0) {
        console.log('First 5 chapters:');
        matches.slice(0, 5).forEach((m, i) => {
            console.log(`  ${i + 1}. "${m[0].trim()}"`);
        });
    }

    if (matches.length === 0) {
        console.log('❌ No chapters found');
        return null;
    }

    const chapters = [];

    matches.forEach((match, index) => {
        const chapterWord = match[1];
        const chapterNumberStr = match[2];
        const chapterName = match[3]?.trim();

        const chapterNumber = extractChapterNumber(chapterNumberStr);

        let title = `${chapterWord} ${chapterNumberStr}`;
        if (chapterName && chapterName.length > 0) {
            title += `: ${chapterName}`;
        }

        const contentStart = match.index + match[0].length;
        const nextStart = matches[index + 1]?.index ?? mainText.length;

        let content = mainText.substring(contentStart, nextStart)
            .replace(/^[\r\n\s]+/, '')
            .trim();

        const realParagraphs = content
            .split(/\n\s*\n/)
            .filter(p => p.trim().length > 50);

        if (realParagraphs.length >= 1) {
            chapters.push({ 
                title, 
                content, 
                chapterNumber,
                originalIndex: index 
            });
        }
    });

    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

    console.log(`📚 ${chapters.length} chapters ordered and ready`);

    const preliminaryPages = [];
    const preliminarySections = processPreliminaryContent(preliminary);
    
    preliminarySections.forEach(section => {
        preliminaryPages.push(...divideChapterIntoPages(section));
    });

    const chapterPages = [];
    chapters.forEach(ch => {
        chapterPages.push(...divideChapterIntoPages(ch));
    });

    console.log(`📖 Final: ${preliminaryPages.length} prelim + ${chapterPages.length} chapter pages`);

    return [...preliminaryPages, ...chapterPages];
}

/**
 * Divide el texto en páginas si no hay capítulos
 */
function parseByParagraphsSimple(text) {
    const paragraphs = splitIntoParagraphs(text);
    const pages = [];

    for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
        const pageParagraphs = paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE);
        pages.push({
            title: `Page ${pages.length + 1}`,
            content: pageParagraphs.join('\n\n'),
            paragraphCount: pageParagraphs.length
        });
    }

    return pages;
}

/**
 * Estructura el contenido del libro
 */
/**
 * Estructura el contenido del libro
 */
function structureBook(plainText) {
    const cleanText = cleanGutenbergText(plainText);
    
    // 1. Intentar formato de obra de teatro
    if (isPlayFormat(cleanText)) {
        console.log('🎭 Play format detected');
        const structure = parseByActsAndScenes(cleanText);
        if (structure && structure.length > 0) {
            return structure;
        }
    }
    
    // 2. Intentar capítulos numerados (CHAPTER I, STAVE I, etc.)
    let structure = parseByChapters(cleanText);
    if (structure && structure.length > 0) {
        return structure;
    }

    // 3. Intentar capítulos por títulos solamente (Dr. Jekyll style)
    console.log('⚠️ No numbered chapters found, trying title-based parsing');
    structure = parseByTitlesOnly(cleanText);
    if (structure && structure.length > 0) {
        // Convertir chapters a pages
        const pages = [];
        structure.forEach(chapter => {
            pages.push(...divideChapterIntoPages(chapter));
        });
        return pages;
    }

    // 4. Fallback: dividir por párrafos
    console.log('⚠️ No chapters or titles found, using paragraph-based pagination');
    structure = parseByParagraphsSimple(cleanText);

    return structure;
}

/**
 * Formatea el texto con HTML apropiado
 */
function formatText(text) {
    const paragraphs = text.split('\n\n').filter(p => p.trim());

    return paragraphs
        .map(para => {
            para = para.trim().replace(/\n/g, ' ');

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

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
});

// ========================================
// CARGAR LIBRO
// ========================================

getBookContent(bookId)
    .then(bookData => {
        console.log('📖 Book data received');

        if (!bookData) {
            pageContainer.innerHTML = `
                <div style="color:red; text-align:center; padding:2rem;">
                    <h3>❌ Could not load book</h3>
                    <p>The book content could not be downloaded.</p>
                    <p style="font-size:0.9em; margin-top:1rem;">Try refreshing the page or selecting another book.</p>
                </div>
            `;
            return;
        }

        if (!bookData.content || bookData.content.length < 500) {
            pageContainer.innerHTML = `
                <div style="color:red; text-align:center; padding:2rem;">
                    <h3>❌ Invalid content</h3>
                    <p>The book content is empty or corrupted.</p>
                </div>
            `;
            return;
        }

        titleElem.textContent = bookData.title;
        authorElem.textContent = `By ${bookData.author}`;

        try {
            console.log('📚 Processing book structure...');
            pages = structureBook(bookData.content);
        } catch (err) {
            console.error('Error on book structure:', err);
            pageContainer.innerHTML = `
                <div style="color:red; text-align:center; padding:2rem;">
                    <h3>❌ Processing error</h3>
                    <p>Could not process the book structure.</p>
                    <p style="font-size:0.9em;">${err.message}</p>
                </div>
            `;
            return;
        }

        if (pages.length === 0) {
            pageContainer.innerHTML = `
                <div style="color:red; text-align:center; padding:2rem;">
                    <h3>❌ No pages generated</h3>
                    <p>The book could not be structured into readable pages.</p>
                </div>
            `;
            return;
        }

        console.log(`✅ Book loaded: "${bookData.title}" - ${pages.length} total pages`);
        showPage(0);
    })
    .catch(err => {
        console.error('Error:', err);
        pageContainer.innerHTML = `
            <div style="color:red; text-align:center; padding:2rem;">
                <h3>❌ Loading error</h3>
                <p>${err.message}</p>
                <p style="font-size:0.9em; margin-top:1rem;">Please try again later or select another book.</p>
            </div>
        `;
    });