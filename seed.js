// seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const dbURI = 'mongodb://127.0.0.1:27017/escobarvapedb';

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'branch manager'], required: true },
  branch: { type: String },
});


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

const Admin = mongoose.model('Admin', adminSchema);

const seedAdmins = async () => {
  try {
    await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    // Clear existing data
    await Admin.deleteMany({});

    // Create an array of admin and branch manager data
    const admins = [
      {
        name: 'Rodney Escobar',
        username: 'oddy',
        password: 'oddy',
        role: 'owner',
      },
      {
        name: 'Piolo Duran',
        username: 'piolo',
        password: 'piolo',
        role: 'branch manager',
        branch: '1st branch',
      },
      {
        name: 'Marc John Fabian',
        username: 'fabian',
        password: 'fabian',
        role: 'branch manager',
        branch: '2nd branch',
      },
      {
        name: 'Jannielle Tominio',
        username: 'nielle',
        password: 'nielle',
        role: 'branch manager',
        branch: '3rd branch',
      },
    ];

    // Hash passwords and save admins to the database
    for (let admin of admins) {
      admin.password = await bcrypt.hash(admin.password, 10); // Hash the password
      await Admin.create(admin);
    }

    console.log('Admins and branch managers seeded successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Execute the seeding function
seedAdmins();
