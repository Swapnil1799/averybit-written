const express = require('express');
const { registerUser , loginUser, getAllUsers ,deleteUser,editUser,getUserById} = require('../controllers/UserController');


const router = express.Router();


router.post('/register', registerUser);
router.post("/login", loginUser);
router.get('/getAllUsers',getAllUsers);
router.delete('/deleteUser/:uid',deleteUser);
router.put('/editUser/:uid',editUser);
router.get('/getUser/:id', getUserById);
module.exports = router;