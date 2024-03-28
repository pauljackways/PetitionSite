import * as petitions from '../models/petition.model';
import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as schemas from '../resources/schemas.json';
import {checkToken, decodeToken} from "../services/session";
import {validate} from "../services/validation";

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.petition_search, req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const result = await petitions.getAllPetitions(req.query);
        if (!result) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        Logger.http(`sending petitions`);
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
            Logger.info(`title ${titleResult[0].title}`)
            for (const item of titleResult) {
                if (item.title === req.body.title) {
                    Logger.http(`titles match`)
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
            Logger.http(`token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const id = await decodeToken(token);
        Logger.info(`id ${id}`)
        if (!await checkToken(id, token)){
            Logger.http(`token not valid for user`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const result = await petitions.addPetition(parseInt(id, 10), req.body)
        if (result) {
            Logger.http(`petition created`);
            res.statusMessage = "Created";
            res.status(201).send(result);
            return;
        } else {
            Logger.http(`bad request`);
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
            Logger.http(`petition not found`)
            res.statusMessage = "Not Fount. No petition with id";
            res.status(404).send();
            return;
        }
        if (req.body.title) {
            const titleResult = await petitions.getAllPetitions({q: req.body.title});
            if (titleResult[0]) {
                Logger.info(`title ${titleResult[0].title}`)
                for (const item of titleResult) {
                    if (item.title === req.body.title) {
                        Logger.http(`titles match`)
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
            Logger.http(`token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const petition = await petitions.getPetition(req.params.id);
        const ownerId = petition.ownerId;
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`token not valid for user`)
            res.statusMessage = "Forbidden. Only the owner of a petition may change it";
            res.status(403).send();
            return;
        }
        const editResult = await petitions.editPetition(req.params.id, req.body)
        if (editResult) {
            Logger.http(`petition updated`);
            res.statusMessage = "OK";
            res.status(201).send();
            return;
        } else {
            Logger.http(`bad request`);
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
            Logger.http(`token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const check = await petitions.getPetition(req.params.id)
        if (!check) {
            Logger.http(`petition not found`)
            res.statusMessage = "Not Found. No petition found with id";
            res.status(404).send();
            return;
        }
        const petition = await petitions.getPetition(req.params.id);
        const ownerId = petition.ownerId;
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`token not valid for user`)
            res.statusMessage = "Forbidden. Only the owner of a petition may delete it";
            res.status(403).send();
            return;
        }
        const result = await petitions.deletePetition(req.params.id);
        if (!result) {
            Logger.http(`found supporters`)
            res.statusMessage = "Can not delete a petition with one or more supporters";
            res.status(403).send();
            return;
        }
        Logger.http(`deleted petition`);
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
        Logger.http(`getting categories`);
        const result = await petitions.getCategories();
        if (!result) {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
        Logger.http(`sending categories`);
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