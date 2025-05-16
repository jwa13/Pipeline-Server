const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get("/api/athletes", verifyToken, async (req, res) => {
    try {
        // console.log("made it to the route");
        const usersRef = admin.firestore().collection("users");
        const snapshot = await usersRef.where('accType', '==', 'athlete').get();
        const athletes = [];
        snapshot.forEach(doc => {
            let athlete = {label: doc.data().firstName + ' ' + doc.data().lastName, value: doc.id}
            athletes.push(athlete);
        });
        res.status(200).json({athletes});
        // console.log(athletes);
    } catch (error) {
        console.error(error);
    }
});

router.get("/api/athlete-info/:athleteId", verifyToken, async (req, res) => {
    try {
        const athleteId = req.params.athleteId;
        const athleteRef = admin.firestore().collection('users').doc(athleteId);
        const doc = await athleteRef.get();

        const athleteGoalsRef = athleteRef.collection('goals');
        const snapshot = await athleteGoalsRef.get();
        const active = [];
        const inactive = [];
        let hasGoals = (true);
        if(snapshot.empty) {
            hasGoals = false;
        } else {
            snapshot.forEach(doc => {
                if(doc.data().active == true) {
                    let goal = doc.data();
                    active.push({id: doc.id, goal});
                } else if(doc.data().active == false) {
                    let goal = doc.data();
                    inactive.push({id: doc.id, goal});
                }
            })
        }

        const athleteReportRef = athleteRef.collection('reports');
        const query = athleteReportRef.orderBy('dateCreated', 'desc');
        const reportSnapshot = await query.get();
        const reportProcessing = reportSnapshot.docs.map(async (doc) => {
            const reportData = doc.data();
            let athleteName = "";
            let coachName = "";

            const athleteRef = admin.firestore().collection('users').doc(reportData.athleteUid);
            const athleteDoc = await athleteRef.get();
            athleteName = athleteDoc.data().firstName + " " + athleteDoc.data().lastName;

            const coachRef = admin.firestore().collection('users').doc(reportData.coachUid);
            const coachDoc = await coachRef.get();
            coachName = coachDoc.data().firstName + " " + coachDoc.data().lastName;

            const reportId = doc.id;

            return {
                report: reportData,
                athleteName: athleteName,
                coachName: coachName,
                reportId: reportId
            };
        });
        const reports = await Promise.all(reportProcessing);

        let responseData = {profileData: doc.data(), reports: reports};
        if(hasGoals) {
            responseData.goals = {active, inactive};
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500);
    }
});

module.exports = router;