const createApp = require('./app');
const app = createApp();
app.listen(3001, () => console.log('Browser check server http://localhost:3001'));
