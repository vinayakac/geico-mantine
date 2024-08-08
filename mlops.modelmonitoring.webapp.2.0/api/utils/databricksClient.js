import dotenv from "dotenv";
import fetch from "node-fetch";
import https from "https";

dotenv.config();

/**
 * This is an Authentication class which can be passed to the Databricks Client.
 * This way, if we need to add additional workspaces later we can create auth classes for them, and the Client is can be reused for any Workspace.
 *
 * Ensure that locally you have environment variables set with ADB Instance URL and a valid Databricks Access Token
 */
export const DatabricksAuth = class {
    constructor(version = "2.1") {
        this._url = process.env.DATABRICKS_URL;
        this._key = process.env.DATABRICKS_ACCOUNT_KEY;
        this._notebookLocation = process.env.DATABRICKS_NOTEBOOK_LOCATION;
        this._version = version;
    }
    /**
     * return the url of the Workspace
     */
    get url() {
        return this._url;
    }

    /**
     * return the api key to use in headers for requests
     */
    get key() {
        return this._key;
    }

    /**
     * return the api version
     */
    get version() {
        return this._version;
    }
    /*
     * return location for base notebook
     */
    get notebookLocation() {
        return this._notebookLocation;
    }
};

/**
 *
 * @param {DatabricksAuth} DatabricksAuth
 */
