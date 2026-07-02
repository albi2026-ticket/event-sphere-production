(function () {
  'use strict';

  const STORAGE_KEY = 'preferred_language';
  const DEFAULT_LANGUAGE = 'en';
  const SUPPORTED_LANGUAGES = ['en', 'sq'];

  function dictionaries() {
    return window.TiketaDictionaries || {};
  }

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  }

  function readStoredLanguage() {
    try {
      return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  function writeStoredLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* Preference persistence is best effort when storage is unavailable. */
    }
  }

  function resolveKey(dictionary, key) {
    if (!key) return '';
    if (dictionary && Object.prototype.hasOwnProperty.call(dictionary, key)) {
      return dictionary[key];
    }
    return key.split('.').reduce((value, part) => (
      value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined
    ), dictionary);
  }

  function translate(key, replacements = {}) {
    const language = service.getLanguage();
    const value = resolveKey(dictionaries()[language], key)
      ?? resolveKey(dictionaries()[DEFAULT_LANGUAGE], key)
      ?? key;

    return String(value).replace(/\{(\w+)\}/g, (match, token) => (
      Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : match
    ));
  }

  function applyText(el) {
    const key = el.dataset.i18n;
    if (!key) return;
    if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = translate(key);
      return;
    }
    el.textContent = translate(key);
  }

  function applyAttributes(el) {
    const attrs = el.dataset.i18nAttr;
    if (!attrs) return;

    attrs.split(',').map((item) => item.trim()).filter(Boolean).forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      if (attr && key) el.setAttribute(attr, translate(key));
    });
  }

  function updateSwitchers(root = document) {
    root.querySelectorAll('[data-language-switcher]').forEach((switcher) => {
      switcher.querySelectorAll('[data-language-option]').forEach((button) => {
        const isActive = button.dataset.languageOption === service.getLanguage();
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
    });
  }

  function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(applyText);
    root.querySelectorAll('[data-i18n-attr]').forEach(applyAttributes);
    updateSwitchers(root);
    document.documentElement.lang = service.getLanguage();
  }

  function switcherMarkup() {
    return `
      <div class="language-switcher" data-language-switcher aria-label="${translate('language.current')}">
        <button class="language-switcher-option" type="button" data-language-option="en" data-i18n="language.en_short" data-i18n-attr="aria-label:language.switch_to_english">EN</button>
        <span aria-hidden="true">|</span>
        <button class="language-switcher-option" type="button" data-language-option="sq" data-i18n="language.sq_short" data-i18n-attr="aria-label:language.switch_to_albanian">SQ</button>
      </div>
    `;
  }

  function ensureSwitcher(root = document) {
    root.querySelectorAll('.navbar .collapse > .d-flex.align-items-center').forEach((actions) => {
      if (actions.querySelector('[data-language-switcher]')) return;
      actions.insertAdjacentHTML('afterbegin', switcherMarkup());
    });
    applyTranslations(root);
  }

  const service = {
    getLanguage() {
      return currentLanguage;
    },
    setLanguage(language) {
      const nextLanguage = normalizeLanguage(language);
      if (nextLanguage === currentLanguage) {
        applyTranslations();
        return currentLanguage;
      }

      currentLanguage = nextLanguage;
      writeStoredLanguage(currentLanguage);
      applyTranslations();
      document.dispatchEvent(new CustomEvent('tiketa:language-changed', {
        detail: { language: currentLanguage },
      }));
      return currentLanguage;
    },
    loadDictionaries() {
      return dictionaries();
    },
    translate,
    applyTranslations,
    ensureSwitcher,
  };

  let currentLanguage = readStoredLanguage();

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-language-option]');
    if (!button) return;
    service.setLanguage(button.dataset.languageOption);
  });

  document.addEventListener('DOMContentLoaded', () => {
    service.ensureSwitcher();
  });

  document.addEventListener('event-sphere:partials-loaded', () => {
    service.ensureSwitcher();
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('[data-i18n], [data-i18n-attr], [data-language-switcher]')) {
          service.applyTranslations(node.parentElement || document);
          return;
        }
        if (node.querySelector('[data-i18n], [data-i18n-attr], [data-language-switcher]')) {
          service.applyTranslations(node);
        }
      });
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.TiketaLanguage = service;
  window.t = translate;
})();
