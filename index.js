const app = require('./main')
const database = require('./config/database');
const dotenv = require('dotenv');


dotenv.config();

database.connectDB();


const port =parseInt(process.env.PORT, 10) || 800

app.listen(port, () => {
    console.log(`Server started on port ${port}`);


});