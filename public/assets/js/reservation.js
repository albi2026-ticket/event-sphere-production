/* =========================================================
   Event Sphere — Reservations: venue data + grid renderer
   ========================================================= */
(function () {
  const venues = [
    { name: "Aurora Rooftop", cat: "Modern European", city: "London", rating: 4.9, desc: "Candle-lit skyline dining with a weekly tasting menu and 240-bottle cellar.", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80", today: true },
    { name: "Maison Lumière", cat: "French Bistro", city: "Paris", rating: 4.8, desc: "Old-world bistro reborn — duck confit, natural wines, and live piano on weekends.", img: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80", today: true },
    { name: "Sakura Omakase", cat: "Japanese · Omakase", city: "Tokyo", rating: 5.0, desc: "12-seat counter helmed by Chef Tanaka. Reservations open 60 days ahead.", img: "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800&q=80", today: false },
    { name: "Casa del Sol", cat: "Spanish Tapas", city: "Barcelona", rating: 4.7, desc: "Charcoal-fired tapas, sherry flights and a sun-drenched courtyard terrace.", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", today: true },
    { name: "The Velvet Room", cat: "Cocktail Bar", city: "New York", rating: 4.8, desc: "Speakeasy hidden behind a brass door. Reservations recommended after 9PM.", img: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80", today: true },
    { name: "Skyline 47", cat: "Rooftop Lounge", city: "Dubai", rating: 4.6, desc: "Open-air lounge with city panoramas, DJ sets and a smoke-paired cocktail list.", img: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80", today: true },
    { name: "Olive & Oak", cat: "Mediterranean", city: "Athens", rating: 4.7, desc: "Whole-fish grills, hand-pressed olive oils and a hilltop view of the Acropolis.", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80", today: true },
    { name: "Noir Speakeasy", cat: "Whisky Bar", city: "Edinburgh", rating: 4.9, desc: "Hidden whisky vault — 600 bottles, leather booths, no phones policy.", img: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80", today: false },
    { name: "Brasa Steakhouse", cat: "Steakhouse", city: "São Paulo", rating: 4.8, desc: "Dry-aged cuts over an open flame. Sommelier-curated South American wines.", img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80", today: true },
    { name: "Lotus Garden", cat: "Vietnamese", city: "Berlin", rating: 4.5, desc: "Modern Vietnamese in a leafy courtyard — wood-fired pho and pandan desserts.", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80", today: true },
    { name: "Indigo Jazz Club", cat: "Live Jazz", city: "New Orleans", rating: 4.9, desc: "Nightly quartets and Creole small plates in a 1920s ballroom.", img: "https://images.unsplash.com/photo-1485872299712-79d10c3e6e8c?w=800&q=80", today: true },
    { name: "The Florist", cat: "Garden Bar", city: "Melbourne", rating: 4.6, desc: "Botanical cocktails served in a glasshouse filled with seasonal blooms.", img: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80", today: true }
  ];

  function card(v) {
    return `
    <div class="col-lg-3 col-md-6">
      <a class="text-decoration-none" href="venue.html">
        <article class="venue-card">
          <div class="img-wrap">
            <img src="${v.img}" alt="${v.name}" loading="lazy" />
            <div class="badges">
              ${v.today ? '<span class="chip-available">Available today</span>' : '<span class="chip-available" style="background:rgba(245,158,11,.14);color:#fcd34d;border-color:rgba(245,158,11,.35)">Booking fast</span>'}
              <span class="fav"><i class="bi bi-heart"></i></span>
            </div>
          </div>
          <div class="body">
            <div class="d-flex justify-content-between gap-2">
              <h3 class="title m-0">${v.name}</h3>
              <span class="rating"><i class="bi bi-star-fill"></i> ${v.rating}</span>
            </div>
            <div class="meta"><span>${v.cat}</span><span class="dot"></span><span><i class="bi bi-geo-alt"></i> ${v.city}</span></div>
            <p class="desc m-0">${v.desc}</p>
            <div class="footer-row">
              <span class="small text-muted-pro"><i class="bi bi-clock text-gold"></i> Tonight from 7:00 PM</span>
              <span class="btn btn-gold btn-sm">Reserve</span>
            </div>
          </div>
        </article>
      </a>
    </div>`;
  }

  function fill(id, arr) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = arr.map(card).join("");
  }

  // Shuffle helper for variety
  const shuf = (a) => [...a].sort(() => Math.random() - 0.5);

  fill("featuredGrid",  shuf(venues).slice(0, 4));
  fill("popularGrid",   shuf(venues).slice(0, 4));
  fill("barsGrid",      venues.filter(v => /Bar|Lounge|Jazz|Whisky/i.test(v.cat)).slice(0, 4));
  fill("trendingGrid",  shuf(venues).slice(0, 4));
  fill("newGrid",       shuf(venues).slice(0, 4));
  fill("nearbyGrid",    shuf(venues).slice(0, 4));
})();
