import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as users from "../models/user.model";
import * as image from "../models/image.model";
import * as petitions from "../models/petition.model";
import {decodeToken, checkToken} from "../services/session";

const validFileTypes: string[] = ["image/png", "image/jpeg", "image/gif"];

const endpoint = 'petition';
const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        const result = await image.getImage(endpoint, id);
        if (!result) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Found. No petition with id";
            res.status(404).send();
            return;
        }
        if (result.binary === null) {
            Logger.http(`Petition image not found`)
            res.statusMessage = "Not Found. Petition has no image";
            res.status(404).send();
            return;
        }
        const fileExtension = result.filename.split('.')[1];
        if (!(validFileTypes.includes("image/"+fileExtension))) {
            Logger.error(`File extension error - serverside`);
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
        res.setHeader('Content-Type', 'image/'+fileExtension);
        Logger.http(`Sending image`)
        res.statusMessage = "OK";
        res.status(200).send(result.binary);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        const result = await petitions.getPetition(id);
        if (!(result.ownerId)) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Found. No petition found with id";
            res.status(404).send();
            return;
        }
        const ownerId = result.ownerId;
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`Token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const tokenId = await decodeToken(token);
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`Token not valid for user`)
            res.statusMessage = "Forbidden. Only the owner of a petition can change the hero image";
            res.status(403).send();
            return;
        }
        const contentType = req.header('Content-Type');
        if (!(validFileTypes.includes(contentType))) {
            Logger.http(`Invalid filetype`)
            res.statusMessage = "Bad Request. Invalid image supplied (possibly incorrect file type)";
            res.status(400).send();
            return;
        }
        const imageData: Buffer = req.body;
        if (await image.setImage(endpoint, id, contentType, imageData)) {
            Logger.http(`Updated image`)
            res.statusMessage = "OK. Image updated";
            res.status(200).send();
            return;
        } else {
            Logger.http(`Created image`)
            res.statusMessage = "Created. New image created";
            res.status(201).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


export {getImage, setImage};