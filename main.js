const express = require ('express');
const blogRouter = require('./routes/blogRoute');
const userRouter = require('./routes/userRoute');


const app = express();





app.use(express.json()); // parse json body




app.get('/', (req, res) => {
    res.send('Jobs Apis');
});

app.get('/health', (req, res) => {
    res.send('OK');
});



app.use('/api/v1/users', userRouter)
app.use('/api/v1/blogs', blogRouter);


module.exports = app;