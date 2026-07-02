// Run me: node app.js
const { products } = require('./data');
const { lowestStock } = require('./inventory');

console.log(
  'Restock soon:',
  lowestStock(products, 2).map(p => p.name).join(', ')
);

// Relies on the catalog invariant: last element = newest product.
const newest = products[products.length - 1];
console.log('Newest product:', newest.name);
// Expected: Newest product: Webcam
// Actual:   Newest product: Monitor Stand
//
// Nothing in THIS file is wrong, and nothing in inventory.js looks wrong
// on its own either. Highlight the body of lowestStock() in inventory.js
// and ask BugLens why this file misbehaves.
