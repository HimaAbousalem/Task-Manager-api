const express= require('express')
const multer = require('multer')
const sharp = require('sharp')
const User = require('../model/user')
const auth = require('../middleware/auth')

const userRouter = express.Router() 
const avatar = multer({
        limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('please upload an image!'))
        }
        cb(undefined, true)
    }
})
userRouter.post('/users', async(req, res)=>{
    const user = new User(req.body)
    try {
        await user.save()
        const token= await user.generateAuthToken()
        res.status(201).send({user, token})
    } catch (e) {
        res.status(400).send(e)
    }
})

userRouter.post('/users/login', async (req, res)=>{
    try {
        const user =await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({user,token})
    } catch (e) {
        res.status(400).send()
    }
})

userRouter.post('/users/me/avatar', auth, avatar.single('avatar'), async(req, res)=>{
    const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next)=>{
    res.status(400).send({error: error.message})
})

userRouter.post('/users/logout', auth, async(req, res)=>{
    try {
        req.user.tokens = req.user.tokens.filter((token)=> token.token != req.token)
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

userRouter.post('/users/logoutAll', auth, async(req, res)=>{
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

userRouter.get('/users/me', auth, async(req, res)=>{
    res.send(req.user)
})

userRouter.get('/users/:id/avatar', async(req, res)=>{
    try {
        const user = await User.findById(req.params.id)

        if(!user || !user.avatar){
            throw new Error()
        }
        res.set('content-type','image/png')
        res.send(user.avatar)
    } catch (e) {
        res.status(400).send()
    }
})

userRouter.patch('/users/me', auth, async(req, res)=>{
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password','age']
    const isValidUpdate = updates.every((update)=> allowedUpdates.includes(update))
    if(!isValidUpdate){
        res.status(400).send({error: 'Invalid Updates!'})
    }
    try {
        updates.forEach((update)=> req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
})

userRouter.delete('/users/me', auth, async (req, res)=>{
    try {
        await req.user.remove()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})
userRouter.delete('/users/me/avatar', auth, async(req, res)=>{
    req.user.avatar = undefined
    await req.user.save()
    res.send()
})
module.exports = userRouter 