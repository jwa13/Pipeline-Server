const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const profileRoutes = require('./routes/profileRoutes');
const goalRoutes = require('./routes/goalRoutes');
const reportRoutes = require('./routes/reportRoutes');
const athleteRoutes = require('./routes/athleteRoutes');
const databaseRoutes = require('./routes/databaseRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use(authRoutes);
app.use(homeRoutes);
app.use(profileRoutes);
app.use(goalRoutes);
app.use(reportRoutes);
app.use(athleteRoutes);
app.use(databaseRoutes);

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});