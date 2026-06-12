require('dotenv').config({ quiet: true });

const app = require('./src/app');
const { connectDatabase } = require('./src/config/database');

const port = Number(process.env.PORT || 5000);

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Load testing API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
