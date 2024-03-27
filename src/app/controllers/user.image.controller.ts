import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as users from "../models/user.model";
import * as image from "../models/image.model";
import {checkToken, decodeToken} from "../services/session";

const validFileTypes: string[] = ["image/png", "image/jpeg", "image/gif"];
const endpoint = 'user';
const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        const result = await image.getImage(endpoint, id);
        if (!result || result.binary === null) {
            Logger.http(`user not found`)
            res.statusMessage = "Not Found. No user with specified ID, or user has no image";
            res.status(404).send();
            return;
        }
        if (result.binary) {
            const fileExtension = result.filename.split('.')[1];
            Logger.error(`image/${fileExtension}`)
            if (!(validFileTypes.includes("image/"+fileExtension))) {
                res.statusMessage = "Internal Server Error";
                res.status(500).send();
                return;
            }
            res.setHeader('Content-Type', 'image/'+fileExtension);
            Logger.http(`sending image`)
            res.statusMessage = "OK";
            res.status(200).send(result.binary);
            return;
        }
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
        const result = await users.viewUser(id, false);
        if (!(result.length > 0)) {
            Logger.http(`user not found`)
            res.statusMessage = "Not found. No such user with ID given";
            res.status(404).send();
            return;
        }
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (!await checkToken(`${id}`, token)) {
            Logger.http(`token not valid for user`)
            res.statusMessage = "Forbidden. Can not change another user's profile photo";
            res.status(403).send();
            return;
        }
        const contentType = req.header('Content-Type');
        if (!(validFileTypes.includes(contentType))) {
            Logger.http(`invalid filetype`)
            res.statusMessage = "Bad Request. Invalid image supplied (possibly incorrect file type)";
            res.status(400).send();
            return;
        }
        const imageData: Buffer = req.body;
        if (await image.setImage(endpoint, id, contentType, imageData)) {
            Logger.http(`updated image`)
            res.statusMessage = "OK. Image updated";
            res.status(200).send();
            return;
        } else {
            Logger.http(`updated image`)
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

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        if (!await image.getImage(endpoint, id)) {
            Logger.http(`user not found`)
            res.statusMessage = "Not Found. No user with specified ID, or user has no image";
            res.status(404).send();
            return;
        }
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (!await checkToken(`${id}`, token)) {
            Logger.http(`token not valid for user`)
            res.statusMessage = "Can not delete another user's profile photo";
            res.status(403).send();
            return;
        }
        await image.deleteImage(endpoint, id);
        res.statusMessage = "OK";
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage, deleteImage}