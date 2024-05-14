const express = require('express');
const routes = require('./routes/index');

const app = express();

app.use(express.json()); // parse json request
// app.use('/', routes);
app.use(routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
