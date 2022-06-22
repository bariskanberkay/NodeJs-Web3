const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const xHash = process.env.NPM_X_HASH
const xUserAgent = process.env.NPM_USER_AGENT
const xApiKey = process.env.NPM_X_API_KEY
const xApiSecretKey = process.env.NPM_X_API_SECRET_KEY


function checkApiKey(req, res, next) {
    let headerUserAgent = req.headers['user-agent'];
    let headerApiKey = req.headers['x-api-key'];
    let headerApiSecretKey = req.headers['x-api-secret-key'];
    let headerHash = req.headers['x-hash'];


    if(headerUserAgent=== undefined || headerApiKey === undefined || headerApiSecretKey === undefined || headerHash === undefined){
        return res.status(401).json({ status:false, message: 'Unauthorized1' });
    }

    if(headerUserAgent === xUserAgent){
        if(headerApiKey === undefined || headerApiSecretKey === undefined || headerHash === undefined){
            return res.status(401).json({ status:false, message: 'Unauthorized2' });
        }else{
            if(headerApiKey === xApiKey && headerApiSecretKey === xApiSecretKey && headerHash === xHash ){
                next();
            }else{
                return res.status(401).json({ status:false, message: 'Unauthorized' });
            }
        }
    }else{
        return res.status(401).json({ status:false, message: 'Unauthorized' });
    }

}
module.exports = checkApiKey;
