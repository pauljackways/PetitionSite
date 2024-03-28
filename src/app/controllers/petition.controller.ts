import * as petitions from '../models/petition.model';
import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as schemas from '../resources/schemas.json';
import {checkToken, decodeToken} from "../services/session";
import {validate} from "../services/validation";

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{
        Logger.http(`GET Get all petitions based on search parameters`)
        const validation = await validate(schemas.petition_search, req.query);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const result = await petitions.getAllPetitions(req.query);
        if (!result) {
            Logger.http(`Query parameters rejected by system`)
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        Logger.http(`Sending petitions`);
        res.statusMessage = "OK";
        res.status(200).send(result);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const getPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const result = await petitions.getPetition(req.params.id);
        if (!result) {
            res.statusMessage = "Not Fount. No petition with id";
            res.status(404).send();
            return;
        }
        Logger.http(`sending petition`);
        res.statusMessage = "OK";
        res.status(200).send(result);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const titleResult = await petitions.getAllPetitions({q: req.body.title});
        if (titleResult[0]) {
            for (const item of titleResult) {
                if (item.title === req.body.title) {
                    Logger.http(`Titles match`)
                    res.statusMessage = "Forbidden. Petition title already exists";
                    res.status(403).send();
                    return;
                }
            }
        }
        const validation = await validate(schemas.petition_post, req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`Token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const id = await decodeToken(token);
        if (!await checkToken(id, token)){
            Logger.http(`Token not valid for user`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const result = await petitions.addPetition(parseInt(id, 10), req.body)
        if (result) {
            Logger.http(`Petition created`);
            res.statusMessage = "Created";
            res.status(201).send(result);
            return;
        } else {
            Logger.http(`Bad request`);
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const editPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.petition_patch, req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const getResult = await petitions.getPetition(req.params.id);
        if (!getResult) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Fount. No petition with id";
            res.status(404).send();
            return;
        }
        if (req.body.title) {
            const titleResult = await petitions.getAllPetitions({q: req.body.title});
            if (titleResult[0]) {
                for (const item of titleResult) {
                    if (item.title === req.body.title) {
                        Logger.http(`Titles match`)
                        res.statusMessage = "Forbidden. Petition title already exists";
                        res.status(403).send();
                        return;
                    }
                }
            }
        }
        if (!isNaN(req.body.categoryId)) {
            req.body.categoryId = parseInt(req.body.categoryId, 10);
        }
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`Token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const petition = await petitions.getPetition(req.params.id);
        const ownerId = petition.ownerId;
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`Token not valid for user`)
            res.statusMessage = "Forbidden. Only the owner of a petition may change it";
            res.status(403).send();
            return;
        }
        const editResult = await petitions.editPetition(req.params.id, req.body)
        if (editResult) {
            Logger.http(`Petition updated`);
            res.statusMessage = "OK";
            res.status(201).send();
            return;
        } else {
            Logger.http(`Bad request`);
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`Token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const check = await petitions.getPetition(req.params.id)
        if (!check) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Found. No petition found with id";
            res.status(404).send();
            return;
        }
        const petition = await petitions.getPetition(req.params.id);
        const ownerId = petition.ownerId;
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`Token not valid for user`)
            res.statusMessage = "Forbidden. Only the owner of a petition may delete it";
            res.status(403).send();
            return;
        }
        const result = await petitions.deletePetition(req.params.id);
        if (!result) {
            Logger.http(`Found supporters`)
            res.statusMessage = "Can not delete a petition with one or more supporters";
            res.status(403).send();
            return;
        }
        Logger.http(`Deleted petition`);
        res.statusMessage = "OK";
        res.status(200).send(result);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getCategories = async(req: Request, res: Response): Promise<void> => {
    try{
        Logger.http(`Getting categories`);
        const result = await petitions.getCategories();
        if (!result) {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
        Logger.http(`Sending categories`);
        res.statusMessage = "OK";
        res.status(200).send(result);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getAllPetitions, getPetition, addPetition, editPetition, deletePetition, getCategories};