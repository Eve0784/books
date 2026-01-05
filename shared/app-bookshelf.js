const baseUrl = 'https://gutendex.com/books/';

// 🔄 Lista de proxies CORS (con fallback)
const CORS_PROXIES = [
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url => `https://thingproxy.freeboard.io/fetch/${url}`,
    // Directo sin proxy (a veces funciona)
    url => url
]; 

export function getBooks(page = 1) {
    return fetch(baseUrl + '?page='+ page)
        .then(res => res.json())
        .catch(err => console.error(err));

    //----------------- con stringa interpolata-------------------------//
    // return fetch(`${baseUrl}?page=${page}`)
    //     .then(res => res.json())
    //     .catch(err => console.error(err));
}
export function searchBooks(query) {
    return fetch(baseUrl + '?search='+ encodeURIComponent(query))
        .then(res => res.json());

    // return fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`)
    //     .then(res => res.json());
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
 * Intenta descargar con múltiples proxies CORS
 */
async function fetchWithFallback(url) {
    let lastError = null;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxyFn = CORS_PROXIES[i];
        const proxyUrl = proxyFn(url);
        
        console.log(`🔄 Attempting download with proxy ${i + 1}/${CORS_PROXIES.length}...`);
        
        try {
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const text = await response.text();
            
            // Verificar que NO es una página de error HTML
            if (text.includes('<!DOCTYPE html>') && text.includes('error')) {
                throw new Error('Proxy returned error page');
            }
            
            // Verificar que es contenido de Gutenberg válido
            if (text.length < 1000 || !text.includes('Gutenberg')) {
                throw new Error('Invalid book content');
            }
            
            console.log(`✅ Download successful with proxy ${i + 1}`);
            return text;
            
        } catch (err) {
            console.warn(`❌ Proxy ${i + 1} failed:`, err.message);
            lastError = err;
            // Continuar con el siguiente proxy
        }
    }

    throw new Error(`All proxies failed. Last error: ${lastError?.message}`);
}

export async function getBookContent(id) {
    try {
        // 1. Verificar caché primero
        const cacheKey = `book:${id}`;
        try {
            const cached = await window.storage.get(cacheKey);
            if (cached) {
                console.log(`📚 Loading book ${id} from cache`);
                return JSON.parse(cached.value);
            }
        } catch (err) {
            console.log('No cached version found, fetching...');
        }

        // 2. Obtener metadata del libro
        const response = await fetch(`${baseUrl}${id}`);
        const book = await response.json();

        // 3. Priorizar formatos (UTF-8 es mejor)
        const textUrl = book.formats['text/plain; charset=utf-8'] || 
                       book.formats['text/plain'] ||
                       book.formats['text/plain; charset=us-ascii'];
        
        if (!textUrl) {
            throw new Error('No plain text format available');
        }

        console.log(`📥 Downloading from: ${textUrl}`);

        // 4. Descargar con sistema de fallback
        const plainText = await fetchWithFallback(textUrl);

        const bookData = {
            title: book.title,
            author: book.authors[0]?.name || 'Unknown Author',
            content: plainText,
            id: id
        };

        // 5. Guardar en caché
        if (plainText.length > 1000) {
            try {
                await window.storage.set(cacheKey, JSON.stringify(bookData));
                console.log(`💾 Book ${id} cached successfully`);
            } catch (err) {
                console.warn('Could not cache book (might be too large):', err);
            }
        }

        return bookData;

    } catch (err) {
        console.error('Error getting book content:', err);
        return null;
    }
}