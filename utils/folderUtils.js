const GalleryFolder = require("../models/galleryFolderModel");

/**
 * Finds a folder by name (case-insensitive) or creates it if it doesn't exist.
 * Returns the folder object and the consistent name to use.
 */
const getOrCreateFolder = async (folderName) => {
    if (!folderName) folderName = "General";
    
    // Case-insensitive exact match
    const regexName = new RegExp("^" + folderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");
    
    let folderObj = await GalleryFolder.findOne({ name: regexName });
    
    if (!folderObj) {
        folderObj = await GalleryFolder.create({ name: folderName });
        console.log(`Created new gallery folder: ${folderName}`);
    }
    
    return folderObj;
};

module.exports = { getOrCreateFolder };
