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
        name: 'First Branch Manager',
        username: 'first',
        password: '@escobarvape1',
        role: 'branch manager',
        branch: 'main',
      },
      {
        name: 'Second Branch Manager',
        username: 'second',
        password: '@escobarvape2',
        role: 'branch manager',
        branch: 'second',
      },
      {
        name: 'Third Branch Manager',
        username: 'third',
        password: '@escobarvape3',
        role: 'branch manager',
        branch: 'third',
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
