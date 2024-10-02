const mongoose = require('mongoose');

// Define the order schema
const orderSchema = new mongoose.Schema({
  user: {
    name: { type: String, required: true },
    contact: { type: String, required: true },
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    branch: { type: String, required: true },
  }],
  total: { type: Number, required: true },
  orderNumber: { type: String, required: true },
  status: {
    type: String,
    enum: [ 'Order Received', 'Preparing', 'Ready for Pickup', 'Picked Up', 'Canceled'],
    default: 'Order Received', // Default status
  },
});

// Create the Order model from the schema
const Order = mongoose.model('Order', orderSchema);

// Export the Order model
module.exports = Order;
