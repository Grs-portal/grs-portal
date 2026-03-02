let text = document.getElementById('text');
let leaf = document.getElementById('leaf');
let hill1 = document.getElementById('hill1');
let hill4 = document.getElementById('hill4');
let hill5 = document.getElementById('hill5');
let house = document.getElementById('house');
let plant = document.getElementById('plant');
let blob1 = document.getElementById('blob1');
let blob2 = document.getElementById('blob2'); 
let blob3 = document.getElementById('blob3'); 
let missiontext = document.getElementById('missiontext');
let boxleft = document.getElementById('boxleft');
let boxcenter = document.getElementById('boxcenter');
let boxright = document.getElementById('boxright');


window.addEventListener('scroll', () => {
    let value = window.scrollY;

    /* ══✿══╡°˖✧᯽   HOME PARALLAX ANIMATIONS (already working) ᯽✧˖°╞══✿══*/

    // ... ✿°•∘ɷ∘•°✿ .. House: move up + scale
    house.style.transform = `translateX(-50%) translateY(${-value * 0.2}px) scale(${1 + value * 0.001})`;

    // ... ✿°•∘ɷ∘•°✿ .. Home title text moves downward (centered)
    text.style.transform = `translateX(-50%) translateY(${value * 1.8}px)`;

    // ... ✿°•∘ɷ∘•°✿ .. Plant moves left
    plant.style.transform = `translateX(${-value * 0.09}px)`; 

    // ... ✿°•∘ɷ∘•°✿ .. Leaf moves right
    leaf.style.transform = `translateX(${value * 0.5}px)`;


    /*══✿══╡°˖✧᯽   MISSION SECTION ᯽✧˖°╞══✿══*/
    
    const sloganSection = document.getElementById("sloganSection");
    const lineLeft = document.getElementById("lineLeft");
    const lineRight = document.getElementById("lineRight");

    window.addEventListener("scroll", () => {
      const rect = sloganSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const progress = Math.min(
        Math.max((windowHeight - rect.top) / windowHeight, 0),
        1
      );

      const moveAmount = 120; //  ... ✿°•∘ɷ∘•°✿ .. how far they slide in

      lineLeft.style.transform = `translateX(${-(1 - progress) * moveAmount}px)`;
      lineRight.style.transform = `translateX(${(1 - progress) * moveAmount}px)`;
    });

    // ... ✿°•∘ɷ∘•°✿ .. blob1 → slide right into view
    blob1.style.transform = `translateX(${value * 0.4}px)`;


    // ... ✿°•∘ɷ∘•°✿ .. blob2 → rise into view
    blob2.style.transform = `translateY(${-value * 0.4}px)`;

    // blob3 → slide left into view
    blob3.style.transform = `translateX(${-value * 0.3}px)`;





    

//  ... ✿°•∘ɷ∘•°✿ .. mission 

});$(document).ready(function() {
  var $owl = $('.owl-carousel');

  $owl.children().each(function(index) {
    $(this).attr('data-position', index);
  });

  $owl.owlCarousel({
    center: true,
    loop: true,
    items: 1,              //  ... ✿°•∘ɷ∘•°✿ .. 1 main visible card
    margin: 10,
    autoplay: true,
    autoplayTimeout: 2500,
    autoplayHoverPause: true,
    smartSpeed: 600,
    stagePadding: 60,      //  ... ✿°•∘ɷ∘•°✿ .. <-- THIS MAKES SIDE CARDS VISIBLE
    responsive: {
      0: { items: 1, stagePadding: 40 },
      480: { items: 1, stagePadding: 60 },
      768: { items: 3, stagePadding: 0 }  //  ... ✿°•∘ɷ∘•°✿ .. desktop/tablet
    }
  });

  $(document).on('click', '.owl-item>div', function() {
    var speed = 300;
    $owl.trigger('to.owl.carousel', [$(this).data('position'), speed]);
  });
});


const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navMenu.classList.toggle('active');
});



