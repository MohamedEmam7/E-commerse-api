const factory = require("./handlersFactory");
const SubCategory = require("../models/subCategoryModel");

exports.setCategoryIdToBody = (req, res, next) => {
  // Nasted route
  if (!req.body.category) req.body.category = req.params.categoryId;
  next();
};

// Nested route
//GET api/v1/categories/:categoryId/subcategories
exports.createFilterObj = (req, res, next) => {
  let filterObject = {};
  if (req.params.categoryId) filterObject = { category: req.params.categoryId };
  req.filterObject = filterObject;
  next();
};

// @desc    Create subCategory
// @route   POST /api/v1/subcategories
// @access  Private
exports.createSubCategory = factory.createOne(SubCategory);

//@desc   Get list of subCategories
//@route  GET /api/v1/subCategories
//@access Public
exports.getSubCategories = factory.getAll(SubCategory);

// @desc   Get specific category by id
// @route  GET /api/v1/categories/:id
// @access Public
exports.getSubCategory = factory.getOne(SubCategory);

//@desc   Update specific category
//@route  PUT /api/v1/categories/:id
//@acess  private
exports.updateSubCategory = factory.updateOne(SubCategory);

// @desc   Delete specific subCategory
// @route  DELETE /api/v1/subCategoryies/:id
// @access private
exports.deleteSubCategory = factory.deleteOne(SubCategory);
