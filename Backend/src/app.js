const express = require('express');
const cors = require('cors')
const axios = require('axios');
const morgan = require('morgan')
const exphbs = require('express-handlebars')

const app = express();

//settings
app.set('port', process.env.PORT || 3000)