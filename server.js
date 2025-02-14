const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

app.use(cors());
app.use(express.json());

app.post("/api/generate-jwt", async (req, res) => {
    try {
        const token = req.headers.authorization?.split('Bearer')[1];
        if(!token) {
            return res.status(401).json({error: "Unathorized"});
        }

        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const payload = {
            uid: uid,
            privilege: "admin"
        }

        const secretKey = 'bananapancakes';
        const customToken = jwt.sign(payload, secretKey, {expiresIn: '1h'});

        res.json({token: customToken});
    } catch (error) {
        console.error('Error generating JWT', error);
        res.status(500).json({error: 'Failed to generate JWT'});
    }
});

app.get("/api/home", (req, res) => {
    res.json({ message: "Hello World" });
});

app.get("/api/database", async (req, res) => {
    try {
        const collections = await db.listCollections();
        const collectionIds = collections.map(collection => collection.id);
        res.json({ message: 'Firestore connection successful', collections: collectionIds });
    } catch (error) {
        console.error('Firestore connection error: ', error);
        res.status(500).json({ error: 'Firestore connection error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});