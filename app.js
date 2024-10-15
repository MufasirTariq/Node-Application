const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('./Models/userModel');
const Item = require('./Models/itemModel');
const Cart = require('./Models/cartModel');

const app =  express()
const port = 5000;

// Middleware : 
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');

// Mongoose Setup : 
mongoose.connect('mongodb://localhost:27017/NodeApp')
.then(() => {
    console.log("Database Connection : Successful !")
}).catch((error) => {
    console.log(`Database Connection : Dissconected!, ${error}`);
});

// Session Setup :
app.use(session({
    secret: 'theweeknd',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
    }
}));

// Multer Setup : 
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname); 
    },
});

var upload = multer({storage: storage}).single('image');
app.use('/uploads', express.static('uploads'));


// Paths / APIs :
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/update', async (req, res) => {
    if(req.session.userId){
        const id = req.session.userId;
        const user = await User.findById({_id : id})
        res.render('update', {user: user});
    }
    
});

app.get('/home', async (req, res) => {
    if(req.session.userId){
        const id = req.session.userId;
        const user = await User.findById({_id : id})
        const items = await Item.find({});
        const cart = await Cart.find({});
        res.render('home', {user: user, items: items, cart : cart});
    } else {
        res.render('index');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.render('index');
});

app.post('/register', upload, async(req, res) => {
    const email = req.body.email;
    const emailCheck = await User.findOne({email});
    if(!emailCheck){
        const user = User({
            name:req.body.name, 
            email:req.body.email, 
            password:req.body.password,
            image: req.file.filename,    
        });
        await user.save();
        res.redirect('/');
    } else {
        res.render('register', {msg: "Email already Exist, Try other email!"})
    }
    
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        if (password === user.password) {
            req.session.userId = user._id;
            res.redirect('/home');
        } else {
            res.render('index', { msg: "Password Incorrect!" });
        }
    } else {
        res.render('index', { msg: "User Not exist" });
    }
});

app.post('/update/:id', upload, async (req,res) => {
    const{ name, email, password } = req.body;
    const id = req.params.id;
    const user = await User.findByIdAndUpdate(id, {
        name: req.body.name,
        email:req.body.email,
        password: req.body.password,
        image: req.file.filename,
    }, {new: true});
    if(user){
        res.redirect('/home');
        console.log(user);
    } else {
        res.redirect('/')
    }
});

app.get('/delete/:id', async (req,res) => {
    const id = req.params.id;
    const user = await User.findByIdAndDelete(id)
        if(user){
        res.redirect('/');
        console.log("user Deleted");
    } else {
        res.redirect('/')
    }
});

app.post('/additem', upload, async (req,res) => {
    try {
        const item = await Item({
            name: req.body.name,
            price: req.body.price,
            image: req.file.filename,
        });
        await item.save();
        res.redirect('/home');
    } catch (error) {
        console.log(error);
        res.redirect('/home');
    }
});

app.get('/admin', async (req, res) => {
    if(req.session.userId){
        const id = req.session.userId;
        const user = await User.findById({_id:id})
        const items = await Item.find({})
        res.render('admin', {user:user, items:items})
    }
});

app.get('/editItem/:id', async (req, res) => {
    if(req.session.userId){
        const id = req.params.id;
        const item = await Item.findById(id);
        const user_id = req.session.userId
        const user = await User.findById({_id:user_id})
        if(item){
            res.render('editItem', {item:item, user:user});
        } else {
            console.log(error);
        }
}
});

app.post('/editItem/:id', upload, async(req, res) => {
    try {
            const itemId = req.params.id;
            const item = await Item.findByIdAndUpdate(itemId, {
                name: req.body.name,
                price: req.body.price,
                image: req.file.filename,
            });
            if (item){
                res.redirect('/admin')
            }
    } catch (error) {
        console.log(error);
    }

});

app.get('/deleteItem/:id', async(req, res) => {
    const id = req.params.id;
    const item = await Item.findByIdAndDelete(id);
    res.redirect('/admin') 
});

app.post('/addcart/:id', async(req,res) => {
    const id = req.params.id;
    const item = await Item.findById(id);
    const nm = item.name;
    const pr = item.price;
    const img = item.image;

    const cart = await Cart({name: nm, price: pr, image: img});
    await cart.save();
    res.status(200).json({ message: 'Added' });

});
app.listen(port, ()=> {
    console.log(`Server connection : Successful -> http://localhost:${port}`);
}); 