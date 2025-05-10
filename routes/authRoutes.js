const express = require('express');
const jwt = require('jsonwebtoken');
const { auth, db, admin } = require('../config/firebaseAdmin');
require('dotenv').config();

const router = express.Router();

router.post("/api/signup", async (req, res) => {
    try {
        // console.log(req.body);
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

router.post("/api/login", async (req, res) => {
    try {
        // console.log(req.body);
        const { idToken } = req.body;

        const decodedToken = await auth.verifyIdToken(idToken);
        const {uid, email} = decodedToken;

        const userRef = admin.firestore().collection("users").doc(decodedToken.uid);
        const doc = await userRef.get();
        const accType = doc.data().accType;
        // console.log(accType);

        const jwtToken = jwt.sign({uid, email, accType}, process.env.JWT_SECRET, {expiresIn: '1h'});

        if (accType === 'athlete') {
            const goalRef = admin.firestore().collection('users').doc(decodedToken.uid).collection('goals');
            const snapshot = await goalRef.where('active', '==', true).get();
            const today = new Date();

            if (!snapshot.empty) {
                const updatePromises = snapshot.docs.map(async (goalDoc) => {
                    const goalData = goalDoc.data();
                    const target = new Date(goalData.targetCompletion);
                    const todayStart = new Date(today);
                    todayStart.setHours(0,0,0,0);

                    if(target < todayStart) {
                        await goalRef.doc(goalDoc.id).update({active: false, status: 'expired', achieved: goalData.targetCompletion});
                    }
                });
                await Promise.all(updatePromises);
            }
        }

        res.json({token: jwtToken});
    } catch (error) {
        console.error(error);
    }
});

module.exports = router;