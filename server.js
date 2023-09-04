const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Load routes from the routes directory
const routes = require('./routes');
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

exports.app = app;
