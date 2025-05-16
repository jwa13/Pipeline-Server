const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get("/api/home", verifyToken, async (req, res) => {
    try {
        const userRef = admin.firestore().collection('users').doc(req.decodedToken.uid);
        const doc = await userRef.get();

        if (doc.data().accType === 'athlete') {
            const goalRef = userRef.collection('goals');
            const q = goalRef.where('active', '==', true);
            const goalSnapshot = await q.get();
            const goals = [];
            goalSnapshot.forEach((item) => {
                let goal = item.data();
                goals.push({id: item.id, goal});
            });

            const reportRef = userRef.collection('reports');
            const qr = reportRef.orderBy("dateCreated", "desc").limit(1);
            const snapshot = await qr.get();

            let recentReport = null;

            if (snapshot.docs.length > 0) {
                let athleteName = "";
                let coachName = "";

                const athleteRef = admin.firestore().collection('users').doc(snapshot.docs[0].data().athleteUid);
                const doc = await athleteRef.get();
                athleteName = doc.data().firstName + " " + doc.data().lastName;

                const coachRef = admin.firestore().collection('users').doc(snapshot.docs[0].data().coachUid);
                const doc2 = await coachRef.get();
                coachName = doc2.data().firstName + " " + doc2.data().lastName;

                recentReport = { report: snapshot.docs[0].data(), athleteName: athleteName, coachName: coachName };
            }
            let hasHealth = false;
            if (doc.data().healthInfo) {
                hasHealth = true;
            }
            // console.log(goals);
            const data = {
                goals: goals,
                recentReport: recentReport,
                health: hasHealth,
            }

            res.status(200).json({ data });

        } else if (doc.data().accType === 'coach') {
            const reportRef = userRef.collection('reports');
            const query = reportRef.orderBy('dateCreated', 'desc').limit(1);
            const snapshot = await query.get();

            let athleteName = "";
            let coachName = "";

            const athleteRef = admin.firestore().collection('users').doc(snapshot.docs[0].data().athleteUid);
            const doc = await athleteRef.get();
            athleteName = doc.data().firstName + " " + doc.data().lastName;

            const coachRef = admin.firestore().collection('users').doc(snapshot.docs[0].data().coachUid);
            const doc2 = await coachRef.get();
            coachName = doc2.data().firstName + " " + doc2.data().lastName;

            const recentReport = { report: snapshot.docs[0].data(), athleteName: athleteName, coachName: coachName };

            const usersRef = admin.firestore().collection('users');
            const usersQuery = usersRef.where('accType', '==', 'athlete');
            const usersSnapshot = await usersQuery.get();
            const numberOfAthletes = usersSnapshot.size;

            const responseData = {recentReport, numberOfAthletes};

            res.status(200).json({responseData});
        } else {
            res.status(303).json({message: 'Account type missing. Client should redirect to New User Form'});
        }

    } catch (error) {
        console.error(error);
    }
});

module.exports = router;