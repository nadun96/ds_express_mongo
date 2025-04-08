// isntantiate express app with vars
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const userSchema = require("./User");

dotenv.config();

// instantiate express app with vars
const app = express();

var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(jsonParser);
app.use(urlencodedParser);

// establish mongoose connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

// routes
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const selectedUser = await userSchema.findOne({ email: email });
  if (selectedUser) {
    return res.status(400).json({ message: "User already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const createdUser = new userSchema({
    name: name,
    email: email,
    password: hashedPassword,
  });

  try {
    await createdUser.save();
    return res.status(201).json({ message: "User created successfully" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const selectedUser = await userSchema.findOne({ email: email });
  if (!selectedUser) {
    return res.status(400).json({ message: "Invalid email or password" });
  }
  const isPasswordValid = await bcrypt.compare(password, selectedUser.password);
  if (!isPasswordValid) {
    return res.status(403).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ id: selectedUser.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return res.status(200).json({
    message: "Login successful",
    token: token,
  });
});

app.get("/user", async (req, res) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userSchema.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

app.listen(process.env.PORT, () => {
  console.log("server connected");
});
