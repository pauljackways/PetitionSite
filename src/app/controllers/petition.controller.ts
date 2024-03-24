import * as users from '../models/user.model';
import * as petitions from '../models/petition.model';
import {Request, Response} from "express";
import Logger from '../../config/logger';
import Ajv from 'ajv';
import addFormats from "ajv-formats";
import * as schemas from '../resources/schemas.json';
import {hash, compare } from '../services/passwords';
import {createToken, decodeToken} from "../services/session";
import {validate} from "../services/validation";

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.petition_search,
            req.body);
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
        const validation = await validate(
            schemas.petition_post,
            req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const tokenCoded = req.header('X-Authorization');
        const id = await decodeToken(tokenCoded);
        Logger.info(`id ${id}`)
        if (!await users.checkToken(id, tokenCoded)){
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
        // Your code goes here
        res.statusMessage = "Not Implemented Yet!";
        res.status(501).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        res.statusMessage = "Not Implemented Yet!";
        res.status(501).send();
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