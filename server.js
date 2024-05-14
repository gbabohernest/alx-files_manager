const express = require('express');
const routes = require('./routes/index');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json()); // parse json request
// app.use('/', routes);
app.use(routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
