const baseUrl = 'https://gutendex.com/books/';

export function getBooks(page = 1) {
    return fetch(`${baseUrl}?page=${page}`)
        .then(res => res.json())
        .catch(err => console.log(err));
}

export function getBookContent(id) {
    return fetch(`${baseUrl}${id}`)
        .then(res => res.json())
        .then(book => {
            const textUrl = book.formats['text/plain; charset=us-ascii'] || 
                           book.formats['text/plain; charset=utf-8'] ||
                           book.formats['text/plain'];
            
            if (!textUrl) {
                throw new Error('No hay formato de texto disponible');
            }
            
            // 🔧 Usar proxy CORS
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(textUrl)}`;
            
            return fetch(proxyUrl)
                .then(res => res.text())
                .then(plainText => ({
                    title: book.title,
                    author: book.authors[0]?.name || 'Autor desconocido',
                    content: plainText
                }));
        })
        .catch(err => {
            console.log('Error al obtener contenido del libro:', err);
            return null;
        });
}

export function searchBooks(query) {
    return fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`)
        .then(res => res.json());
}