const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");

const User = require("../models/userModel");

// @desc    Signup
// @route   Get /api/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
  //1- Create user
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });

  const token = createToken(user._id);
  res.status(201).json({ data: user, token });
});

// @desc    Login
// @route   Get /api/v1/auth/login
// @access  Public

exports.login = asyncHandler(async (req, res, next) => {
  //  1- check if password and email in the body (validation)
  //  2- check if user exist & check if password is corrrect
  const user = await User.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("Incorrect email or password", 401));
  }
  //  3- Generate token
  const token = createToken(user._id);

  // Delete password from response
  delete user._doc.password;
  //  4- send response to client side
  res.status(200).json({ data: user, token });
});

// @desc Make sure the user is logged in
exports.protect = asyncHandler(async (req, res, next) => {
  // 1- Check if tokn exist, if exist get
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError(
        "You are not login, Please login to get access this route",
        401
      )
    );
  }
  // 2- Verify token (no change happens, expired token)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 3- Check if user exists
  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new ApiError(
        "The user that belong to this token does no longer exist",
        401
      )
    );
  }
  // 4- Check if user change his password after token created
  if (currentUser.passwordChangeAt) {
    const passChangedTimetamp = parseInt(
      currentUser.passwordChangeAt.getTime() / 1000,
      10
    );
    // Password changed after token created (Error)
    if (passChangedTimetamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed his password. please login again..",
          401
        )
      );
    }
  }
  req.user = currentUser;
  next();
});

// @desc Authorization (User Permissions)
// ['admin','manager]
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // 1- access roles
    // 2- access registered user (req.user.role)
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to access this route", 403)
      );
    }
    next();
  });

// @desc    Forgot Password
// @route   Post /api/v1/auth/forgotPassword
// @access  public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // 1- Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError("There is no user with that email ", 404));
  }
  // 2- if user exist, Venerate hash reset random 6 digits and save it in db
  const resetCode = Math.floor(100000 + Math.random() * 90000).toString();
  const heshedResetCode = crypto
    .createHash("sha258")
    .update(resetCode)
    .digest("hex");
  user.passwordResetCode = heshedResetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;

  await user.save();

  // 3- Send the reset code via email
  const message = `Hi ${user.name},\n We received a request to reset the password on your E-shop Account. \n ${resetCode}\n Enter this code to complete the reset. \n Thanks for helping us keep you account secure.\n The E-shop team`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reser code (valid for 10 min",
      message,
    });
  } catch (err) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;

    await user.save();
    return next(new ApiError("There is an error in sending email", 500));
  }
  res.status(200).json({
    status: "Succcess",
    message: "Reset Code sent to email",
  });
});
