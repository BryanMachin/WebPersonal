let currentLang = 'es';
let translations = null;

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

function detectBrowserLanguage() {
  const savedLang = localStorage.getItem('language');
  if (savedLang) {
    return savedLang;
  }
  
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('en')) {
    return 'en';
  }
  
  return 'es';
}

function getTranslation(key, lang = currentLang) {
  const keys = key.split('.');
  let translation = translations[lang];
  
  for (const k of keys) {
    if (translation && translation[k]) {
      translation = translation[k];
    } else {
      return key;
    }
  }
  
  return translation;
}

function changeLanguage(lang) {
  if (!translations[lang]) {
    return;
  }
  
  currentLang = lang;
  localStorage.setItem('language', lang);
  
  document.documentElement.lang = lang;
  
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key, lang);
    
    const attr = element.getAttribute('data-i18n-attr');
    if (attr) {
      element.setAttribute(attr, translation);
    } else {
      if (element.tagName === 'INPUT' && element.type === 'search') {
        element.placeholder = translation;
      } else {
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
  
  if (typeof updateSearchTranslations === 'function') {
    updateSearchTranslations(lang);
  }
}

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

function updateLanguageSelector(lang) {
  const select = document.getElementById('language-select');
  if (select) {
    select.value = lang;
  }
}

async function initI18n() {
  await loadTranslations();
  
  if (!translations) {
    return;
  }
  
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      changeLanguage(e.target.value);
    });
  }
  
  changeLanguage(detectBrowserLanguage());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

window.i18n = {
  changeLanguage,
  getTranslation,
  getCurrentLanguage: () => currentLang
};

