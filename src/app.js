require('dotenv').config();
const path    = require('path');
const express = require('express');
const cors    = require('cors');
const pool    = require('./config/db');
const profileRoutes = require('./routes/profile.routes');
const errorHandler  = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Create/migrate table on first request
// let tableReady = false;
// app.use(async (req, res, next) => {
//   if (tableReady) return next();
 

app.use('/api/profiles', profileRoutes);
app.use(errorHandler);

module.exports = app;