import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as petitions from "../models/petition.model";
import * as supporters from "../models/petition.supporter.model";
import * as users from "../models/user.model";
import {decodeToken, checkToken} from "../services/session";
import {validate} from "../services/validation";
import * as schemas from "../resources/schemas.json";


const getAllSupportersForPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const getResult = await petitions.getPetition(req.params.id);
        if (!getResult) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Found. No petition with id";
            res.status(404).send();
            return;
        }
        const result = await supporters.getAllSupportersForPetition(req.params.id);
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addSupporter = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.support_post, req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const petitionResult = await petitions.getPetition(req.params.id);
        if (!petitionResult) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Found. No petition with id";
            res.status(404).send();
            return;
        }
        let existsFlag = false;
        for (const tier of petitionResult.supportTiers) {
            if (tier.supportTierId === req.body.supportTierId) {
                existsFlag = true;
                break;
            }
        }
        if (!(existsFlag)) {
            Logger.http(`Support tier not found`)
            res.statusMessage = "Not Found. Support tier does not exist";
            res.status(404).send();
            return;
        }
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`Token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const id = Number(await decodeToken(token));
        if (!await checkToken(`${id}`, token)) {
            Logger.http(`Token not valid for user`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const ownerId = petitionResult.ownerId;
        if (await checkToken(`${ownerId}`, token)) {
            Logger.http(`Token valid for owner`)
            res.statusMessage = "Forbidden. Cannot support your own petition";
            res.status(403).send();
            return;
        }
        const supportersResult = await supporters.getAllSupportersForPetition(req.params.id);
        if (!supportersResult) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Found. No petition with id";
            res.status(404).send();
            return;
        }
        existsFlag = false;
        for (const supporter of supportersResult) {
            if (supporter.supporterId === id) {
                if (supporter.supportTierId === req.body.supportTierId) {
                    existsFlag = true;
                    break;
                }
            }
        }
        if (existsFlag) {
            Logger.http(`User already supports tier`)
            res.statusMessage = "Forbidden. Already supported at this tier";
            res.status(403).send();
            return;
        }
        const supporterData = req.body;
        supporterData.id = id;
        supporterData.petitionId = req.params.id;
        if (await supporters.addSupporter(req.body)) {
            Logger.http(`Supporter added`)
            res.statusMessage = "Created";
            res.status(201).send();
            return;
        }
        Logger.error(`Insert into supporter failed`)
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getAllSupportersForPetition, addSupporter}