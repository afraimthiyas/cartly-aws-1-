// Product images. By default they are the illustrations bundled in server/public/products, served by the API
// at /static/products/<slug>.svg, so the shop shows images with no internet and no third-party service.
// Run `SEED_IMAGES=remote npm run seed` to use LoremFlickr photos instead (?lock keeps the same photo each time).
const remote = process.env.SEED_IMAGES === "remote";
const img = (slug, keywords, n) =>
  remote ? `https://loremflickr.com/600/600/${keywords}?lock=${n}` : `/static/products/${slug}.svg`;
const products = [
  ["Classic Sneakers", "Everyday comfort sneakers.", 5999, img("classic-sneakers", "sneakers,shoes", 1), "Shoes"],
  ["Leather Backpack", "Roomy backpack for work and travel.", 8900, img("leather-backpack", "backpack,leather", 2), "Bags"],
  ["Wireless Headphones", "Noise-reducing over-ear headphones.", 12900, img("wireless-headphones", "headphones", 3), "Electronics"],
  ["Smart Watch", "Track steps, sleep and notifications.", 14900, img("smart-watch", "smartwatch", 4), "Electronics"],
  ["Ceramic Mug", "Handmade 350ml mug.", 1500, img("ceramic-mug", "coffee,mug", 5), "Home"],
  ["Sunglasses", "UV400 polarized lenses.", 3500, img("sunglasses", "sunglasses", 6), "Accessories"],
  ["Desk Lamp", "Dimmable LED lamp.", 2800, img("desk-lamp", "desk,lamp", 7), "Home"],
  ["Water Bottle", "Insulated steel bottle, 750ml.", 2200, img("water-bottle", "water,bottle", 8), "Home"],
];
module.exports = products;
