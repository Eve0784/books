const baseUrl = 'https://gutendex.com/books/';

export function getBooks(page = 1) {
    return fetch(`${baseUrl}?page=${page}`)
        .then(res => res.json())
        .catch(err => console.log(err));
}

export function getBookContent(textUrl) {
    return fetch(textUrl)
        .then(res => res.text())
        .catch(err => console.log(err));
}

export function searchBooks(query) {
    return fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`)
        .then(res => res.json());
}