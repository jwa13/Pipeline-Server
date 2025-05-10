const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get("/api/goals", verifyToken, async (req, res) => {
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
                    active.push({id: doc.id, goal});
                } else if(doc.data().active == false) {
                    let goal = doc.data();
                    inactive.push({id: doc.id, goal});
                }
            });
            res.status(200).json({active, inactive});
        }
    } catch (error) {
        console.error(error);
    }
});

router.post("/api/newGoal", verifyToken, async (req, res) => {
    try {
        // console.log(req.body);
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

router.post("/api/completeGoal/:goalId", verifyToken, async (req, res) => {
    try {
        const goalRef = admin.firestore().collection('users').doc(req.decodedToken.uid).collection('goals').doc(req.params.goalId);
        const goalSnapshot = await goalRef.get();
        if(goalSnapshot.exists) {
            await goalRef.update({active: false, status: 'achieved', achieved: new Date().toISOString()});
            res.status(200).json({message: 'Goal Achieved!'});
        } else {
            res.status(400).json({message: 'Goal not found'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Internal Server Error'});
    }
});

module.exports = router;