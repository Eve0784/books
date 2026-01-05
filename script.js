import { getBooks, searchBooks} from "./shared/app-bookshelf.js";

// 📊 Estado de paginación
let allBooks = [];
let currentPage = 0;
let apiPage = 1;
let totalBooks = 0;
const BOOKS_PER_PAGE = 10;
let filteredBooks = [];

// 🖼️ Renderizar libros en el estante

function displayBooks(books) {
    console.log('📚 Libros recibidos:', books);
    const container = document.getElementById('bookshelf-container');
    container.innerHTML = '';

    for (const book of books) {
        const shelf = document.createElement('div');
        shelf.classList.add('shelf');
        const bookCard = document.createElement('div');
        bookCard.classList.add('book-card');

        // 📘 COVER
        const bookCover = document.createElement('div');
        bookCover.classList.add('book-cover');
        const coverImg = document.createElement('img');
        const imageUrl = book.formats['image/jpeg'] ||
            book.formats['image/png'] ||
            'https://via.placeholder.com/150x220?text=No+Cover';
        coverImg.src = imageUrl;
        coverImg.alt = book.title || 'Book cover';
        bookCover.appendChild(coverImg);
        bookCard.appendChild(bookCover);

        //📖 INFO DEL LIBRO
        const bookInfo = document.createElement('div');
        bookInfo.classList.add('book-info');

        const bookTitle = document.createElement('h2');
        bookTitle.classList.add('book-title');
        bookTitle.textContent = book.title || 'Senza titolo';

        const bookAuthor = document.createElement('p');
        bookAuthor.classList.add('book-author');
        const authors = book.authors && book.authors.length > 0
            ? book.authors.map(a => a.name).join(', ')
            : 'Autore sconosciuto';
        bookAuthor.textContent = authors;

        const bookMeta = document.createElement('p');
        bookMeta.classList.add('book-meta');
        bookMeta.textContent = `ID: ${book.id} | Downloads: ${book.download_count || 0}`;

        const bookDescription = document.createElement('p');
        bookDescription.classList.add('book-description');
        bookDescription.textContent = book.subjects ? book.subjects.slice(0, 2).join(', ') : 'Senza descrizione';

        const bookSumary = document.createElement('p');
        bookSumary.classList.add('book-summary');
        bookSumary.textContent = book.summaries || 'Senza sommario disponibile.';

        bookInfo.appendChild(bookTitle);
        bookInfo.appendChild(bookAuthor);
        bookInfo.appendChild(bookMeta);
        bookInfo.appendChild(bookDescription);
        bookInfo.appendChild(bookSumary);
        bookCard.appendChild(bookInfo);
        shelf.appendChild(bookCard);
    
        const detailLink = document.createElement('a');
        detailLink.classList.add('detail-link');
        detailLink.href = `./detail-book/detail.html?bookId=${book.id}`;
        detailLink.textContent = '➡️';
        bookCard.appendChild(detailLink);

        shelf.appendChild(bookCard);
        container.appendChild(shelf);
    }

    // 🔄 Actualizar controles de paginación
    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
    const paginationContainer = document.getElementById('pagination-controls');

    if (!paginationContainer) {
        createPaginationControls();
        return;
    }

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');

    // Actualizar texto de página
    pageInfo.textContent = `Pagina ${currentPage + 1} di ${totalPages}`;

    // Habilitar/deshabilitar botones
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
}

// ➡️ Crear controles de paginación
function createPaginationControls() {
    // Botón anterior ⬅️
    const prevBtn = document.getElementById('prev-btn');

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadPage(currentPage);
        }
    });

    // Botón siguiente ➡️
    const nextBtn = document.getElementById('next-btn');
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
        if (currentPage < totalPages - 1) {
            currentPage++;
            loadPage(currentPage);
        }
    });

    updatePaginationControls();
}

function loadPage(pageNumber) {
    const start = pageNumber * BOOKS_PER_PAGE;
    const end = start + BOOKS_PER_PAGE;

    if (end > allBooks.length) {
        apiPage++;
        getBooks(apiPage).then(data => {
            allBooks = allBooks.concat(data.results);
            displayBooks(allBooks.slice(start, end));
            updatePaginationControls();
        });
        return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    displayBooks(allBooks.slice(start, end));
}

function filterBooks(searchTerm) {
    const term = searchTerm.trim();

    if (term === '') {
        currentPage = 0;
        loadPage(0);
        return;
    }

    searchBooks(term)
        .then(data => {
            filteredBooks = data.results;
            currentPage = 0;
            displayBooks(filteredBooks.slice(0, BOOKS_PER_PAGE));
        })
        .catch(err => console.error('❌ Error búsqueda:', err));
}
// 🔍 Manejar búsqueda
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    filterBooks(e.target.value);    
});
// 🚀 Inicialización
getBooks()
    .then(data => {
        if (!data) {
            console.error('❌ No se recibieron datos de la API');
            return;
        }
        if (!data.results) {
            console.error('❌ No existe data.results');
            return;
        }

        // Guardar todos los libros
        totalBooks = data.count;
        allBooks = data.results;
        currentPage = 0;

        console.log(`📚 Total libros disponibles: ${totalBooks}`);
        console.log('📚 Libros cargados:', allBooks);

        // Mostrar primera página
        createPaginationControls();
        loadPage(0);
    })
    .catch(err => {
        console.error('❌ Error al obtener libros:', err);
    });