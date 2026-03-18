import cloudinary from 'cloudinary'
import logger from '../utils/logger.js'

//configure cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

//TEST CONNECTION
cloudinary.v2.api.ping()
    .then(() => {
        logger.info(`Cloudinary Connected successfully!!`)
    })
    .catch((error) => {
        logger.error(`Cloudinary connection failed: ${error.message}`)
    })

    export default cloudinary.v2