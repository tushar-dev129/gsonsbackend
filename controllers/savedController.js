const Saved = require("../models/savedModel");
const Product = require("../models/productModel");
const Variant = require("../models/variantModel");
const postModel = require("../models/postModel");

const getSavedItems = async (req, res) => {
  try {
    const userId = req.user._id;

    const savedDoc = await Saved.findOne({ userId })
      .populate("posts")
      .populate("products")
      .populate({
        path: "variants",
        populate: {
          path: "productId",
          select: "name images categoryId"
        }
      });

    if (!savedDoc) {
      return res.status(404).json({ message: "No saved items found" });
    }

    res.status(200).json({
      success: true,
      data: savedDoc,
    });

  } catch (err) {
    console.error("Error fetching saved items:", err);
    res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
  }
};

const toggleSavedItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const itemId = req.params.id;
    const { type } = req.body;

    if (!["post", "product"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const field = type === "post" ? "posts" : "products";

    let actualField = field;
    if (type === "product") {
      const isVariant = await Variant.exists({ _id: itemId });
      if (isVariant) {
        actualField = "variants";
      }
    }

    let savedDoc = await Saved.findOne({ userId });
    if (!savedDoc) {
      savedDoc = await Saved.create({ userId, posts: [], products: [] });
    }

    const hasItem = savedDoc[actualField].some(id => id.toString() === itemId);

    if (hasItem) {
      // Atomically remove
      savedDoc = await Saved.findOneAndUpdate(
        { userId },
        { $pull: { [actualField]: itemId } },
        { new: true }
      );
    } else {
      // Atomically add (avoiding duplicates)
      savedDoc = await Saved.findOneAndUpdate(
        { userId },
        { $addToSet: { [actualField]: itemId } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: `${type} ${!hasItem ? "saved" : "removed"} successfully`,
      data: savedDoc
    });

  } catch (err) {
    console.error("Error saving item:", err);
    res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
  }
};

module.exports = { getSavedItems, toggleSavedItem };