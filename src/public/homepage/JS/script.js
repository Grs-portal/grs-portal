/*══✿════════╡°˖✧᯽   HOME PAGE JS ᯽✧˖°════════╡✿══*/

/*══✿══╡°˖✧᯽   HERO + SLOGAN SECTIONS ᯽✧˖°╞══✿══*/
const fullhero = document.querySelector(".parallax-hero");
const navbar = document.querySelector(".main-nav");
const sloganSection = document.getElementById("sloganSection");
const lineLeft = document.getElementById("lineLeft");
const lineRight = document.getElementById("lineRight");
const texthero = document.getElementById('text');

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  const navbarHeight = navbar.offsetHeight;

  /*══✿══╡°˖✧᯽   HERO PARALLAX ᯽✧˖°╞══✿══*/
  let value = Math.max(scrollY - navbarHeight, 0);
  const isMobile = window.innerWidth < 868;
  const maxMove = isMobile ? 60 : 120;
  const maxScale = isMobile ? 1.12 : 1.30;
  const move = Math.min(value * 0.1, maxMove);
  const scale = Math.min(1 + value * 0.001, maxScale);
  fullhero.style.transform = `translateY(${-move}px) scale(${scale})`;


  /*══✿══╡°˖✧᯽   SLOGAN LINES ᯽✧˖°╞══✿══*/
  if (lineLeft && lineRight) {
    const progress = Math.min(scrollY / 300, 1); // adjust 300px for effect
    const offsetY = isMobile ? 30 * (1 - progress) : 0;
    const opacity = progress;

    lineLeft.style.transform = `translateY(${offsetY}px)`;
    lineRight.style.transform = `translateY(${offsetY}px)`;
    lineLeft.style.opacity = opacity;
    lineRight.style.opacity = opacity;
  }
});

/*══✿══╡°˖✧᯽   ANNOUNCEMENTS SECTION ᯽✧˖°╞══✿══*/
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".announcement-slide");
  const nextBtn = document.querySelector(".announcement-next");
  const prevBtn = document.querySelector(".announcement-prev");

  if (slides.length > 0) {
    let current = 0;
    const AUTO_TIMEOUT = 10000;
    let autoInterval = null;

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.style.display = i === index ? "grid" : "none";
      });
    }

    function nextSlide() {
      current = (current + 1) % slides.length;
      showSlide(current);
    }

    function prevSlide() {
      current = (current - 1 + slides.length) % slides.length;
      showSlide(current);
    }

    function startAuto() {
      autoInterval = setInterval(nextSlide, AUTO_TIMEOUT);
    }

    function resetAuto() {
      clearInterval(autoInterval);
      startAuto();
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        nextSlide();
        resetAuto();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        prevSlide();
        resetAuto();
      });
    }

    showSlide(current);
    startAuto();
  }
});

/*══✿══╡°˖✧᯽   MOBILE NAV BAR ᯽✧˖°╞══✿══*/
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger-btn");
  const mobileMenu = document.querySelector(".mobile-menu");

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      mobileMenu.classList.toggle("active");
    });
  }
});


/*══✿══╡°˖✧᯽   MOBILE GRS ABOUT CARDS CAROUSEL ᯽✧˖°╞══✿══*/


document.addEventListener("DOMContentLoaded", function(){

  if(window.innerWidth > 850) return;

  const container = document.querySelector(".cards-cillinder-grs");
  const cards = Array.from(document.querySelectorAll(".about-cards"));
  const next = document.querySelector(".carousel-arrow.right");
  const prev = document.querySelector(".carousel-arrow.left");

  let index = 1; // start at first real card

  // clone first and last
  const firstClone = cards[0].cloneNode(true);
  const lastClone = cards[cards.length - 1].cloneNode(true);

  container.appendChild(firstClone);
  container.insertBefore(lastClone, container.firstChild);

  const cardWidth = cards[0].offsetWidth + 20;
  container.scrollLeft = cardWidth * index;

  let isSliding = false;

  function goToCard(i){
    if(isSliding) return;
    isSliding = true;

    container.scrollTo({
      left: cardWidth * i,
      behavior: "smooth"
    });

    setTimeout(() => {
      // seamless loop jump
      if(i === 0){ // jumped to lastClone
        container.style.scrollBehavior = 'auto'; // disable animation
        container.scrollLeft = cardWidth * cards.length;
        index = cards.length;
        container.style.scrollBehavior = 'smooth'; // restore animation
      } else if(i === cards.length + 1){ // jumped to firstClone
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = cardWidth * 1;
        index = 1;
        container.style.scrollBehavior = 'smooth';
      } else {
        index = i;
      }

      isSliding = false;
    }, 350); // match smooth scroll duration
  }

  function nextCard(){ goToCard(index + 1); }
  function prevCard(){ goToCard(index - 1); }

  next.addEventListener("click", nextCard);
  prev.addEventListener("click", prevCard);

  setInterval(nextCard, 4000);
});


/*══✿══╡°˖✧᯽   MOBILE ABOUT CARDS CAROUSEL ᯽✧˖°╞══✿══*/

document.addEventListener("DOMContentLoaded", function() {

  if (window.innerWidth > 850) return; // only mobile

  const container = document.querySelector(".cards-cillinder-about");
  const cards = Array.from(document.querySelectorAll(".about-cards"));
  const next = document.querySelector(".about-cards-c .carousel-arrow.right");
  const prev = document.querySelector(".about-cards-c .carousel-arrow.left");

  if (!container || cards.length === 0) return;

  let index = 1; // start at first real card

  // Clone first and last for seamless loop
  const firstClone = cards[0].cloneNode(true);
  const lastClone = cards[cards.length - 1].cloneNode(true);

  container.appendChild(firstClone);
  container.insertBefore(lastClone, container.firstChild);

  const cardWidth = cards[0].offsetWidth + 20; // adjust spacing if needed
  container.scrollLeft = cardWidth * index;

  let isSliding = false;

  function goToCard(i) {
    if (isSliding) return;
    isSliding = true;

    container.scrollTo({
      left: cardWidth * i,
      behavior: "smooth"
    });

    setTimeout(() => {
      // seamless jump
      if (i === 0) {
        container.style.scrollBehavior = "auto";
        container.scrollLeft = cardWidth * cards.length;
        index = cards.length;
        container.style.scrollBehavior = "smooth";
      } else if (i === cards.length + 1) {
        container.style.scrollBehavior = "auto";
        container.scrollLeft = cardWidth * 1;
        index = 1;
        container.style.scrollBehavior = "smooth";
      } else {
        index = i;
      }

      isSliding = false;
    }, 350); // match smooth scroll duration
  }

  function nextCard() { goToCard(index + 1); }
  function prevCard() { goToCard(index - 1); }

  next.addEventListener("click", nextCard);
  prev.addEventListener("click", prevCard);

  setInterval(nextCard, 4000); // auto-slide every 4s
});
