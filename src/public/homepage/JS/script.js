let text = document.getElementById('text');
let leaf = document.getElementById('leaf');
let hill1 = document.getElementById('hill1');
let hill4 = document.getElementById('hill4');
let hill5 = document.getElementById('hill5');
let house = document.getElementById('house');
let plant = document.getElementById('plant');
let blob1 = document.getElementById('blob1');
let blob2 = document.getElementById('blob2'); // FIXED
let blob3 = document.getElementById('blob3'); // FIXED
let missiontext1 = document.getElementById('missiontext1');
let missiontext2 = document.getElementById('missiontext2');


window.addEventListener('scroll', () => {
    let value = window.scrollY;

    /* -----------------------------------------
       HOME PARALLAX ANIMATIONS (already working)
    ------------------------------------------ */

    // House: move up + scale
    house.style.transform = `translateX(-50%) translateY(${-value * 0.2}px) scale(${1 + value * 0.001})`;

    // Home title text moves downward (centered)
    text.style.transform = `translateX(-50%) translateY(${value * 1.8}px)`;

    // Plant moves left
    plant.style.transform = `translateX(${-value * 0.09}px)`; 

    // Leaf moves right
    leaf.style.transform = `translateX(${value * 0.5}px)`;


    /* -----------------------------------------
       MISSION SECTION 
    ------------------------------------------ */
    // blob1 → slide right into view
    blob1.style.transform = `translateX(${value * 0.5}px)`;

    // mission text: → slides with blob1
    missiontext1.style.transform = `translateY(${-value * 0.4}px)`;

        // mission text: → slides with blob1
    missiontext2.style.transform = `translateY(${-value * 0.4}px)`;


    // blob2 → rise into view
    blob2.style.transform = `translateY(${-value * 0.4}px)`;

    // blob3 → slide left into view
    blob3.style.transform = `translateX(${-value * 0.3}px)`;



    $(document).ready(function() {



    });

});
