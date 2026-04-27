const userService = require("./user.service");

const register = async (req, res, next) => {
  try {
    console.log("req.body:", req.body); // debug log
    const result = await userService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    console.log("req.body:", req.body); // debug log
    const result = await userService.loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const firebaseAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body || {};
    const result = await userService.firebaseLogin(idToken);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.uid);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, firebaseAuth, getProfile };