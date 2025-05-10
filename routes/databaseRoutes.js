const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');

const router = express.Router();

router.get("/api/database", async (req, res) => {
    try {
        const collections = await db.listCollections();
        const collectionIds = collections.map(collection => collection.id);
        res.json({ message: 'Firestore connection successful', collections: collectionIds });
    } catch (error) {
        console.error('Firestore connection error: ', error);
        res.status(500).json({ error: 'Firestore connection error' });
    }
});

module.exports = router;