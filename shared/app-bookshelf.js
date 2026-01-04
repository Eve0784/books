const baseUrl = 'https://gutendex.com/books/';

export function getBooks() {
    return fetch(baseUrl)
        .then(res => res.json())
        .catch(err => console.log(err));
}

export function getBookContent(textUrl) {
    return fetch(textUrl)
        .then(res => res.text())
        .catch(err => console.log(err));
}
