const express = require('express'); 
const mongoose = require('mongoose'); 
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt'); 
const cors = require('cors'); // Import CORS
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express(); 
app.use(cors()); // Enable CORS
app.use(express.json()); 
const isProduction = process.env.NODE_ENV === 'production';


// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp as filename
  },
});
const upload = multer({ storage });


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
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, 'escobar', (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ message: 'Forbidden' });
    }

    console.log('Decoded token:', decoded); // Log the decoded token

    req.userId = decoded.id;
    req.role = decoded.role; // Ensure this is set correctly
    req.branch = decoded.branch; // Ensure this is set correctly

    next();
  });
};


const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });

  if (!admin || !await bcrypt.compare(password, admin.password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: admin._id, role: admin.role, branch: admin.branch }, // Include branch
    'escobar',
    { expiresIn: '90d' }
  );

  // Return the token and user data
  res.json({
    token,
    user: {
      name: admin.name,
      username: admin.username,
      role: admin.role,
      branch: admin.branch // Include branch in the response
    },
  });
};





// Routes
app.post('/api/auth/login', loginAdmin);
app.get('/api/protected-route', authenticate, (req, res) => {
  res.json({ message: 'This is a protected route', userId: req.userId, role: req.role });
});

app.get('/api/orders', authenticate, async (req, res) => {
  try {
    let orders;

    // Check the user's role
    if (req.role === 'owner') {
      // Owner can see all orders
      orders = await Order.find().populate({
        path: 'items.product',
        model: 'Product',
        select: 'name price'
      });
    } else if (req.role === 'branch manager') {
      // Branch manager can only see orders for their branch
      orders = await Order.find({ 'branch': req.branch }).populate({
        path: 'items.product',
        model: 'Product',
        select: 'name price'
      });
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//IMAGE UPLOAD
// API endpoint for image upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.log('No file received');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  console.log('File received:', req.file); // Log the received file

  const imageUrl = `https://order-api.escobarvapecartel.com/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Serve the uploaded images
app.use('/uploads', express.static('uploads')); // Serve files from the uploads directory






//CREATE BACKUP  RESTORE
app.get('/api/products/backup', async (req, res) => {
  try {
    const products = await Product.find();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=products_backup.json');
    res.send(JSON.stringify(products));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/api/products/restore', upload.single('file'), async (req, res) => {
  try {
    const productsData = require(`./uploads/${req.file.filename}`); // Adjust the path based on your setup

    await Product.deleteMany({}); // Clear existing products
    await Product.insertMany(productsData); // Restore from backup

    res.json({ message: 'Products restored successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create Backup for Orders
// Create Backup for Orders
app.get('/api/orders/backup', authenticate, async (req, res) => {
  try {
    const orders = await Order.find().populate({
      path: 'items.product',
      model: 'Product',
      select: 'name price'
    }).select('-__v'); // Exclude version key if not needed

    // Include the branch field at the order level
    const ordersWithBranch = orders.map(order => ({
      ...order.toObject(),
      branch: order.branch // Add branch here
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_backup.json');
    res.send(JSON.stringify(ordersWithBranch));
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Restore Orders
// Restore Orders
app.post('/api/orders/restore', authenticate, upload.single('file'), async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const ordersData = JSON.parse(fs.readFileSync(filePath));

    // Clear existing orders
    await Order.deleteMany({}); 

    // Iterate through orders and ensure branch is set correctly
    const ordersToRestore = ordersData.map(order => {
      const orderWithBranch = {
        ...order,
        branch: order.items[0]?.branch // Set branch from the first item
      };
      return orderWithBranch;
    });

    // Restore from backup
    await Order.insertMany(ordersToRestore);

    res.json({ message: 'Orders restored successfully' });
  } catch (error) {
    console.error('Error restoring orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




// Update order status
app.put('/api/orders/:id/status', authenticate, async (req, res) => {
  const { status } = req.body; // Get the new status from the request body
  const validStatuses = ['Order Received', 'Preparing', 'Ready for Pickup', 'Picked Up', 'Canceled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/orders/order-number/:orderNumber/status', authenticate, async (req, res) => {
  const { status } = req.body; // Get the status from the body

  const validStatuses = ['Order Received', 'Preparing', 'Ready for Pickup', 'Picked Up', 'Canceled'];

  // Validate the new status
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    // Correctly find the order using orderNumber
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update the status
    order.status = status;
    await order.save(); // Save the changes to the database

    res.json(order); // Return the updated order
  } catch (error) {
    console.error('Error updating order status:', error);
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
