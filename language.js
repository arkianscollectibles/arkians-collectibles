/* =========================================
   ARKIANS LANGUAGE SYSTEM
========================================= */

document.addEventListener("DOMContentLoaded", () => {

  const translations = window.ARKIANS_TRANSLATIONS;

  if (!translations) return;


  function getLanguage() {
    return localStorage.getItem("arkians-language") || "en";
  }


  function applyLanguage(language) {

    document.documentElement.lang = language;


    /* TRANSLATE ELEMENTS */

    document.querySelectorAll("[data-i18n]").forEach((element) => {

      const key = element.dataset.i18n;

      if (translations[language]?.[key]) {
        element.textContent = translations[language][key];
      }

    });


    /* UPDATE LANGUAGE BUTTONS */

    document.querySelectorAll(".language-switch").forEach((button) => {

      button.textContent =
        language === "en"
          ? "EN / GR"
          : "GR / EN";

    });


    /* MOBILE DRAWER TITLE */

    const mainNav = document.querySelector(".main-nav");

    if (mainNav) {
      mainNav.setAttribute(
        "data-drawer-title",
        translations[language].nav_products
      );
    }

  }


  /* LANGUAGE BUTTON CLICK */

  document.querySelectorAll(".language-switch").forEach((button) => {

    button.addEventListener("click", () => {

      const currentLanguage = getLanguage();

      const newLanguage =
        currentLanguage === "en"
          ? "el"
          : "en";

      localStorage.setItem(
        "arkians-language",
        newLanguage
      );

      applyLanguage(newLanguage);

    });

  });


  /* APPLY SAVED LANGUAGE */

  applyLanguage(getLanguage());

});