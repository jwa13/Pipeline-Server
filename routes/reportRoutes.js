const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

const getAverage = (ratings, subset) => {
    let average;
    if(subset === 'infield' || 'outfield') {
        let total = Number(ratings.Footwork) + Number(ratings.Glovework) + Number(ratings['Arm Strength']) + Number(ratings['Range/Routes/Speed']);
        average = Math.round(total / 4);
        return average;
    } else if(subset === 'throwing') {
        let total = Number(ratings.Mechanics) + Number(ratings['Arm Path']) + Number(ratings['Arm Strength']) + Number(ratings.Accuracy);
        average = Math.round(total / 4);
        return average;
    } else if(subset === 'hitting') {
        let total = Number(ratings.Contact) + Number(ratings.Power) + Number(ratings.Consistency) + Number(ratings['Barrel Control']) + Number(ratings.Mechanics);
        average = Math.round(total / 5);
        return average;
    } else if(subset === 'pitching') {
        let total = Number(ratings['Upper Body Mechanics']) + Number(ratings['Lower Body Mechanics']) + Number(ratings['Arm Path']);
        average = Math.round(total / 3);
        return average;
    } else if(subset === 'catching') {
        let total = Number(ratings.Recieving) + Number(ratings.Blocking) + Number(ratings['Ball Handling']) + Number(ratings['Throwing Footwork']) + Number(ratings['Arm Strength']);
        average = Math.round(total / 5);
        return average;
    }
}

router.get("/api/recentReport", verifyToken, async (req, res) => {
    try {
        const userRef = admin.firestore().collection('users').doc(req.decodedToken.uid).collection('reports');
        const query = userRef.orderBy('dateCreated', 'desc').limit(1);
        const snapshot = await query.get();

        let athleteName = "";
        let coachName = "";

        const athleteRef = admin.firestore().collection('users').doc(snapshot.docs[0].data().athleteUid);
        const doc = await athleteRef.get();
        athleteName = doc.data().firstName + " " + doc.data().lastName;

        const coachRef = admin.firestore().collection('users').doc(snapshot.docs[0].data().coachUid);
        const doc2 = await coachRef.get();
        coachName = doc2.data().firstName + " " + doc2.data().lastName;

        const recentReport = {report: snapshot.docs[0].data(), athleteName: athleteName, coachName: coachName};
        res.status(200).json({recentReport});
    } catch (error) {
        console.error(error);
    }
});

router.get("/api/allReports", verifyToken, async (req, res) => {
    try {
        const targetRef = admin.firestore().collection('users').doc(req.decodedToken.uid).collection('reports');
        const query = targetRef.orderBy('dateCreated', 'desc');
        const snapshot = await query.get();

        const reportProcessing = snapshot.docs.map(async (doc) => {
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
        res.status(200).json(reports);
    } catch (error) {
        console.error(error);
        res.status(500);
    }
});

router.post("/api/newReport", verifyToken, async (req, res) => {
    try {
        // console.log(req.body);
        const coachRef = admin.firestore().collection('users').doc(req.decodedToken.uid).collection('reports');
        const athleteRef = admin.firestore().collection('users').doc(req.body.athleteUid).collection('reports');

        const athleteAcc = admin.firestore().collection('users').doc(req.body.athleteUid);
        const doc = await athleteAcc.get();
        const dateOfBirth = new Date(doc.data().DOB);
        const today = new Date();

        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();

        if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
            age--
        }

        let newReport = { athleteUid: req.body.athleteUid, reportType: req.body.reportType, dateCreated: new Date().toISOString(), coachUid: req.decodedToken.uid, athleteAge: age }
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
                // console.log(req.body);
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
                if (req.body.pitchMetrics) {
                    newReport = {
                        ...newReport,
                        pitchMetrics: req.body.pitchMetrics,
                    }
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
                let infieldAverage = getAverage(req.body.infieldRatings, 'infield');
                let outfieldAverage = getAverage(req.body.outfieldRatings, 'outfield');
                let throwingAverage = getAverage(req.body.throwingRatings, 'throwing');
                let hittingAverage = getAverage(req.body.hittingRatings, 'hitting');
                newReport = {
                    ...newReport,
                    infieldRatings: req.body.infieldRatings,
                    infieldAverage: infieldAverage,
                    infieldNotes: req.body.infieldNotes,
                    outfieldRatings: req.body.outfieldRatings,
                    outfieldAverage: outfieldAverage,
                    outfieldNotes: req.body.outfieldNotes,
                    throwingRatings: req.body.throwingRatings,
                    throwingAverage: throwingAverage,
                    throwingNotes: req.body.throwingNotes,
                    hittingRatings: req.body.hittingRatings,
                    hittingAverage: hittingAverage,
                    hittingNotes: req.body.hittingNotes,
                }
                if (req.body.pitchingNotes) {
                    let pitchingAverage = getAverage(req.body.pitchingRatings, 'pitching');
                    newReport = {
                        ...newReport,
                        pitchingRatings: req.body.pitchingRatings,
                        pitchingAverage: pitchingAverage,
                        pitchingNotes: req.body.pitchingNotes,
                        pitchMetrics: req.body.pitchMetrics,
                    }
                }
                if (req.body.catchingNotes) {
                    let catchingAverage = getAverage(req.body.catchingRatings, 'catching');
                    newReport = {
                        ...newReport,
                        catchingRatings: req.body.catchingRatings,
                        catchingAverage: catchingAverage,
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

module.exports = router;