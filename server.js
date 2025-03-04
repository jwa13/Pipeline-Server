const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const { doc } = require("firebase/firestore");
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

app.get("/api/profile", verifyToken, async (req, res) => {
    try {
        const userRef = admin.firestore().collection("users").doc(req.decodedToken.uid);
        const doc = await userRef.get();

        const testRef = admin.firestore().collection("users").doc(req.decodedToken.uid).collection("goals");
        const doctest = await testRef.get();
        let hasGoals = false;
        if(doctest.size > 0) {
            hasGoals = true;
        }
        
        const userData = doc.data();
        res.status(200).json({...userData, hasGoals: hasGoals});
    } catch (error) {
        console.error(error);
    }
});

app.get("/api/athletes", verifyToken, async (req, res) => {
    try {
        console.log("made it to the route");
        const usersRef = admin.firestore().collection("users");
        const snapshot = await usersRef.where('accType', '==', 'athlete').get();
        const athletes = [];
        snapshot.forEach(doc => {
            let athlete = {label: doc.data().firstName + ' ' + doc.data().lastName, value: doc.id}
            athletes.push(athlete);
        });
        res.status(200).json({athletes});
        console.log(athletes);
    } catch (error) {
        console.error(error);
    }
});

app.get("/api/goals", verifyToken, async (req, res) => {
    try {
        const userRef = admin.firestore().collection('users').doc(req.decodedToken.uid).collection('goals');
        const snapshot = await userRef.get();
        
        const active = [];
        const inactive = [];

        if(snapshot.empty) {
            res.status(200).json({message: "no goals"});
        } else {
            snapshot.forEach(doc => {
                if(doc.data().active == true) {
                    let goal = doc.data();
                    active.push(goal);
                } else if(doc.data().active == false) {
                    let goal = doc.data();
                    inactive.push(goal);
                }
            });
            res.status(200).json({active, inactive});
        }
    } catch (error) {
        console.error(error);
    }
})

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
        console.log("update successful")
        res.status(200).json({message: "Form accepted"});

    } catch (error) {
        console.error(error);
    }
});

app.post("/api/newGoal", verifyToken, async (req, res) => {
    try {
        console.log(req.body);
        const userRef = admin.firestore().collection('users').doc(req.decodedToken.uid).collection('goals');
        let newGoal = {
            type: req.body.type.value,
            content: req.body.content,
            targetCompletion: req.body.targetCompletion,
            dateCreated: req.body.dateCreated,
            active: true
        }
        await userRef.add(newGoal);
        res.status(200).json({message: "Form accepted"});
    } catch (error) {
        console.error(error);
    }
});

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});