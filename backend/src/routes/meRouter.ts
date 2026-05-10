import { getAuth } from "@clerk/express";
import { Router } from "express";
import { getLocalUser } from "../lib/users";

const router = Router();

router.get('/', async(req, res, next) => {
    try{

        const {userId, isAuthenticated } = getAuth(req);
        
        if(!userId || !isAuthenticated){
            res.status(401).json({error: 'Unauthorized'});
            return;
        }
        
        const user = await getLocalUser(userId);
        
        res.json(user);
    }catch(error){
        next(error);
    }

});

export default router