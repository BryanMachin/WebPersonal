// Variables globales del sistema de internacionalización
let currentLang = 'es'; // Idioma activo en la página
let translations = null; // Objeto con todas las traducciones cargadas

// Carga las traducciones desde el archivo JSON
async function loadTranslations() {
  try {
    const response = await fetch('translations.json');
    if (!response.ok) {
      throw new Error('No se pudieron cargar las traducciones');
    }
    translations = await response.json();
    return translations;
  } catch (error) {
    return null;
  }
}

// Detecta el idioma del navegador o recupera el guardado
function detectBrowserLanguage() {
  // Prioriza el idioma guardado en localStorage
  const savedLang = localStorage.getItem('language');
  if (savedLang) {
    return savedLang;
  }
  
  // Detecta el idioma del navegador
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('en')) {
    return 'en';
  }
  
  return 'es'; // Idioma por defecto
}

// Obtiene una traducción usando notación de punto (ej: "nav.home")
function getTranslation(key, lang = currentLang) {
  const keys = key.split('.');
  let translation = translations[lang];
  
  // Navega por el objeto de traducciones siguiendo la ruta de claves
  for (const k of keys) {
    if (translation && translation[k]) {
      translation = translation[k];
    } else {
      return key; // Retorna la clave si no encuentra la traducción
    }
  }
  
  return translation;
}

// Cambia el idioma de toda la página y actualiza todos los elementos traducibles
function changeLanguage(lang) {
  if (!translations[lang]) {
    return;
  }
  
  currentLang = lang;
  localStorage.setItem('language', lang); // Guarda la preferencia del usuario
  
  document.documentElement.lang = lang; // Actualiza el atributo lang del HTML
  
  // Traduce todos los elementos con el atributo data-i18n
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key, lang);
    
    // Si tiene data-i18n-attr, traduce ese atributo específico
    const attr = element.getAttribute('data-i18n-attr');
    if (attr) {
      element.setAttribute(attr, translation);
    } else {
      // Manejo especial para inputs de búsqueda
      if (element.tagName === 'INPUT' && element.type === 'search') {
        element.placeholder = translation;
      } else {
        // Preserva iconos al traducir el texto
        const icon = element.querySelector('i');
        if (icon) {
          element.innerHTML = '';
          element.appendChild(icon.cloneNode(true));
          element.innerHTML += ' ' + translation;
        } else {
          element.textContent = translation;
        }
      }
    }
  });
  
  updateMetaTags(lang);
  updateLanguageSelector(lang);
  
  // Actualiza el índice de búsqueda si está disponible
  if (typeof updateSearchTranslations === 'function') {
    updateSearchTranslations(lang);
  }
}

// Actualiza las etiquetas meta del documento (título y descripción)
function updateMetaTags(lang) {
  const page = document.body.getAttribute('data-page');
  if (page) {
    const titleKey = `meta.${page}Title`;
    const descKey = `meta.${page}Description`;
    
    document.title = getTranslation(titleKey, lang);
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = getTranslation(descKey, lang);
    }
  }
}

// Actualiza el valor del selector de idiomas en la UI
function updateLanguageSelector(lang) {
  const select = document.getElementById('language-select');
  if (select) {
    select.value = lang;
  }
}

// Inicializa el sistema de internacionalización
async function initI18n() {
  await loadTranslations();
  
  if (!translations) {
    return;
  }
  
  // Configura el listener del selector de idiomas
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      changeLanguage(e.target.value);
    });
  }
  
  // Aplica el idioma detectado o guardado
  changeLanguage(detectBrowserLanguage());
}

// Ejecuta la inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

// Exporta funciones públicas al objeto global window
window.i18n = {
  changeLanguage,
  getTranslation,
  getCurrentLanguage: () => currentLang
};

