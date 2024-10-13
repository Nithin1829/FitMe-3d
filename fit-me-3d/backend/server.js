const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const MONGO_URI = "mongodb+srv://anaparthinithin1829:kmW7rzJ4soyiM6x3@cluster0.c6nh1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // Make sure this is correct

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret'; // You should replace this with a secure secret in production

// User model schema (including measurements and clothing link)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  measurements: {
    height: Number,
    chest: Number,
    waist: Number,
    hips: Number,
    clothingLink: String,
  }
});

const User = mongoose.model('User', UserSchema);

// Middleware to verify the JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
}

// Register route
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Register request received for email:', email);

    let user = await User.findOne({ email });
    if (user) {
      console.log('User already exists with email:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully');

    // Save new user
    user = new User({ email, password: hashedPassword });
    await user.save();
    console.log('User registered successfully with email:', email);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login request received for email:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('Invalid login attempt for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log('JWT token created for user:', user._id);

    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API route to handle submission of body measurements
app.post('/api/measurements', authenticateToken, async (req, res) => {
  const { height, chest, waist, hips, clothingLink } = req.body;

  if (!height || !chest || !waist || !hips || !clothingLink) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const user = await User.findById(req.user.userId);  // Assuming JWT middleware works properly

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's measurements
    user.measurements = { height, chest, waist, hips, clothingLink };
    await user.save();

    res.status(200).json({ message: 'Measurements saved successfully' });
  } catch (error) {
    console.error('Error saving measurements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API route to retrieve body measurements
app.get('/api/measurements', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);  // Assuming JWT middleware works properly

    if (!user || !user.measurements) {
      return res.status(404).json({ message: 'User or measurements not found' });
    }

    res.status(200).json(user.measurements);  // Return the user's measurements
  } catch (error) {
    console.error('Error retrieving measurements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route. You are authenticated!', user: req.user });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});