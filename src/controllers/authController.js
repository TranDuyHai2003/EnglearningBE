const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const User = require("../models/User");
const env = require("../config/env");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcryptjs.compare(
      password,
      user.password_hash
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRE }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          status: user.status,
          avatar_url: user.avatar_url,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const register = async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const allowedRoles = ["student", "instructor"];
    const user = await User.create({
      email,
      password_hash: password,
      full_name,
      role: allowedRoles.includes(role) ? role : "student",
      status: "active",
    });

    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRE }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          status: user.status,
          avatar_url: user.avatar_url,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User found",
      data: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { login, register, getMe };
