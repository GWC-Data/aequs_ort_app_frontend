import {
    EndpointAuthType,
    EndpointRequestType,
    EndpointHandler,
} from 'node-server-engine';
import { Response } from 'express';
import { OqcForm, ScannedParts } from 'db';
import {
    PARTS_CREATION_ERROR,
    PARTS_DELETION_ERROR,
    PARTS_GET_ERROR,
    PARTS_NOT_FOUND,
    PARTS_UPDATE_ERROR
} from './scannedParts.const';

// Create new ScannedParts
export const createScannedPartsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
    req: EndpointRequestType[EndpointAuthType.NONE],
    res: Response
): Promise<void> => {

    const {
        ticketId,
        ticketCode,
        parts, // Now expects array of objects: [{ part: "PART-001", status: "Cosmetic Ok" }, ...]
        session,
        ortReceivedStatus,
    } = req.body;

    try {
        // Verify that the OqcForm exists
        const oqcForm = await OqcForm.findByPk(ticketId);

        if (!oqcForm) {
            res.status(404).json({ message: 'OqcForm not found' });
            return;
        }

        const resolvedTicketCode = ticketCode ?? oqcForm.ticketCode;

        const newScannedParts = await ScannedParts.create({
            ticketId,
            ticketCode: resolvedTicketCode,
            parts, // Array of objects with part and status
            session,
            ortReceivedStatus: ortReceivedStatus ?? 'Pending',
            scannedAt: new Date(),
        });

        res.status(200).json({
            message: 'ScannedParts created successfully',
            scannedParts: newScannedParts
        });
    } catch (error) {
        res.status(500).json({
            message: PARTS_CREATION_ERROR,
            error
        });
    }
};

//get all scanned parts
export const getAllScannedPartsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
    _req: EndpointRequestType[EndpointAuthType.NONE],
    res: Response
) => {
    try {

        const scannedPartsData = await ScannedParts.findAll({
            attributes: ['Id', 'ticketId', 'parts', 'ortReceivedStatus', 'session', 'createdAt', 'updatedAt'],
            include: [
                {
                    model: OqcForm,
                    as: 'oqcForm',
                    attributes: [
                        'Id',
                        'ticketCode',
                        'totalQty',
                        'processStage',
                        'source',
                        'project',
                        'build',
                        'colour',
                        'date',
                        'location',
                        'reason'
                    ]
                }
            ]
        });

        if (!scannedPartsData || scannedPartsData.length === 0) {
            res.status(404).json({ message: PARTS_NOT_FOUND });
            return;
        }

        // Restructure the response to flatten OqcForm data
        const scannedParts = scannedPartsData.map(item => {
            const itemJson = item.toJSON();
            return {
                parts: itemJson.parts,
                Id: itemJson.Id,
                ticketId: itemJson.ticketId,
                ticketCode: itemJson.oqcForm.ticketCode,
                totalQty: itemJson.oqcForm.totalQty,
                processStage: itemJson.oqcForm.processStage,
                source: itemJson.oqcForm.source,
                project: itemJson.oqcForm.project,
                build: itemJson.oqcForm.build,
                colour: itemJson.oqcForm.colour,
                date: itemJson.oqcForm.date,
                location: itemJson.oqcForm.location,
                reason: itemJson.oqcForm.reason,
                session: itemJson.session,
                ortReceivedStatus: itemJson.ortReceivedStatus,
                createdAt: itemJson.createdAt,
                updatedAt: itemJson.updatedAt,
            };
        });

        res.status(200).json({ scannedParts });
    } catch (error) {
        res.status(500).json({ message: PARTS_GET_ERROR, error });
    }
};

