import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { ParquetReader } from 'parquetjs-lite/lib/reader.js';
import { parse } from 'csv-parse';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config()

export const BlobClient = class {
    constructor() {
        const sharedKeyCredential = new StorageSharedKeyCredential(
            process.env.BLOB_ACCOUNT, process.env.BLOB_CLIENT_SHARED_KEY
        )

        // Create a BlobServiceClient object using a shared key
        this.blobServiceClient = new BlobServiceClient(`https://${process.env.BLOB_ACCOUNT}.blob.core.windows.net`,
            sharedKeyCredential);

        // Get a reference to container
        this.containerClient = this.blobServiceClient.getContainerClient(process.env.BLOB_CONTAINER_NAME);

    }

    async downloadBlob(fileName) {
        // Get a reference to the blob
        const blobClient = this.containerClient.getBlobClient(fileName);

        // Download the blob content as a string
        const downloadResponse = await blobClient.downloadToBuffer();

        // Convert buffer to string
        const blobContent = downloadResponse.toString();

        return blobContent;
    }

    async downloadParq(parquetFolder) {
        // Get the list of blobs in the container with the given prefix
        const blobs = this.containerClient.listBlobsFlat({ prefix: `${parquetFolder}/part-` });
        // Create an array to store the blobs
        const blobsBuffer = [];
        for await (const blob of blobs) {
            const blobClient = this.containerClient.getBlobClient(blob.name);
            // Push the records into the array
            blobsBuffer.push(this.downloadAndProcessBlob(blobClient));
        }
        // Wait for all the blobs to be processed
        const results = await Promise.all(blobsBuffer);
        return [].concat(...results);
    }

    async downloadAndProcessBlob(blobClient) {
        const buffer = await blobClient.downloadToBuffer();
        // Create a ParquetReader object from concatenated buffer
        const reader = await ParquetReader.openBuffer(buffer);
        // Read all records into json array
        const cursor = reader.getCursor();
        const json_rows = [];
        let record = null;
        while (record = await cursor.next()) {
            json_rows.push(record);
        }
        reader.close();
        return json_rows;
    }

    async downloadTable(parquetFolder) {
        // Get the list of blobs in the container with the given prefix
        const blobs = this.containerClient.listBlobsFlat({ prefix: `${parquetFolder}/part-` });
        // Create an array to store the rows
        const json_rows = [];

        for await (const blob of blobs) {
            const blobClient = this.containerClient.getBlobClient(blob.name);
            const buffer = await blobClient.downloadToBuffer();
            // Create a ParquetReader object from concatenated buffer
            const reader = await ParquetReader.openBuffer(buffer);
            // Read all records into json array
            const cursor = reader.getCursor();
            let record = null;
            while (record = await cursor.next()) {
                json_rows.push(record);
            }
            reader.close();
        }
        return json_rows;
    }

    async streamCSV(fileName) {
        const blobClient = this.containerClient.getBlobClient(fileName);
        const response = await blobClient.download(0);

        return response.readableStreamBody.pipe(parse({
            delimiter: ",",
            columns: true,
            skip_records_with_error: true
        }));
    }

    async downloadCSV(fileName) {
        const blobClient = this.containerClient.getBlobClient(fileName);
        const result = await blobClient.download();

        return new Promise((resolve, reject) => {
            const results = [];
            // Read stream of object content
            result.readableStreamBody
                .pipe(
                    parse({
                        delimiter: ",",
                        skip_records_with_error: true,
                        columns: true
                    })
                )
                .on('data', (data) => results.push(data))
                .on('error', (err) => reject(err))
                .on('end', () => {
                    resolve(results);
                });
        })

    }

    async listBlobs(prefix, includeMetadata) {
        const iter = this.containerClient.listBlobsByHierarchy("/", { includeMetadata: includeMetadata, prefix: prefix });
        const datasets = [];
        let blobItem = await iter.next();
        while (!blobItem.done) {
            datasets.push(blobItem.value.name)
            blobItem = await iter.next();
        }
        return datasets;
    }

    async updateBlob(blobName, blobContent) {

        // Get a reference to the blob
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        return blockBlobClient.uploadData(Buffer.from(blobContent));
    }
}