const mongoose = require('mongoose')

const GroceryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: String },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
)

const RecipeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    items: [{ type: String, required: true }],
    instructions: { type: String },
  },
  { _id: false }
)

const GroceryListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    week: { type: String, required: true }, // e.g., 2025-W38 (ISO week)
    items: [GroceryItemSchema],
    recipes: [RecipeSchema],
  },
  { timestamps: true }
)

GroceryListSchema.index({ userId: 1, week: 1 }, { unique: true })

module.exports = mongoose.model('GroceryList', GroceryListSchema)
