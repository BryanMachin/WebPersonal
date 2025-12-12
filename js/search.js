// Variables globales para el sistema de búsqueda
let searchIndex = null; // Índice de búsqueda con contenido de todas las páginas
let currentSearchLang = 'es'; // Idioma actual de la búsqueda
let searchTranslations = null; // Traducciones cargadas desde el JSON

// Carga las traducciones desde el archivo JSON
async function loadTranslationsForSearch() {
  if (searchTranslations) return searchTranslations;
  
  try {
    const response = await fetch('translations.json');
    searchTranslations = await response.json();
    return searchTranslations;
  } catch (error) {
    return null;
  }
}

// Mapeo de páginas y sus claves de contenido para indexación
const PAGE_MAPPING = {
  'index.html': {
    key: 'home',
    contentKeys: ['home.name', 'home.title', 'home.intro']
  },
  'about.html': {
    key: 'about',
    contentKeys: ['about.professionalDesc', 'about.experience.job1.title', 'about.experience.job1.description', 'about.experience.job2.title', 'about.experience.job2.description', 'about.experience.job3.title', 'about.experience.job3.description', 'about.experience.job4.title', 'about.experience.job4.description', 'about.education.master.degree', 'about.education.master.description', 'about.education.bachelor.degree', 'about.education.bachelor.description', 'about.references.ref1.name', 'about.references.ref1.company']
  },
  'projects.html': {
    key: 'projects',
    contentKeys: ['projects.project1.name', 'projects.project1.description', 'projects.project1.skills', 'projects.project2.name', 'projects.project2.description', 'projects.project2.skills', 'projects.project3.name', 'projects.project3.description', 'projects.project3.skills', 'projects.project4.name', 'projects.project4.description', 'projects.project4.skills', 'projects.project5.name', 'projects.project5.description', 'projects.project5.skills', 'projects.project6.name', 'projects.project6.description', 'projects.project6.skills', 'projects.project7.name', 'projects.project7.description', 'projects.project7.skills']
  },
  'hobbies.html': {
    key: 'hobbies',
    contentKeys: ['hobbies.title', 'hobbies.intro', 'hobbies.webDev', 'hobbies.webDevDesc', 'hobbies.football', 'hobbies.footballDesc', 'hobbies.music', 'hobbies.musicDesc', 'hobbies.cars', 'hobbies.carsDesc', 'hobbies.peace', 'hobbies.peaceDesc', 'hobbies.problemSolving', 'hobbies.problemSolvingDesc']
  },
  'contact.html': {
    key: 'contact',
    contentKeys: ['contact.title', 'contact.socialMedia', 'contact.email', 'contact.phone', 'contact.linkedin', 'contact.github']
  }
};

// Obtiene un valor anidado de un objeto usando notación de punto (ej: "nav.home")
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && value[key] !== undefined) {
      value = value[key];
    } else {
      return '';
    }
  }
  return value;
}

// Carga el índice de búsqueda con el contenido de todas las páginas en el idioma especificado
async function loadSearchIndex(lang = 'es') {
  await loadTranslationsForSearch();
  
  if (!searchTranslations) {
    return;
  }
  
  currentSearchLang = lang;
  const t = searchTranslations[lang];
  
  // Construye el índice mapeando cada página con su contenido traducido
  searchIndex = Object.entries(PAGE_MAPPING).map(([url, config]) => {
    const content = config.contentKeys
      .map(key => getNestedValue(t, key))
      .filter(val => val)
      .join('. ');
    
    const title = getNestedValue(t.nav, config.key);
    const description = getNestedValue(t.meta, `${config.key}Description`);
    
    return {
      url,
      title,
      description,
      content: content || description
    };
  });
}

// Recarga el índice de búsqueda cuando cambia el idioma
async function reloadSearchIndex(lang) {
  searchIndex = null;
  await loadSearchIndex(lang);
}

// Normaliza el texto eliminando acentos y convirtiendo a minúsculas
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres acentuados
    .replace(/[\u0300-\u036f]/g, ''); // Elimina los signos diacríticos
}

