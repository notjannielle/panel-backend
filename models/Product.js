const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: String,
  available: Boolean,
});

const branchSchema = new mongoose.Schema({
  main: [variantSchema],
  second: [variantSchema],
  third: [variantSchema],
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  branches: branchSchema,
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
