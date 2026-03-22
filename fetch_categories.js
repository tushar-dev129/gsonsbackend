const mongoose = require('mongoose');
const fs = require('fs');

const DB_URL = "mongodb+srv://tushar915:tushar1292@cluster0.ihjuf05.mongodb.net/gsons";

const categorySchema = new mongoose.Schema({
    name: String,
    _id: mongoose.Schema.Types.ObjectId
});

const Category = mongoose.model('Category', categorySchema);

async function fetchCategories() {
    try {
        await mongoose.connect(DB_URL);
        console.log('Connected to DB');
        
        const categories = await Category.find({}, 'name _id');
        const mapping = {};
        categories.forEach(cat => {
            mapping[cat.name] = cat._id.toString();
        });
        
        fs.writeFileSync('../json_to_csv/categories.json', JSON.stringify(mapping, null, 2));
        console.log('Categories saved to categories.json');
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fetchCategories();
