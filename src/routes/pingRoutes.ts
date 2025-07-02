import express from "express"

const router = express.Router()

router.get("/ping", (_, res) => {
    res.json({
        success: true,
        message: "ping data"
    })
})


export default router