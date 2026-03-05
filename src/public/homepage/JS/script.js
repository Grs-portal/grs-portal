/*══✿════════╡°˖✧᯽   HOME PAGE JS ᯽✧˖°════════╡✿══*/

/*══✿══╡°˖✧᯽   HERO + SLOGAN SECTIONS ᯽✧˖°╞══✿══*/
const fullhero = document.querySelector(".parallax-hero");
const navbar = document.querySelector(".main-nav");
const sloganSection = document.getElementById("sloganSection");
const lineLeft = document.getElementById("lineLeft");
const lineRight = document.getElementById("lineRight");

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
  const nextBtn = document.querySelector(".next");
  const prevBtn = document.querySelector(".prev");

  if (slides.length > 0) {
    let current = 0;
    const AUTO_TIMEOUT = 10000; // 10 seconds
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

    if (nextBtn) nextBtn.addEventListener("click", () => { nextSlide(); resetAuto(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prevSlide(); resetAuto(); });

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
