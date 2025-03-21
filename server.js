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

app.get("/api/home", verifyToken, async (req, res) => {
    try {
        const userRef = admin.firestore().collection('users').doc(req.decodedToken.uid);
        const doc = await userRef.get();

        if (doc.data().accType === 'athlete') {
            const goalRef = userRef.collection('goals');
            const q = goalRef.where('active', '==', true);
            const goalSnapshot = await q.get();
            const goals = [];
            goalSnapshot.forEach((goal) => {
                goals.push(goal.data());
            });

            const reportRef = userRef.collection('reports');
            const qr = reportRef.orderBy("dateCreated", "desc").limit(1);
            const snapshot = await qr.get();

            const orderedReports = [];
            snapshot.forEach((report) => {
                orderedReports.push(report.data());
            });

            const hasHealth = false;
            if(doc.data().healthInfo) {
                hasHealth = true;
            }

            const data = {
                goals: goals,
                orderedReports: orderedReports,
                health: hasHealth,
            }

            res.status(200).json({data});
        }

    } catch(error) {
        console.error(error);
    }
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
        let hasHealth = false;
        if(doc.data().healthInfo) {
            hasHealth = true;
        }
        
        const userData = doc.data();
        res.status(200).json({...userData, hasGoals: hasGoals, hasHealth: hasHealth});
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

app.post("/api/newReport", verifyToken, async (req, res) => {
    try {
        console.log(req.body);
        const coachRef = admin.firestore().collection('users').doc(req.decodedToken.uid).collection('reports');
        const athleteRef = admin.firestore().collection('users').doc(req.body.athleteUid).collection('reports');

        let newReport = { athleteUid: req.body.athleteUid, reportType: req.body.reportType, dateCreated: new Date().toISOString(), coachUid: req.decodedToken.uid }
        switch (req.body.reportType) {
            case 'hitting':
                newReport = {
                    ...newReport,
                    loadRatings: req.body.loadRatings,
                    swingRatings: req.body.swingRatings,
                    evTee: req.body.evTee,
                    distanceTee: req.body.distanceTee,
                    evFrontToss: req.body.evFrontToss,
                    distanceFrontToss: req.body.distanceFrontToss,
                    swingNotes: req.body.swingNotes,
                }
                break;
            case 'pitching':
                if (req.body.ratings) {
                    newReport = {
                        ...newReport,
                        ratings: req.body.ratings,
                    }
                }
                if (req.body.mechRatings) {
                    newReport = {
                        ...newReport,
                        mechRatings: req.body.mechRatings,
                        mechComments: req.body.mechComments,
                    }
                }
                if (req.body.pitchMetricsChecked) {
                    // add pitch data after turned into array
                }
                break;
            case 'strength':
                newReport = {
                    ...newReport,
                    lowerBody: req.body.lowerBodyRatings,
                    upperBody: req.body.upperBodyRatings,
                    fullBodyROM: req.body.fullBodyROM,
                    posturalAssessment: req.body.posturalAssesment,
                }
                break;
            case 'skills':
                newReport = {
                    ...newReport,
                    infieldRatings: req.body.infieldRatings,
                    infieldNotes: req.body.infieldNotes,
                    outfieldRatings: req.body.outfieldRatings,
                    outfieldNotes: req.body.outfieldNotes,
                    throwingRatings: req.body.throwingRatings,
                    throwingNotes: req.body.throwingNotes,
                    hittingRatings: req.body.hittingRatings,
                    hittingNotes: req.body.hittingNotes,
                }
                if (pitchingNotes) {
                    newReport = {
                        ...newReport,
                        pitchingRatings: req.body.pitchingRatings,
                        pitchingNotes: req.body.pitchingNotes
                    }
                    // add pitch data after turned into an array
                }
                if (catchingNotes) {
                    newReport = {
                        ...newReport,
                        catchingRatings: req.body.catchingRatings,
                        catchingNotes: req.body.catchingNotes,
                    }
                }
                break;
            default:
                break;
        }
        const docID = crypto.randomUUID();
        await coachRef.doc(docID).set(newReport);
        await athleteRef.doc(docID).set(newReport);
        res.status(200).json({message: "Form accepted"});
    } catch (error) {
        console.error(error);
    }
});

app.post("/api/newHealth", verifyToken, async (req, res) => {
    try{
        console.log(req.body);
        const userRef = admin.firestore().collection('users').doc(req.decodedToken.uid);
        let healthInfo = {
            emContact: {
                name: req.body.name,
                phone: req.body.phone,
                relation: req.body.relation
            },
            surgery: req.body.surgery,
            injury: req.body.injury,
            heart: req.body.heart,
            restricted: req.body.restricted,
            breath: req.body.restricted,
            pastConditions: req.body.pastConditions,
            currentConditions: req.body.currentConditions,
        }
        if(req.body.surgery === 'true') {
            healthInfo = {
                ...healthInfo,
                surgeryDetails: req.body.surgeryDetails,
            }
        }
        await userRef.update({healthInfo: healthInfo});
        console.log('health info post success');
        res.status(200).json({message: 'Form accepted'});
    } catch (error) {
        console.error(error);
        res.status(400).json({message: 'Database or server error'});
    }
});

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});