// Busca el término en todas las páginas del índice y calcula la relevancia
function searchContent(query) {
  if (!searchIndex || !query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = normalizeText(query.trim());
  const results = [];

  searchIndex.forEach(page => {
    const searchableText = normalizeText(`${page.title} ${page.description} ${page.content}`);

    if (searchableText.includes(normalizedQuery)) {
      let relevance = 0;
      
      // Calcula relevancia según dónde se encuentre el término
      if (normalizeText(page.title).includes(normalizedQuery)) relevance += 10;
      if (normalizeText(page.description).includes(normalizedQuery)) relevance += 7;
      if (normalizeText(page.content).includes(normalizedQuery)) relevance += 5;

      results.push({
        url: page.url,
        title: page.title,
        description: page.description,
        excerpt: createExcerpt(page.content, query),
        relevance
      });
    }
  });

  // Ordena los resultados por relevancia (mayor a menor)
  return results.sort((a, b) => b.relevance - a.relevance);
}

// Crea un extracto del texto resaltando el término de búsqueda
function createExcerpt(text, query) {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  const index = normalizedText.indexOf(normalizedQuery);
  
  // Si no se encuentra el término, retorna los primeros 120 caracteres
  if (index === -1) {
    return text.substring(0, 120) + (text.length > 120 ? '...' : '');
  }

  // Extrae contexto alrededor del término encontrado
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 60);
  let excerpt = text.substring(start, end);
  
  // Agrega puntos suspensivos si es necesario
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  // Resalta el término de búsqueda con la etiqueta <mark>
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  excerpt = excerpt.replace(regex, '<mark>$1</mark>');
  
  return excerpt;
}

// Muestra los resultados de búsqueda en el contenedor del DOM
function displayResults(results, query) {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;

  const t = searchTranslations?.[currentSearchLang]?.search || { noResults: 'No se encontraron resultados para' };

  // Muestra mensaje si no hay resultados
  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        ${t.noResults} "${escapeHtml(query)}"
      </div>
    `;
    resultsContainer.classList.add('active');
    return;
  }

  // Genera el HTML de los resultados
  resultsContainer.innerHTML = results
    .map(result => `
      <div class="search-result-item" role="listitem" tabindex="0" data-url="${result.url}">
        <h3>${escapeHtml(result.title)}</h3>
        <p>${result.excerpt}</p>
        <div class="search-result-page">${result.url}</div>
      </div>
    `)
    .join('');

  // Agrega listeners de navegación a cada resultado
  const items = resultsContainer.querySelectorAll('.search-result-item');
  items.forEach(item => {
    const url = item.getAttribute('data-url');
    
    const navigate = () => window.location.href = url;
    
    item.addEventListener('click', navigate);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate();
      }
    });
  });

  resultsContainer.classList.add('active');
}

// Muestra el mensaje de carga mientras se prepara el índice
function showLoading(container) {
  const t = searchTranslations?.[currentSearchLang]?.search || { loading: 'Cargando índice...' };
  container.innerHTML = `<div class="search-loading">${t.loading}</div>`;
  container.classList.add('active');
}

// Oculta el contenedor de resultados
function hideResults(container) {
  container?.classList.remove('active');
}

// Escapa caracteres HTML para prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Función global para actualizar las traducciones cuando cambia el idioma
window.updateSearchTranslations = async function(lang) {
  currentSearchLang = lang;
  await reloadSearchIndex(lang);
  hideResults(document.getElementById('search-results'));
};

// Inicializa el sistema de búsqueda cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!searchInput) return;

  // Obtiene el idioma actual del sistema
  const currentLang = window.i18n?.getCurrentLanguage() || 'es';
  currentSearchLang = currentLang;

  let searchTimeout;
  let indexLoaded = false;

  // Listener para el input de búsqueda con debounce
  searchInput.addEventListener('input', async (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    // Oculta resultados si la búsqueda es muy corta
    if (query.length < 2) {
      hideResults(resultsContainer);
      return;
    }

    // Carga el índice la primera vez que se busca algo
    if (!indexLoaded && !searchIndex) {
      showLoading(resultsContainer);
      await loadSearchIndex(currentSearchLang);
      indexLoaded = true;
    }

    // Espera 300ms después del último input antes de buscar
    searchTimeout = setTimeout(() => {
      displayResults(searchContent(query), query);
    }, 300);
  });

  // Oculta resultados al hacer clic fuera del buscador
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer?.contains(e.target)) {
      hideResults(resultsContainer);
    }
  });

  // Manejo de teclas en el input de búsqueda
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideResults(resultsContainer);
      searchInput.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      resultsContainer?.querySelector('.search-result-item')?.focus();
    }
  });

  // Navegación con teclado en los resultados
  resultsContainer?.addEventListener('keydown', (e) => {
    const items = Array.from(resultsContainer.querySelectorAll('.search-result-item'));
    const current = items.indexOf(e.target);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (current <= 0 ? searchInput : items[current - 1])?.focus();
    } else if (e.key === 'Escape') {
      hideResults(resultsContainer);
      searchInput.focus();
    }
  });
});

