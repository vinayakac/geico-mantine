import { odata, TableClient, TableServiceClient, AzureNamedKeyCredential } from "@azure/data-tables";

import dotenv from 'dotenv';

dotenv.config();

export const StorageTableClient = class {
    constructor() {
        this.sharedKeyCredential = new AzureNamedKeyCredential(
            process.env.BLOB_ACCOUNT, process.env.BLOB_CLIENT_SHARED_KEY
        )

        this.url = `https://${process.env.BLOB_ACCOUNT}.table.core.windows.net`;

        // Create a BlobServiceClient object using a shared key
        //this.tableServiceClient = new TableServiceClient(`https://${process.env.BLOB_ACCOUNT}.blob.core.windows.net`,
        //    sharedKeyCredential);

    }

    async listEntities(tableName, filter, maxPageSize = 1000) {
        const table = new TableClient(this.url, tableName, this.sharedKeyCredential);
        // Filter examples: price le 6, PartitionKey eq ${partitionKey}
        const listResults = table.listEntities({
            filter: filter
        });
        let topEntities = [];
        const iterator = listResults.byPage({ maxPageSize: maxPageSize });

        for await (const page of iterator) {
            // Take the first page as the topEntires result
            topEntities = page;
            // We break to only get the first page
            // this only sends a single request to the service
            break;
        }
        return topEntities
    }

    async getEntity(tableName, partitionKey, rowKey) {
        try {
            const table = new TableClient(this.url, tableName, this.sharedKeyCredential);
            const entity = await table.getEntity(partitionKey, rowKey);
            return entity;
        } catch (error) {
            console.error(`Failed to get entity: ${error}`);
            throw error;
        }
    }

    async addEntity(tableName, entity) {
        try {
            const table = new TableClient(this.url, tableName, this.sharedKeyCredential);
            const result = await table.createEntity(entity);
            return result;
        } catch (error) {
            console.error(`Failed to add entity: ${error}`);
            throw error;
        }
    }


    async updateEntity(tableName, entity, mode = "Merge") {
        try {
            const table = new TableClient(this.url, tableName, this.sharedKeyCredential);
            const result = await table.updateEntity(entity, { updateMode: mode });
            return result;
        } catch (error) {
            console.error(`Failed to update entity: ${error}`);
            throw error;
        }
    }

    async upsertEntity(tableName, entity) {
        try {
            const table = new TableClient(this.url, tableName, this.sharedKeyCredential);
            const result = await table.upsertEntity(entity, "Replace");
            return result;
        } catch (error) {
            console.error(`Failed to update entity: ${error}`);
            throw error;
        }
    }

    async deleteEntity(tableName, partitionKey, rowKey, etag) {
        try {
            const table = new TableClient(this.url, tableName, this.sharedKeyCredential);
            await table.deleteEntity(partitionKey, rowKey, { etag });
        } catch (error) {
            console.error(`Failed to delete entity: ${error}`);
            throw error;
        }
    }
}