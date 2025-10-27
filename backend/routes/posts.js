const express = require('express')
const router = express.Router()
const Post = require('../models/Posts')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const authenticateToken = require('../middlewares/auth');


const S3_BASE_URL =
  process.env.S3_BASE_URL ||
  `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`; // 추가됨


function joinS3Url(base, key) {                       // 추가됨
  const b = String(base || '').replace(/\/+$/, '');
  const k = String(key || '').replace(/^\/+/, '');
  return `${b}/${k}`;
}

const toArray = (val) => {                            // 추가됨: fileUrl/string/JSON 문자열 안전 파싱
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed.filter(Boolean) : [val]; }
    catch { return [val]; }
  }
  return [];
};

const ensureObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "잘못된 id 형식입니다." })
    }
    next()
}

const pickDefined = (obj) =>
    Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
    )


router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, content, fileUrl, imageUrl } = req.body

        if (typeof fileUrl === 'string') {
            try {
                fileUrl = JSON.parse(fileUrl)
            } catch (error) {
                fileUrl = [fileUrl]
            }
        }

        const latest = await Post.findOne().sort({ number: -1 })

        const nextNumber = latest ? latest.number + 1 : 1

        const post = await Post.create({
            user: req.user._id || req.user.id,
            number: nextNumber,
            title,
            content,
            fileUrl,
            imageUrl
        })

        res.status(201).json(post)
    } catch (error) {
        console.error('POST /api/posts 실패:', error)
        res.status(500).json({ message: '서버 오류가 발생했습니다.' })

    }
})


router.get('/', async (req, res) => {
    try {
        const list = await Post.find().sort({ createdAt: -1 }).lean()

        const data = await Promise.all(
            list.map(async (p) => {
                const arr = Array.isArray(p.fileUrl) ?
                    p.fileUrl : (p.imageUrl ? [p.imageUrl] : [])

                const urls = await Promise.all(
                    arr.map(async (v) => (v?.startsWith("http") ? v : await presignGet(v, 3600)))
                )

                return { ...p, fileUrl: urls }
            })
        )

        res.json(data)
    } catch (error) {
        console.error('GET /api/posts 실패', error)
        res.status(500).json({ message: '서버 오류' })
    }
})
router.get('/my', authenticateToken, async (req, res) => {
    try {

        const userId = req.user.id || req.user._id;
        if (!userId) return res.status(400).json({ message: '유저 정보 없음' });

        const myPosts = await Post.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        res.json(myPosts);
    } catch (error) {
        console.error('GET /api/posts/my 실패', error)
        res.status(500).json({ message: '서버 오류' })
    }
})

router.get('/:id', async (req, res) => {
    try {

        const doc = await Post.findById(req.params.id).lean()

        if (!doc) return res.status(404).json({ message: '존재하지 않는 게시글' })

        res.json(doc)

    } catch (error) {
        res.status(500).json({ message: '서버 오류' })

    }
})

router.put('/:id', authenticateToken, async (req, res) => {
    try {

        const { title, content, fileUrl, imageUrl } = req.body


        const updates = pickDefined({
            title,
            content,
            fileUrl,
            imageUrl
        })

        const updated = await Post.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        )

        if (!updated) return res.status(404).json({ message: '존재하지 않는 게시글' })

        res.json(updated)

    } catch (error) {
        res.status(500).json({ message: '서버 오류' })

    }
})
router.delete('/:id', authenticateToken, ensureObjectId, async (req, res) => {
    try {

        const deleted = await Post.findByIdAndDelete(req.params.id)

        if (!deleted) return res.status(404).json({ message: '존재하지 않는 게시글' })

        res.json({ok:true, id:deleted._id})

    } catch (error) {
        res.status(500).json({ message: '서버 오류' })

    }
})


module.exports = router