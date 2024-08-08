import { DatabricksAuth, DatabricksClient } from "../utils/databricksClient.js";
import dotenv from "dotenv";

dotenv.config();

/*
 * We need to differentiate the ADB API versions
 * Some functionalities are only supported in api version 2.0
 */

const legacy_client = new DatabricksClient(new DatabricksAuth("2.0"));
// lastest databricks api
const client = new DatabricksClient(new DatabricksAuth());

export const runJobRoute = {
    path: "/api/run_job",
    method: "get",
    handler: async (req, res) => {
        try {
            const { model, type, jobId, ...jobParams } = req.query;
            // Trim all values
            Object.keys(jobParams).forEach(k => jobParams[k] = jobParams[k].trim());
            const response = await client.submitRun({
                job_id: parseInt(jobId),
                parameters: jobParams,
            });
            const runId = response.run_id;
            let jobStatus = "RUNNING";
            let runDetails;

            // Keep looping while job is running
            while (jobStatus == "RUNNING") {
                runDetails = await client.getJobRun(runId);
                jobStatus = runDetails.state.life_cycle_state;
                await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds before polling again
            }

            // If job failed, return the error message.
            if (jobStatus == "INTERNAL_ERROR") {
                res.status(500);
                res.json({
                    message: runDetails.state.state_message,
                    run_page_url: runDetails.run_page_url,
                });
            } else {
                res.json(runDetails);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },
};

export const getJobStatusRoute = {
    path: "/api/get_job_status",
    method: "get",
    handler: async (req, res) => {
        const { jobId } = req.query;
        try {
            // Get one latest run
            const response = await client.getJobRuns({
                job_id: jobId,
                limit: 1,
                completed_only: true,
            });
            if (!response) {
                console.error("Failed to get job runs for ", jobId, response);
                res.status(500);
            } else {
                res.json(response);
            }
        } catch (error) {
            console.error(
                "Failed request to fetch latest job run for:",
                jobId, error
            );
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
}

export const getLatestJobRunRoute = {
    path: "/api/get_latest_job_run",
    method: "get",
    handler: async (req, res) => {
        const { model, type, jobId } = req.query;
        try {
            // Fetch job run id
            // Get last 10 runs and hope that one of them was successful
            const response = await client.getJobRuns({
                job_id: jobId,
                limit: 10,
                completed_only: true,
            });

            if (!response) {
                console.error("Failed to get job runs for ", jobId, response);
                res.status(500);
            } else {
                const run = response["runs"].find(
                    (r) => r.state.result_state == "SUCCESS"
                );
                if (!run) {
                    console.error("Failed to find successful runs for ", jobId);
                    console.error(response);
                    res.status(500);
                } else {
                    const runId = run.run_id;

                    // Fetch details for the run.
                    const runDetails = await client.getJobRun(runId);
                    if (!runDetails) {
                        console.error("Failed to get job run details for: ", jobId, runId);
                        console.error(response);
                        res.status(500);
                    } else {
                        if (runDetails.state.life_cycle_state == "INTERNAL_ERROR") {
                            res.status(500);
                            res.json({
                                message: runDetails.state.state_message,
                                run_page_url: runDetails.run_page_url,
                            });
                        } else {
                            res.json(runDetails);
                        }
                    }
                }
            }
        } catch (error) {
            console.log(
                "Failed request to fetch latest job run for:",
                model,
                type,
                jobId
            );
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },
};

export const createJobRoute = {
    path: "/api/create_job",
    method: "post",
    handler: async (req, res) => {
        try {
            const { model, type } = req.query;
            // TODO: move this into the job template
            const internalParams = {
                output_dir: process.env.DATABRICKS_MNT,
                run_id: "{{parent_run_id}}",
                start_date: "",
                end_date: "{{start_date}}",
                cycle_in_days: "30",
                model_name: model,
            };
            const content = { ...req.body, ...internalParams };
            const response = await client.createJob({
                model: model,
                type: type,
                parameters: content,
            });
            const data = await response.json();
            res.status(response.status).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },
};

export const getJobRoute = {
    path: "/api/get_job",
    method: "get",
    handler: async (req, res) => {
        try {
            const { jobId } = req.query;
            const response = await client.getJob({
                jobId: jobId
            });
            const data = await response.json();
            res.status(response.status).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },
};


export const updateJobRoute = {
    path: "/api/update_job",
    method: "post",
    handler: async (req, res) => {
        try {
            const { jobId } = req.query;
            const updatedConfig = req.body;
            const response = await client.updateJob({
                jobId: jobId,
                newJobConfig: updatedConfig
            });
            const data = await response.json();
            res.status(response.status).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },
}

export const cloneNotebookRoute = {
    path: "/api/clone_notebook",
    method: "post",
    handler: async (req, res) => {
        try {
            const {
                email,
                notebookName,
                startDate,
                endDate,
                featureSet,
                binningStrategy,
                baselinePath,
                comparisonPath,
                featureNamesColumn,
                targetsPath,
                targetFormat,
            } = req.query;
            const response = await legacy_client.cloneNotebook(
                email,
                notebookName,
                startDate,
                endDate,
                featureSet,
                binningStrategy,
                baselinePath,
                comparisonPath,
                featureNamesColumn,
                targetsPath,
                targetFormat
            );
            res.json(response);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },
};

export const listNotebookRoute = {
    path: "/api/list_notebook",
    method: "get",
    handler: async (req, res) => {
        try {
            const { email, notebookName } = req.query;
            const response = await legacy_client.listNotebook(email, notebookName);
            res.json(response);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },
};