//Get ById
export const getScannedPartsByIdHandler: EndpointHandler<EndpointAuthType.NONE> = async (
    req: EndpointRequestType[EndpointAuthType.NONE],
    res: Response
): Promise<void> => {

    const { ticketId, session } = req.params;

    try {
        // Build the where clause dynamically
        const whereClause: any = { ticketId };

        // Add session to where clause if provided
        if (session) {
            whereClause.session = session;
        }

        const scannedPartsData = await ScannedParts.findAll({
            where: whereClause,
            attributes: ['Id', 'ticketId', 'parts', 'ortReceivedStatus', 'session', 'createdAt', 'updatedAt'],
            include: [
                {
                    model: OqcForm,
                    as: 'oqcForm',
                    attributes: [
                        'Id',
                        'ticketCode',
                        'totalQty',
                        'processStage',
                        'source',
                        'project',
                        'build',
                        'colour',
                        'date',
                        'location',
                        'reason'
                    ]
                }
            ]
        });

        if (!scannedPartsData || scannedPartsData.length === 0) {
            res.status(404).json({ message: PARTS_NOT_FOUND });
            return;
        }

        // Restructure the response to flatten OqcForm data
        const scannedParts = scannedPartsData.map(item => {
            const itemJson = item.toJSON();
            return {
                parts: itemJson.parts,
                Id: itemJson.Id,
                ticketId: itemJson.ticketId,
                ticketCode: itemJson.oqcForm.ticketCode,
                totalQty: itemJson.oqcForm.totalQty,
                processStage: itemJson.oqcForm.processStage,
                source: itemJson.oqcForm.source,
                project: itemJson.oqcForm.project,
                build: itemJson.oqcForm.build,
                colour: itemJson.oqcForm.colour,
                date: itemJson.oqcForm.date,
                location: itemJson.oqcForm.location,
                reason: itemJson.oqcForm.reason,
                ortReceivedStatus: itemJson.ortReceivedStatus,
                session: itemJson.session,
                createdAt: itemJson.createdAt,
                updatedAt: itemJson.updatedAt,
            };
        });

        res.status(200).json({ scannedParts })
    } catch (error) {
        res.status(500).json({ message: PARTS_GET_ERROR, error });
    }
};


// Update ScannedParts by TicketId
export const updateScannedPartsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
    req: EndpointRequestType[EndpointAuthType.NONE],
    res: Response
): Promise<void> => {

    const { ticketId, session } = req.params;
    const ticketIdInt = parseInt(ticketId, 10); // Convert string to integer

    const {
        parts,
        ortReceivedStatus,
        ticketCode,
    } = req.body;

    try {
        // Build where clause with both ticketId and session
        const whereClause: any = { ticketId: ticketIdInt };

        if (session) {
            whereClause.session = session;
        }

        // Find the existing record by ticketId and session
        const existingScannedParts = await ScannedParts.findOne({
            where: whereClause
        });

        if (!existingScannedParts) {
            res.status(404).json({ message: PARTS_NOT_FOUND });
            return;
        }

        // Verify the OqcForm exists
        const oqcForm = await OqcForm.findByPk(ticketIdInt);

        if (!oqcForm) {
            res.status(404).json({ message: 'OqcForm not found' });
            return;
        }

        // Delete the existing record
        await existingScannedParts.destroy();

        // Create a new record with updated values
        const resolvedTicketCode = ticketCode ?? existingScannedParts.ticketCode;

        const newScannedParts = await ScannedParts.create({
            ticketId: ticketIdInt,
            parts: parts ?? existingScannedParts.parts,
            ticketCode: resolvedTicketCode,
            ortReceivedStatus: ortReceivedStatus ?? existingScannedParts.ortReceivedStatus,
            session: session ?? existingScannedParts.session, // Preserve session
        });

        res.status(200).json({
            message: 'ScannedParts updated successfully',
            scannedParts: newScannedParts
        });
    } catch (error) {
        res.status(500).json({
            message: PARTS_UPDATE_ERROR,
            error
        });
    }
};

// //delete user
export const deleteScannedPartsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
    req: EndpointRequestType[EndpointAuthType.NONE],
    res: Response
): Promise<void> => {

    const { id } = req.params;

    try {

        const deleteScannedParts = await ScannedParts.findByPk(id);

        if (!deleteScannedParts) {
            res.status(404).json({ message: PARTS_NOT_FOUND });
            return;
        }

        await deleteScannedParts.destroy();

        res.status(200).json({ message: 'ScannedParts deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: PARTS_DELETION_ERROR, error });
    }
};
