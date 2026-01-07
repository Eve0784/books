// const baseUrl = 'https://gutendex.com/books/';

// // 🔄 Lista de proxies CORS (con fallback)
// const CORS_PROXIES = [
//     url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
//     url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
//     url => `https://thingproxy.freeboard.io/fetch/${url}`,
//     // Directo sin proxy (a veces funciona)
//     url => url
// ]; 

// export function getBooks(page = 1) {
//     return fetch(baseUrl + '?page='+ page)
//         .then(res => res.json())
//         .catch(err => console.error(err));

//     //----------------- con stringa interpolata-------------------------//
//     // return fetch(`${baseUrl}?page=${page}`)
//     //     .then(res => res.json())
//     //     .catch(err => console.error(err));
// }
// export function searchBooks(query) {
//     return fetch(baseUrl + '?search='+ encodeURIComponent(query))
//         .then(res => res.json());

//     // return fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`)
//     //     .then(res => res.json());
// }

// // 🗑️ Función para limpiar la caché de libros
// export function clearBookCache(bookId = null) {
//     if (bookId) {
//         return window.storage.delete(`book:${bookId}`)
//             .then(() => console.log(`🗑️ Book cache ${bookId} deleted`))
//             .catch(err => console.error('Error cleaning book cache:', err));
//     } else {
//         return window.storage.list('book:')
//             .then(result => {
//                 const keys = result.keys || [];
//                 console.log(`🗑️ Clearing ${keys.length} books from cache...`);
//                 return Promise.all(
//                     keys.map(key => window.storage.delete(key))
//                 );
//             })
//             .then(() => console.log('✅ Cache cleared completely'))
//             .catch(err => console.error('Error cleaning cache:', err));
//     }
// }

// /**
//  * Intenta descargar con múltiples proxies CORS
//  */
// async function fetchWithFallback(url) {
//     let lastError = null;

//     for (let i = 0; i < CORS_PROXIES.length; i++) {
//         const proxyFn = CORS_PROXIES[i];
//         const proxyUrl = proxyFn(url);
        
//         console.log(`🔄 Attempting download with proxy ${i + 1}/${CORS_PROXIES.length}...`);
        
//         try {
//             const response = await fetch(proxyUrl);
            
//             if (!response.ok) {
//                 throw new Error(`HTTP ${response.status}`);
//             }
            
//             const text = await response.text();
            
//             // Verificar que NO es una página de error HTML
//             if (text.includes('<!DOCTYPE html>') && text.includes('error')) {
//                 throw new Error('Proxy returned error page');
//             }
            
//             // Verificar que es contenido de Gutenberg válido
//             if (text.length < 1000 || !text.includes('Gutenberg')) {
//                 throw new Error('Invalid book content');
//             }
            
//             console.log(`✅ Download successful with proxy ${i + 1}`);
//             return text;
            
//         } catch (err) {
//             console.warn(`❌ Proxy ${i + 1} failed:`, err.message);
//             lastError = err;
//             // Continuar con el siguiente proxy
//         }
//     }

//     throw new Error(`All proxies failed. Last error: ${lastError?.message}`);
// }

// export async function getBookContent(id) {
//     try {
//         // 1. Verificar caché primero
//         const cacheKey = `book:${id}`;
//         try {
//             const cached = await window.storage.get(cacheKey);
//             if (cached) {
//                 console.log(`📚 Loading book ${id} from cache`);
//                 return JSON.parse(cached.value);
//             }
//         } catch (err) {
//             console.log('No cached version found, fetching...');
//         }

//         // 2. Obtener metadata del libro
//         const response = await fetch(`${baseUrl}${id}`);
//         const book = await response.json();

//         // 3. Priorizar formatos (UTF-8 es mejor)
//         const textUrl = book.formats['text/plain; charset=utf-8'] || 
//                        book.formats['text/plain'] ||
//                        book.formats['text/plain; charset=us-ascii'];
        
//         if (!textUrl) {
//             throw new Error('No plain text format available');
//         }

//         console.log(`📥 Downloading from: ${textUrl}`);

//         // 4. Descargar con sistema de fallback
//         const plainText = await fetchWithFallback(textUrl);

//         const bookData = {
//             title: book.title,
//             author: book.authors[0]?.name || 'Unknown Author',
//             content: plainText,
//             id: id
//         };

//         // 5. Guardar en caché
//         if (plainText.length > 1000) {
//             try {
//                 await window.storage.set(cacheKey, JSON.stringify(bookData));
//                 console.log(`💾 Book ${id} cached successfully`);
//             } catch (err) {
//                 console.warn('Could not cache book (might be too large):', err);
//             }
//         }

//         return bookData;

//     } catch (err) {
//         console.error('Error getting book content:', err);
//         return null;
//     }
// }




const baseUrl = 'https://gutendex.com/books/';

export function getBooks(page = 1) {
    return fetch(`${baseUrl}?page=${page}`)
        .then(res => res.json())
        .catch(err => console.error(err));
}

