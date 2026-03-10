
document.addEventListener("DOMContentLoaded", function () {


/* ══✿══╡°˖✧᯽  ENGLISH TRANSLATION ᯽✧˖°╞══✿══ */

const translations = {
  en: {

// ... ✿°•∘ɷ∘•°✿ .. NAVIGATION ... ✿°•∘ɷ∘•°✿ ..

    "nav-home": "Home",    
    "nav-forwho": "For whom",    
    "nav-grs": "Recovery Academy",
    "nav-offer": "What we offer",
    "nav-about": "About Us",
    "nav-contact": "Contact",
    "Students": "Students",
    "Teachers": "Teachers",
    "col-com": "Company",
    "col-por": "Portals",
    "col-know": "Quick Links",
    "col-legal": "Legal",

// ... ✿°•∘ɷ∘•°✿ .. MISSION ... ✿°•∘ɷ∘•°✿ ..

    "slogan-l": "A place to catch your breath",
    "slogan-r": "and find direction again",
    "mission-p": "The Green Recovery Space at Hòfi Kòrsou offers a safe, natural place where people are given the space to recover, catch their breath, and find direction again. This is achieved through connecting with peers, accessible activities, and various learning opportunities.",
    "for-p": "Do you feel like you are stuck, for example, due to stress, mental overload, or loneliness? This can happen to anyone and is part of life.",
    "know-more": "Want to know more?",
    "believe-h": "What do we believe in?",
    "believe-p": "We believe in a society where people facing challenges in life can access support in a low-threshold and welcoming way, enabling them to regain balance.",
    "offer-h": "What do we offer?",
    "offer-p": "Support from people who understand what you are going through because they have had similar experiences.",
    

    "story-h": "Personal Stories",
    "story-p": "How do others work on their recovery?",



},

ned: {

// ... ✿°•∘ɷ∘•°✿ .. NAVIGATION ... ✿°•∘ɷ∘•°✿ ..

    "nav-home": "Home",    
    "nav-forwho": "Voor wie",    
    "nav-grs": "Herstelwerkplaats",
    "nav-offer": "Wat wij bieden",
    "nav-about": "Over ons",
    "nav-contact": "Contact",
    "Students": "Studenten",
    "Teachers": "Leerkracht",
    "col-com": "Bedrijf",
    "col-por": "Portalen",
    "col-know": "Snelle Links",
    "col-legal": "Legaal",

},


es: {

// ... ✿°•∘ɷ∘•°✿ .. NAVIGATION ... ✿°•∘ɷ∘•°✿ ..

    "nav-home": "Home",    
    "nav-forwho": "Para Quien",    
    "nav-grs": "Academia de recuperacion",
    "nav-offer": "Lo que ofrecemos",
    "nav-about": "Sobre nossotros",
    "nav-contact": "Contactos",
    "Students": "Estudiantes",
    "Teachers": "Instructores",
    "col-com": "Compania",
    "col-por": "Portales",
    "col-know": "Links",
    "col-legal": "Legal"

}

}


/* ══✿══╡°˖✧᯽  TRANSLATION FUNCTION ᯽✧˖°╞══✿══ */

function setLanguage(lang) {
  document.querySelectorAll("[data-translate]").forEach(el => {
    const key = el.dataset.translate;
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  document.querySelector(".lang-btn").textContent =
    lang.toUpperCase() + " ▾";

  localStorage.setItem("language", lang);
}

// ... ✿°•∘ɷ∘•°✿ .. Load saved language
const savedLang = localStorage.getItem("language") || "en";
setLanguage(savedLang);

// ... ✿°•∘ɷ∘•°✿ .. Dropdown click handling
document.querySelectorAll(".lang-menu li").forEach(item => {
  item.addEventListener("click", () => {
    setLanguage(item.dataset.lang);
  });
});

});
