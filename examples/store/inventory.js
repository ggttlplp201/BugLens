// Inventory helpers.

// Returns the `count` products closest to running out.
// Read this function on its own — it looks completely correct.
function lowestStock(products, count) {
  const sorted = products.sort((a, b) => a.stock - b.stock);
  return sorted.slice(0, count);
}

module.exports = { lowestStock };