export const DatabricksClient = class {
    constructor(DatabricksAuth) {
        this.url = `${DatabricksAuth.url}/api/${DatabricksAuth.version}`;
        this.notebookLocation = `${DatabricksAuth.notebookLocation}`;
        this.agent = new https.Agent({
            rejectUnauthorized: false,
        });
        this.config = {
            headers: {
                Authorization: `Bearer ${DatabricksAuth.key}`,
            },
        };
    }

    /**
     *
     * @param {Number} limit   the total number of jobs to return
     * @returns {JSON}  json document with an array of all the jobs, under toplevel key "jobs": {"jobs": [{job}, {job}]}
     */
    async getJobs() {
        const agent = this.agent;
        const response = await fetch(`${this.url}/jobs/list`, {
            agent,
            method: "GET",
            headers: this.config.headers,
        });

        if (!response.ok) {
            console.error("Error fetching the job list: ", this.url, response);
        }
        const data = await response.json();
        return data;
    }

    /**
     *
     * @param {Number} job_id
     * @returns {JSON}
     */
    async getSingleJob(job_id) {
        if (!job_id) {
            throw RangeError("job_id parameter is required");
        }
        if (!Number.isInteger(job_id)) {
            throw TypeError("job_id must be a valid integer.");
        }
        const agent = this.agent;
        const response = await fetch(`${this.url}/jobs/get?job_id=${job_id}`, {
            agent,
            method: "GET",
            headers: this.config.headers,
        });

        if (!response.ok) {
            console.error("Error fetching the job with id: ", job_id, response);
        }
        const data = await response.json();
        return data;
    }

    /**
     *
     * @param {Object} params Object with keys job_id, parameters, where job_id is the job to run, and parameters is a list of python parameters to pass to the job.
     * (https://docs.databricks.com/dev-tools/api/latest/jobs.html#operation/JobsRunNow:~:text=jobs/run%2Dnow-,Request%20samples,-Payload)
     * @returns
     */
    async submitRun({ job_id = null, parameters = {} } = {}) {
        const agent = this.agent;

        if (!Number.isInteger(job_id)) {
            throw TypeError("job_id must be a valid integer.");
        }

        const headers = this.config.headers;

        headers["Content-Type"] = "Application/JSON";
        const response = await fetch(`${this.url}/jobs/run-now`, {
            agent,
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                job_id: job_id,
                python_named_params: parameters,
            }),
        });

        if (!response.ok) {
            console.error("Error submitting the job with id: ", job_id, response);
        }
        const data = response.json();
        return data;
    }

    /**
     *
     * @param {JSON} params JSON with keys "job_id" and "limit". limit defaults to 25 if not provided.
     * @returns {JSON} {"runs": [{run}, {run}]}
     */
    async getJobRuns({ job_id = null, limit = 25, completed_only = true } = {}) {
        const agent = this.agent;
        const headers = this.config.headers;
        const getRunsUri = job_id
            ? `${this.url}/jobs/runs/list?job_id=${job_id}&limit=${limit}&completed_only=${completed_only}`
            : `${this.url}/jobs/runs/list?limit=${limit}`;

        const response = await fetch(getRunsUri, {
            agent,
            method: "GET",
            headers: headers,
        });
        const data = await response.json();
        return data;
    }

    async getJobRun(job_run_id) {
        const agent = this.agent;

        if (!Number.isInteger(job_run_id)) {
            throw TypeError("job_id must be a valid integer.");
        }
        const response = await fetch(
            `${this.url}/jobs/runs/get?run_id=${job_run_id}`,
            {
                agent,
                method: "GET",
                headers: this.config.headers,
            }
        );
        const jobRunDetails = await response.json();
        return jobRunDetails;
    }

    async getJobRunOutput(job_run_id) {
        const agent = this.agent;

        if (!Number.isInteger(job_run_id)) {
            throw TypeError("job_id must be a valid integer.");
        }
        const response = await fetch(
            `${this.url}/jobs/runs/get-output?run_id=${job_run_id}`,
            {
                agent,
                method: "GET",
                headers: this.config.headers,
            }
        );
        const jobRunOutput = await response.json();
        return jobRunOutput;
    }

    async createJob({ model = null, type = "data_drift", parameters = {} } = {}) {
        const agent = this.agent;
        // TODO: make a json file with job template
        const jobConfig = {
            name: `${model}_${type}_job`,
            schedule: {
                quartz_cron_expression: "54 0 20 * * ?",
                timezone_id: "America/New_York",
                pause_status: "UNPAUSED",
            },
            tasks: [
                {
                    task_key: `${model}_${type}`,
                    python_wheel_task: {
                        package_name: "monitoring",
                        entry_point: `${type}_main`,
                        named_parameters: parameters,
                    },
                    existing_cluster_id: process.env.DATABRICKS_CLUSTER,
                },
                {
                    task_key: "alerts_and_notifications",
                    depends_on: [
                        {
                            "task_key": `${model}_${type}`
                        }
                    ],
                    run_if: "ALL_SUCCESS",
                    python_wheel_task: {
                        package_name: "monitoring",
                        entry_point: "alerts_and_notifications_main",
                        named_parameters: {
                            alert_track_path: process.env.DATABRICKS_MNT + "/alerts_log",
                            job_run_date: "{{start_date}}",
                            latest_run: "{{parent_run_id}}",
                            alert_config_path: process.env.DATABRICKS_MNT + "/config/alert_config.json",
                            model_name: `${model}`,
                            job_type: `${type}`
                        }
                    },
                    existing_cluster_id: process.env.DATABRICKS_CLUSTER,
                }
            ],
            format: "MULTI_TASK",
        };

        const headers = this.config.headers;
        headers["Content-Type"] = "Application/JSON";
        const response = await fetch(`${this.url}/jobs/create`, {
            agent,
            method: "POST",
            headers: headers,
            body: JSON.stringify(jobConfig),
        });
        return response;
    }

    async getJob({ jobId = null }) {
        const agent = this.agent;
        const headers = this.config.headers;
        headers["Content-Type"] = "Application/JSON";
        const response = await fetch(`${this.url}/jobs/get?job_id=${jobId}`, {
            agent,
            method: "GET",
            headers: headers
        });
        return response;
    }

    async updateJob({ jobId = null, newJobConfig = {} }) {
        const agent = this.agent;
        const headers = this.config.headers;
        headers["Content-Type"] = "Application/JSON";
        const response = await fetch(`${this.url}/jobs/update`, {
            agent,
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                job_id: jobId,
                new_settings: newJobConfig
            }),
        });
        return response;
    }


    async cloneNotebook(
        destinationEmail,
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
    ) {
        const sourcePath = `${this.notebookLocation}/${notebookName}`;
        const destPath = `/Users/${destinationEmail}/${notebookName}`;
        const exportUrl = `${this.url}/workspace/export?path=${sourcePath}`;
        const importUrl = `${this.url}/workspace/import`;
        const notebookIdUrl = `${this.url}/workspace/list?path=${destPath}`;
        // prepare to populate notebook with args from ui
        let replacements = {
            'dbutils.widgets.text("start_date", "", "")': `dbutils.widgets.text("start_date","${startDate}")`,
            'dbutils.widgets.text("end_date", "", "")': `dbutils.widgets.text("end_date","${endDate}")`,
            'dbutils.widgets.text("feature_set", "", "")': `dbutils.widgets.text("feature_set","${featureSet}")`,
            'dbutils.widgets.text("binning_stg", "", "")': `dbutils.widgets.text("binning_stg","${binningStrategy}")`,
            'dbutils.widgets.text("targets_path", "", "")': `dbutils.widgets.text("targets_path","${targetsPath}")`,
            'dbutils.widgets.text("baseline_df_path", "", "")': `dbutils.widgets.text("baseline_df_path","${baselinePath}")`,
            'dbutils.widgets.text("comparison_df_path", "", "")': `dbutils.widgets.text("comparison_df_path","${comparisonPath}")`,
            'dbutils.widgets.text("feature_names_json_path", "", "")': `dbutils.widgets.text("feature_names_json_path","${featureNamesColumn}")`,
            'dbutils.widgets.text("target_format", "", "")': `dbutils.widgets.text("target_format","${targetFormat}")`
        };
        const headers = this.config.headers;
        headers["Content-Type"] = "Application/JSON";
        const agent = this.agent;
        try {
            //Export request
            const exportResponse = await fetch(exportUrl, {
                method: "GET",
                headers: headers,
                agent,
            });
            if (!exportResponse.ok) throw new Error("Export failed ", exportResponse.status);
            const exportData = await exportResponse.json();
            let content = Buffer.from(exportData.content, "base64").toString("utf-8");
            for (let [oldText, newText] of Object.entries(replacements)) {
                content = content.split(oldText).join(newText);
            }
            //convert back to base64
            const base64Content = Buffer.from(content).toString("base64");
            //Import request
            const importPayload = {
                content: base64Content,
                path: destPath,
                language: "PYTHON",
                format: "SOURCE",
                overwrite: true,
            };
            const importResponse = await fetch(importUrl, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(importPayload),
                agent,
            });

            if (importResponse.status != 200) {
                throw new Error("Import failed ", importResponse.status);
            }

            //Get notebook details
            const notebookResponse = await fetch(notebookIdUrl, {
                method: "Get",
                headers: headers,
                agent,
            });

            if (!notebookResponse.ok)
                throw new Error("Notebook id extraction failed ", notebookResponse.status);
            let notebookDetails = await notebookResponse.json();
            const baseUrl = this.url.replace("/api/2.0", "");
            notebookDetails["objects"][0].url = baseUrl;
            return notebookDetails["objects"][0];

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async listNotebook(email, notebookName) {
        const root_path = `/Users/${email}`;
        const notebookUrl = `${this.url}/workspace/list?path=${root_path}`;
        const headers = this.config.headers;
        const agent = this.agent;
        headers["Content-Type"] = "Application/JSON";
        try {
            const notebookResponse = await fetch(notebookUrl, {
                method: "Get",
                headers: headers,
                agent,
            });
            if (!notebookResponse.ok) throw new Error("Not able to find notebook", notebookResponse.message);
            const notebookData = await notebookResponse.json();
            // filter for only model analysis notebooks
            let filteredNotebooks = notebookData.objects.filter((item) =>
                item.path.includes(notebookName)
            );
            let baseUrl = this.url.replace("/api/2.0", "");

            for (let i = 0; i < filteredNotebooks.length; i++) {
                filteredNotebooks[i].url = baseUrl;
            }
            return filteredNotebooks;

        } catch (error) {
            console.log(error);
            throw error;
        }
    }
};
