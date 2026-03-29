const Saved = require("../models/savedModel");
const productModel = require("../models/productModel");
const postModel = require("../models/postModel");

const getSavedItems = async (req, res) => {
  try {
    const userId = req.user._id;

    const savedDoc = await Saved.findOne({ userId })
      .populate("posts")
      .populate("products");

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

    let savedDoc = await Saved.findOne({ userId });
    if (!savedDoc) {
      savedDoc = await Saved.create({ userId, posts: [], products: [] });
    }

    const hasItem = savedDoc[field].some(id => id.toString() === itemId);

    if (hasItem) {
      // Atomically remove
      savedDoc = await Saved.findOneAndUpdate(
        { userId },
        { $pull: { [field]: itemId } },
        { new: true }
      );
    } else {
      // Atomically add (avoiding duplicates)
      savedDoc = await Saved.findOneAndUpdate(
        { userId },
        { $addToSet: { [field]: itemId } },
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