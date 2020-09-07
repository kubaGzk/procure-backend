const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const categorySchema = new Schema({
    name: {type: String, required: true},
    items: [{type: mongoose.Types.ObjectId, ref: 'CatalogItem'}]
})

module.exports = mongoose.model('Category', categorySchema);