export function searchBooks(query) {
    return fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`)
        .then(res => res.json());
}

// 🗑️ Función para limpiar la caché de libros
export function clearBookCache(bookId = null) {
    if (bookId) {
        return window.storage.delete(`book:${bookId}`)
            .then(() => console.log(`🗑️ Book cache ${bookId} deleted`))
            .catch(err => console.error('Error cleaning book cache:', err));
    } else {
        return window.storage.list('book:')
            .then(result => {
                const keys = result.keys || [];
                console.log(`🗑️ Clearing ${keys.length} books from cache...`);
                return Promise.all(
                    keys.map(key => window.storage.delete(key))
                );
            })
            .then(() => console.log('✅ Cache cleared completely'))
            .catch(err => console.error('Error cleaning cache:', err));
    }
}

/**
 * Genera múltiples URLs posibles para un libro de Gutenberg
 */
function getGutenbergUrls(bookId) {
    return [
        // Formato 1: archivo directo con -0
        `https://www.gutenberg.org/files/${bookId}/${bookId}-0.txt`,
        // Formato 2: archivo directo sin -0
        `https://www.gutenberg.org/files/${bookId}/${bookId}.txt`,
        // Formato 3: cache de Gutenberg
        `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`,
        // Formato 4: ebooks endpoint
        `https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`
    ];
}

/**
 * Lista de proxies CORS ordenados por confiabilidad
 */
function getProxies(url) {
    return [
        // Proxy 1: corsproxy.io (más rápido)
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        // Proxy 2: allorigins (más compatible con móviles)
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        // Proxy 3: codetabs
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        // Directo (sin proxy)
        url
    ];
}

/**
 * Valida que el contenido sea un libro válido de Gutenberg
 */
function isValidBookContent(text) {
    if (!text || typeof text !== 'string') {
        return { valid: false, reason: 'Empty or invalid content' };
    }
    
    // Debe tener más de 1000 caracteres
    if (text.length < 1000) {
        return { valid: false, reason: `Too short: ${text.length} chars` };
    }
    
    // No debe ser HTML de error
    const trimmed = text.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        return { valid: false, reason: 'HTML error page' };
    }
    
    // Debe contener marcadores de Gutenberg (flexible)
    const hasGutenberg = text.toLowerCase().includes('gutenberg') ||
                        text.includes('***') ||
                        text.toLowerCase().includes('project gutenberg');
    
    if (!hasGutenberg) {
        return { valid: false, reason: 'No Gutenberg markers found' };
    }
    
    return { valid: true };
}

/**
 * Intenta descargar el libro con todas las combinaciones posibles
 */
async function downloadBookText(bookId) {
    const gutenbergUrls = getGutenbergUrls(bookId);
    
    console.log(`📚 Trying ${gutenbergUrls.length} URL formats...`);
    
    for (let urlIndex = 0; urlIndex < gutenbergUrls.length; urlIndex++) {
        const url = gutenbergUrls[urlIndex];
        const proxies = getProxies(url);
        
        console.log(`\n🔗 Format ${urlIndex + 1}/${gutenbergUrls.length}: ${url}`);
        
        for (let proxyIndex = 0; proxyIndex < proxies.length; proxyIndex++) {
            const proxyUrl = proxies[proxyIndex];
            const isDirectAttempt = proxyUrl === url;
            
            try {
                console.log(`  ${isDirectAttempt ? '🔄 Direct' : '🔄 Proxy'} ${proxyIndex + 1}/${proxies.length}...`);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/plain,*/*'
                    }
                });
                
                if (!response.ok) {
                    console.log(`  ❌ HTTP ${response.status}`);
                    continue;
                }
                
                const text = await response.text();
                const validation = isValidBookContent(text);
                
                if (!validation.valid) {
                    console.log(`  ❌ ${validation.reason}`);
                    continue;
                }
                
                console.log(`  ✅ SUCCESS! ${text.length.toLocaleString()} characters`);
                return text;
                
            } catch (err) {
                console.log(`  ❌ ${err.message}`);
            }
        }
    }
    
    throw new Error('❌ All download attempts failed. The book might not be available in text format.');
}

export async function getBookContent(id) {
    try {
        console.log(`\n📖 ========== LOADING BOOK ${id} ==========`);
        
        // 1. Verificar caché primero
        const cacheKey = `book:${id}`;
        try {
            const cached = await window.storage.get(cacheKey);
            if (cached) {
                console.log(`💾 Loaded from cache!`);
                const bookData = JSON.parse(cached.value);
                console.log(`✅ "${bookData.title}" (${bookData.content.length.toLocaleString()} chars)`);
                return bookData;
            }
        } catch (err) {
            console.log('📥 No cache found, downloading...');
        }

        // 2. Obtener metadata del libro
        console.log(`🔍 Fetching metadata from Gutendex...`);
        const response = await fetch(`${baseUrl}${id}`);
        
        if (!response.ok) {
            throw new Error(`Failed to get book metadata: ${response.status}`);
        }
        
        const book = await response.json();
        console.log(`✅ Metadata: "${book.title}" by ${book.authors[0]?.name || 'Unknown'}`);

        // 3. Descargar contenido
        console.log(`\n📥 Starting download process...`);
        const plainText = await downloadBookText(id);
        
        console.log(`\n✅ Download complete: ${plainText.length.toLocaleString()} characters`);

        const bookData = {
            title: book.title,
            author: book.authors[0]?.name || 'Unknown Author',
            content: plainText,
            id: id
        };

        // 4. Guardar en caché
        try {
            await window.storage.set(cacheKey, JSON.stringify(bookData));
            console.log(`💾 Book cached successfully`);
        } catch (err) {
            console.warn('⚠️ Could not cache book:', err.message);
        }

        console.log(`\n✅ ========== BOOK ${id} READY ==========\n`);
        return bookData;

    } catch (err) {
        console.error('\n❌ ========== ERROR ==========');
        console.error('Book ID:', id);
        console.error('Error:', err.message);
        console.error('================================\n');
        return null;
    }
}