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

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ message: "Invalid or missing token" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);
        req.decodedToken = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({message: "Invalid Token"});
    }
}

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
});

app.post("/api/login", async (req, res) => {
    try {
        console.log(req.body);
        const { idToken } = req.body;

        const decodedToken = await auth.verifyIdToken(idToken);
        const {uid, email} = decodedToken;

        const userRef = admin.firestore().collection("users").doc(decodedToken.uid);
        const doc = await userRef.get();
        const accType = doc.data().accType;
        console.log(accType);

        const jwtToken = jwt.sign({uid, email, accType}, process.env.JWT_SECRET, {expiresIn: '1h'});

        res.json({token: jwtToken});
    } catch (error) {
        console.error(error);
    }
});

app.post("/api/newAcc", verifyToken, async (req, res) => {
    try {
        const userRef = admin.firestore().collection("users").doc(req.decodedToken.uid);

        let updateData = {
            accType: req.body.type,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            DOB: req.body.dateOfBirth,
        }

        if (req.body.type == 'athlete') {
            updateData = {
                ...updateData,
                height: req.body.height,
                weight: req.body.weight,
                positions: req.body.positions,
                throwing: req.body.throwing,
                hitting: req.body.hitting,
            }
            if(req.body.phone) {
                updateData = {
                    ...updateData,
                    phone: req.body.phone,
                }
            }
            if(req.body.guardianFirstName) {
                updateData = {
                    ...updateData,
                    guardianFirstName: req.body.guardianFirstName,
                    guardianLastName: req.body.guardianLastName,
                    guardianDOB: req.body.guardianDOB,
                    guardianPhone: req.body.guardianPhone,
                }
            }
        } else if (req.body.type = 'coach') {
            updateData = {
                ...updateData,
                phone: req.body.phone,
                specialty: req.body.specialty,
            }
        } else {
            return res.status(400).json('Bad form');
        }

        await userRef.update(updateData);
        res.status(200);

    } catch (error) {
        console.error(error);
    }
});

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});