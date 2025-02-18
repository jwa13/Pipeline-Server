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

app.post("/api/signup", async (req, res) => {
    try {
        console.log(req.body);
        const { idToken } = req.body;

        const decodedToken = await auth.verifyIdToken(idToken);
        const {uid, email} = decodedToken;

        const userRef = admin.firestore().collection("users").doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            await userRef.set({email, createdAt: new Date().toISOString()});
        }

        const jwtToken = jwt.sign({uid, email}, process.env.JWT_SECRET, {expiresIn: '1h'});

        res.json({token: jwtToken});
    } catch (error) {
        console.error(error);
    }
})

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});