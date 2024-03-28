import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as petitions from "../models/petition.model";
import {validate} from "../services/validation";
import * as schemas from "../resources/schemas.json";
import {decodeToken, checkToken} from "../services/session";
import * as supporters from "../models/petition.supporter.model";
import * as tiers from "../models/petition.support_tier.model";

const addSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.support_tier_post, req.body);
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
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`Token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const id = Number(await decodeToken(token));
        if (!await checkToken(`${id}`, token)) {
            Logger.http(`token not valid for user`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const ownerId = petitionResult.ownerId;
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`Token not valid for owner`)
            res.statusMessage = "Forbidden. Only the owner of a petition may modify it";
            res.status(403).send();
            return;
        }
        let tierCount = 0;
        for (const tier of petitionResult.supportTiers) {
            tierCount++;
            if (tier.title === req.body.title) {
                Logger.http(`Title not unique`)
                res.statusMessage = "Forbidden. Support title not unique within petition";
                res.status(403).send();
                return;
            }
        }
        if (tierCount >= 3) {
            Logger.http(`Maximum number of tiers already`)
            res.statusMessage = "Forbidden. Can't add a support tier if 3 already exist";
            res.status(403).send();
            return;
        }
        if (await tiers.addSupportTier(req.params.id, req.body)) {
            Logger.http(`Support tier added`)
            res.statusMessage = "OK";
            res.status(201).send();
            return;
        }
        Logger.error(`Insert into support_tier failed`)
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

const editSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.support_tier_patch, req.body);
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
            if (tier.supportTierId === Number(req.params.tierId)) {
                existsFlag = true;
                break;
            }
            if (tier.title === req.body.title) {
                Logger.http(`Title not unique`)
                res.statusMessage = "Forbidden. Support title not unique within petition";
                res.status(403).send();
                return;
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
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`Token not valid for owner`)
            res.statusMessage = "Forbidden. Only the owner of a petition may modify it";
            res.status(403).send();
            return;
        }
        const supportersResult = await supporters.getAllSupportersForPetition(req.params.tierId);
        for (const pledge of supportersResult) {
            if (pledge.supportTierId === Number(req.params.tierId)) {
                Logger.http(`Supporter exists for tier`)
                res.statusMessage = "Forbidden. Can not edit a support tier if a supporter already exists for it";
                res.status(403).send();
                return;
            }
        }
        if (await tiers.editSupportTier(req.params.tierId, req.body)) {
            Logger.http(`Support tier patched`)
            res.statusMessage = "OK";
            res.status(200).send();
            return;
        }
        Logger.error(`Insert into support_tier failed`)
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

const deleteSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionResult = await petitions.getPetition(req.params.id);
        if (!petitionResult) {
            Logger.http(`Petition not found`)
            res.statusMessage = "Not Found. No petition with id";
            res.status(404).send();
            return;
        }
        let existsFlag = false;
        let tierCount = 0;
        for (const tier of petitionResult.supportTiers) {
            tierCount++;
            if (tier.supportTierId === Number(req.params.tierId)) {
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
        if (!await checkToken(`${ownerId}`, token)) {
            Logger.http(`Token not valid for owner`)
            res.statusMessage = "Forbidden. Only the owner of a petition may delete it";
            res.status(403).send();
            return;
        }
        if (tierCount <= 1) {
            Logger.http(`Only one support tier`)
            res.statusMessage = "Forbidden. Can not remove a support tier if it is the only one for a petition";
            res.status(403).send();
            return;
        }
        const supportersResult = await supporters.getAllSupportersForPetition(req.params.id);
        for (const pledge of supportersResult) {
            if (pledge.supportTierId === req.params.tierId) {
                Logger.http(`Supporter exists for tier`)
                res.statusMessage = "Forbidden. Can not delete a support tier if a supporter already exists for it";
                res.status(403).send();
                return;
            }
        }
        if (await tiers.deleteSupportTier(req.params.tierId)) {
            Logger.http(`Support tier deleted`)
            res.statusMessage = "OK";
            res.status(200).send();
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

export {addSupportTier, editSupportTier, deleteSupportTier};