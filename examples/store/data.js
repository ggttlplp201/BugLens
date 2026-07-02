// Shared product catalog.
// INVARIANT: products are stored in the order they were added,
// so the last element is always the newest product.
const products = [
  { id: 1, name: 'Desk Lamp', stock: 42 },
  { id: 2, name: 'Notebook', stock: 3 },
  { id: 3, name: 'Pen Set', stock: 17 },
  { id: 4, name: 'Monitor Stand', stock: 55 },
  { id: 5, name: 'Webcam', stock: 8 }, // newest — added last
];

module.exports = { products };
