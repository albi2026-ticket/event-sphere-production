(function () {
  "use strict";

  const STORAGE_KEY = "preferred_language";
  const DEFAULT_LANGUAGE = "en";
  const SUPPORTED_LANGUAGES = ["en", "sq"];
  const LOCALES = {
    en: "en_US",
    sq: "sq_AL",
  };
  const PUBLIC_BASE_URL = "https://tiketa.example";

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
    if (!key) return "";
    if (dictionary && Object.prototype.hasOwnProperty.call(dictionary, key)) {
      return dictionary[key];
    }
    return key
      .split(".")
      .reduce(
        (value, part) =>
          value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined,
        dictionary,
      );
  }

  function translate(key, replacements = {}) {
    const language = service.getLanguage();
    const value =
      resolveKey(dictionaries()[language], key) ??
      resolveKey(dictionaries()[DEFAULT_LANGUAGE], key) ??
      key;

    return String(value).replace(/\{(\w+)\}/g, (match, token) =>
      Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : match,
    );
  }

  function applyText(el) {
    const key = el.dataset.i18n;
    if (!key) return;
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = translate(key);
      return;
    }
    el.textContent = translate(key);
  }

  function applyAttributes(el) {
    const attrs = el.dataset.i18nAttr;
    if (!attrs) return;

    attrs
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [attr, key] = pair.split(":").map((part) => part.trim());
        if (attr && key) el.setAttribute(attr, translate(key));
      });
  }

  function updateSwitchers(root = document) {
    root.querySelectorAll("[data-language-switcher]").forEach((switcher) => {
      switcher.querySelectorAll("[data-language-option]").forEach((button) => {
        const isActive = button.dataset.languageOption === service.getLanguage();
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    });
  }

  function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(applyText);
    root.querySelectorAll("[data-i18n-attr]").forEach(applyAttributes);
    updateSwitchers(root);
    document.documentElement.lang = service.getLanguage();
    applyInternationalSeo();
  }

  function isNoindexPage() {
    const robots = document.querySelector('meta[name="robots"]')?.content || "";
    return /\bnoindex\b/i.test(robots);
  }

  function cleanPath(path = window.location.pathname) {
    const cleaned = String(path || "/")
      .replace(/^\/site\//, "/")
      .replace(/\.html$/, "")
      .replace(/\/index$/, "/events")
      .replace(/\/reservations$/, "/restaurants");

    if (cleaned === "/welcome") return "/";
    return cleaned || "/";
  }

  function publicOrigin() {
    try {
      const current = new URL(window.location.href);
      if (!["localhost", "127.0.0.1", "::1"].includes(current.hostname)) {
        return current.origin;
      }
    } catch {
      /* fall back to configured public base */
    }
    return PUBLIC_BASE_URL;
  }

  function absolutePublicUrl(path) {
    return new URL(cleanPath(path), publicOrigin()).href;
  }

  function canonicalPath() {
    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") || cleanPath();
    try {
      return cleanPath(new URL(canonical, publicOrigin()).pathname);
    } catch {
      return cleanPath(canonical);
    }
  }

  function setLink(rel, attrs) {
    const selector = attrs.hreflang
      ? `link[rel="${rel}"][hreflang="${attrs.hreflang}"]`
      : Object.entries(attrs).reduce(
          (query, [key, value]) => `${query}[${key}="${value}"]`,
          `link[rel="${rel}"]`,
        );
    let link = document.querySelector(selector);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
    return link;
  }

  function setMeta(selector, attr, value) {
    const content = String(value || "").trim();
    if (!content) return;
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      const [name, key] = attr;
      meta.setAttribute(name, key);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function updateJsonLdLanguage() {
    const language = service.getLanguage();
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "{}");
        const items = Array.isArray(data) ? data : [data];
        items.forEach((item) => {
          if (!item || typeof item !== "object") return;
          const type = Array.isArray(item["@type"]) ? item["@type"][0] : item["@type"];
          if (
            [
              "WebSite",
              "Event",
              "Restaurant",
              "LocalBusiness",
              "BreadcrumbList",
              "ItemList",
              "FAQPage",
            ].includes(type)
          ) {
            item.inLanguage = language;
          }
        });
        script.textContent = JSON.stringify(Array.isArray(data) ? items : items[0], null, 2);
      } catch {
        /* keep invalid or non-object structured data unchanged */
      }
    });
  }

  function applyInternationalSeo() {
    if (isNoindexPage()) return;

    const path = canonicalPath();
    const href = absolutePublicUrl(path);

    SUPPORTED_LANGUAGES.forEach((language) => {
      setLink("alternate", {
        hreflang: language,
        href,
      });
    });
    setLink("alternate", {
      hreflang: "x-default",
      href,
    });

    setMeta(
      'meta[property="og:locale"]',
      ["property", "og:locale"],
      LOCALES[service.getLanguage()] || LOCALES.en,
    );
    setMeta(
      'meta[property="og:locale:alternate"]',
      ["property", "og:locale:alternate"],
      service.getLanguage() === "en" ? LOCALES.sq : LOCALES.en,
    );
    updateJsonLdLanguage();
  }

  function switcherMarkup() {
    return `
      <div class="language-switcher" data-language-switcher aria-label="${translate("language.current")}">
        <button class="language-switcher-option" type="button" data-language-option="en" data-i18n="language.en_short" data-i18n-attr="aria-label:language.switch_to_english">EN</button>
        <span aria-hidden="true">|</span>
        <button class="language-switcher-option" type="button" data-language-option="sq" data-i18n="language.sq_short" data-i18n-attr="aria-label:language.switch_to_albanian">SQ</button>
      </div>
    `;
  }

  function ensureSwitcher(root = document) {
    root.querySelectorAll(".navbar .collapse > .d-flex.align-items-center").forEach((actions) => {
      if (actions.querySelector("[data-language-switcher]")) return;
      actions.insertAdjacentHTML("afterbegin", switcherMarkup());
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
      document.dispatchEvent(
        new CustomEvent("tiketa:language-changed", {
          detail: { language: currentLanguage },
        }),
      );
      return currentLanguage;
    },
    loadDictionaries() {
      return dictionaries();
    },
    translate,
    applyTranslations,
    ensureSwitcher,
    applyInternationalSeo,
  };

  let currentLanguage = readStoredLanguage();

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-language-option]");
    if (!button) return;
    service.setLanguage(button.dataset.languageOption);
  });

  document.addEventListener("DOMContentLoaded", () => {
    service.ensureSwitcher();
    service.applyInternationalSeo();
  });

  document.addEventListener("event-sphere:partials-loaded", () => {
    service.ensureSwitcher();
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("[data-i18n], [data-i18n-attr], [data-language-switcher]")) {
          service.applyTranslations(node.parentElement || document);
          return;
        }
        if (node.querySelector("[data-i18n], [data-i18n-attr], [data-language-switcher]")) {
          service.applyTranslations(node);
        }
      });
    });
  });

  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.TiketaLanguage = service;
  window.t = translate;
})();
