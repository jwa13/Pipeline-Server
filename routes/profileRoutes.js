const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get("/api/profile", verifyToken, async (req, res) => {
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

router.post("/api/newAcc", verifyToken, async (req, res) => {
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
        // console.log("update successful")
        res.status(200).json({message: "Form accepted"});

    } catch (error) {
        console.error(error);
    }
});

router.post("/api/newHealth", verifyToken, async (req, res) => {
    try{
        // console.log(req.body);
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
        // console.log('health info post success');
        res.status(200).json({message: 'Form accepted'});
    } catch (error) {
        console.error(error);
        res.status(400).json({message: 'Database or server error'});
    }
});

module.exports = router;