const mongoose = require('mongoose');

// Define the order schema
const orderSchema = new mongoose.Schema({
  user: {
    name: { type: String, required: true },
    contact: { type: String, required: true },
  },
  branch: { type: String, required: true }, // New field for branch at the order level
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    branch: { type: String, required: true }, // Retained branch for each variant
  }],
  total: { type: Number, required: true },
  orderNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ['Order Received', 'Preparing', 'Ready for Pickup', 'Picked Up', 'Canceled'],
    default: 'Order Received', // Default status
  },
});

// Middleware to validate that all items belong to the same branch
orderSchema.pre('validate', function(next) {
  if (this.items.length > 0) {
    const firstBranch = this.items[0].branch; // Get the branch from the first item
    const allSameBranch = this.items.every(item => item.branch === firstBranch);
    
    if (!allSameBranch) {
      return next(new Error('All items must belong to the same branch.'));
    }

    // Also ensure that the order's branch matches the items' branch
    this.branch = firstBranch; // Set order branch to match items' branch
  }
  next();
});

// Create the Order model from the schema
const Order = mongoose.model('Order', orderSchema);

// Export the Order model
module.exports = Order;