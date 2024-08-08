import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

export class CosmosDBClient {

    constructor(endpoint, key, databaseId, containerId) {
        this.endpoint = endpoint;
        this.key = key;
        this.databaseId = databaseId;
        this.containerId = containerId;

        this.client = new CosmosClient({ endpoint: this.endpoint, key: this.key });
        this.container = this.client.database(this.databaseId).container(this.containerId);
    }

    async saveAuditRecord(logEntry) {
        try {
            const { resource } = await this.container.items.create(logEntry);
            return resource;
        } catch (error) {
            console.error(`Failed to get all alerts: ${error}`);
            throw error;
        }
    }

    async getAllAlertsData(userId) {
        try {
            const query = "SELECT * FROM c WHERE c.userId = @userId";
            const parameters = [{ name: '@userId', value: userId }];
            const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
            return resources;
        } catch (error) {
            console.error(`Failed to get all alerts: ${error}`);
            throw error;
        }
    }

    async getActiveAlertsData(userId) {
        try {
            const query = "SELECT c.id, c.userId, c.snapshotDateTime, a as alerts FROM c JOIN a IN c.alerts WHERE c.userId = @userId AND a.isAlertRemoved = false";
            const parameters = [{ name: '@userId', value: userId }];
            const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
            return resources;
        } catch (error) {
            console.error(`Failed to get non-removed alerts: ${error}`);
            throw error;
        }
    }

    async getUnreadAlerts(userId) {
        try {
            const query = "SELECT c.id,  a as alerts FROM c JOIN a IN c.alerts WHERE c.userId = @userId AND a.isAlertRemoved = false AND a.isAlertSeen = false";
            const parameters = [{ name: '@userId', value: userId }];
            const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
            return resources;
        } catch (error) {
            console.error(`Failed to get non-removed alerts: ${error}`);
            throw error;
        }
    }

    async updateAlertDataRemovedStatus(id, alertName, modelName, userId) {
        try {
            const { resource: item } = await this.container.item(id, userId).read();
            if (item) {
                for (const alert of item.alerts) {
                    if (alert.alertName === alertName && alert.modelName === modelName) {
                        alert.isAlertRemoved = true;
                    }
                }
                await this.container.item(id, userId).replace(item);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async updateAlertDataSeenStatus(userId) {
        try {
            const query = "SELECT * FROM c WHERE c.userId = @userId";
            const parameters = [{ name: '@userId', value: userId }];
            const { resources: items } = await this.container.items.query({ query, parameters }).fetchAll();

            for (const item of items) {
                let hasUpdates = false;

                for (const alert of item.alerts) {
                    if (!alert.isAlertRemoved && !alert.isAlertSeen) {
                        alert.isAlertSeen = true;
                        hasUpdates = true;
                    }
                }

                if (hasUpdates) {
                    await this.container.item(item.id).replace(item);
                }
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async addAlert(alert) {
        try {
            const { resource } = await this.container.items.create(alert);
            return resource;
        } catch (error) {
            console.error(`Failed to add alert: ${error}`);
            throw error;
        }
    }
    async deleteAlert(documentId, partitionKey) {
        try {
            await this.container.item(documentId, partitionKey).delete();
            console.log(`Deleted item with id: ${documentId}`);
            return true;
        } catch (error) {
            console.error(`Failed to delete alert: ${error}`);
            throw error;
        }
    }
    async updateAlert(documentId, partitionKey, updatedData) {
        try {
            const { resource: existingItem } = await this.container.item(documentId, partitionKey).read();
            const updatedItem = {
                ...existingItem,
                ...updatedData
            };

            const { resource } = await this.container.item(documentId, partitionKey).replace(updatedItem);

            console.log(`Updated item with id: ${documentId}`);
            return resource;
        } catch (error) {
            console.error(`Failed to update alert: ${error}`);
            throw error;
        }
    }

    async getAlertsUser(userId, partitionKey) {
        try {
            const query = "SELECT * FROM c WHERE c.modelName = @partitionKey AND (ARRAY_CONTAINS(c.alertEmails, @userId) OR c.adminEmail = @userId)";
            const parameters = [
                { name: '@partitionKey', value: partitionKey },
                { name: '@userId', value: userId }
            ];
            const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
            return resources;
        } catch (error) {
            console.error(`Failed to get alerts by userId: ${error}`);
            throw error;
        }
    }

    async getAlertById(alertId, partitionKey) {
        try {
            const query = "SELECT * FROM c WHERE c.id = @alertId AND c.modelName = @partitionKey";
            const parameters = [
                { name: '@partitionKey', value: partitionKey },
                { name: '@alertId', value: alertId }
            ];
            const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
            return resources[0];
        } catch (error) {
            console.error(`Failed to get alert by ID: ${error}`);
            throw error;
        }
    }

    async getAlerts() {
        try {
            const query = "SELECT * FROM c";
            const { resources } = await this.container.items.query(query).fetchAll();
            return resources;
        } catch (error) {
            console.error(`Failed to get all alerts: ${error}`);
            throw error;
        }
    }

    async getTripSegmentsByTripId(tripId) {
        try {
            const query = "SELECT * from c where c.TripID=@tripId";
            const parameters = [
                { name: '@tripId', value: tripId }
            ];
            const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
            return resources;
        } catch (error) {
            if (error.code === 404 || error.message.includes('Resource Not Found')) {
                console.log(`Container not found for ID: ${this.containerId}`);
                return [];
            }
            console.error(`Failed to get trip segments: ${error}`);
            throw error;
        }
    }

    async getTripSegmentsByDriverId(driverId, startDate, endDate) {
        try {
            const query = "SELECT * from c where c.DriverID=@driverId and c._ts >= @startDate and c._ts <= @endDate";
            const parameters = [
                { name: '@driverId', value: driverId },
                { name: '@startDate', value: startDate },
                { name: '@endDate', value: endDate }
            ];
            const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
            return resources;
        } catch (error) {
            if (error.code === 404 || error.message.includes('Resource Not Found')) {
                console.log(`Container not found for ID: ${this.containerId}`);
                return [];
            }
            console.error(`Failed to get trip segments: ${error}`);
            throw error;
        }
    }

}