const express = require('express'); 
const mongoose = require('mongoose'); 
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt'); 
const cors = require('cors'); // Import CORS

const app = express(); 
app.use(cors()); // Enable CORS
app.use(express.json()); 

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/escobarvapedb', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the Admin schema
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'branch manager'], required: true },
  branch: { type: String },
});

const Admin = mongoose.model('Admin', adminSchema);

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
    enum: ['Order Received', 'Preparing', 'Ready for Pickup', 'Picked Up', 'Canceled'],
    default: 'Order Received', // Default status
  },
});

const Order = mongoose.model('Order', orderSchema);

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
});

const User = mongoose.model('User', UserSchema);

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Get token from headers
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, 'escobar', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });

    req.userId = decoded.id; // Save the user ID for later use
    req.role = decoded.role; // Save the role for later use
    next(); // Proceed to the next middleware or route
  });
};

const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });

  if (!admin || !await bcrypt.compare(password, admin.password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: admin._id, role: admin.role }, 'escobar', { expiresIn: '1h' });

  // Return the token and user data
  res.json({
    token,
    user: {
      name: admin.name,
      username: admin.username,
      role: admin.role,
    },
  });
};

// Routes
app.post('/api/auth/login', loginAdmin);
app.get('/api/protected-route', authenticate, (req, res) => {
  res.json({ message: 'This is a protected route', userId: req.userId, role: req.role });
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'items.product', // Populate the product field in items
        model: 'Product', // Reference the Product model
        select: 'name price' // Only select the necessary fields
      });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




// Get all products
app.get('/api/products', async (req, res) => {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (error) {
      res.status(500).send('Server error');
    }
  });
  
  app.post('/api/products', async (req, res) => {
    console.log('Request Body:', req.body); // Log the incoming request
    try {
      const { name, category, image, price, branches } = req.body;
      const newProduct = new Product({ name, category, image, price, branches });
      await newProduct.save();
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Error adding product:', error.message); // Log the specific error message
      res.status(500).send('Server error');
    }
  });
  
  
  
  // Delete a product
  app.delete('/api/products/:id', async (req, res) => {
    try {
      await Product.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).send('Server error');
    }
  });

// Get a product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  

// Update a product by ID
app.put('/api/products/:id', async (req, res) => {
    try {
      const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updatedProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(updatedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  


// Starting the server
const PORT = process.env.PORT || 5002; 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
