import { getAuthUrlRoute } from "./getAuthUrl.js";
import { getEnvironmentUrlRoute } from "./getEnvironmentUrl.js";
import {
    cloneNotebookRoute,
    createJobRoute, getJobRoute, getJobStatusRoute,
    getLatestJobRunRoute,
    listNotebookRoute,
    runJobRoute, updateJobRoute
} from "./jobRoutes.js";
import { oauthCallbackRoute } from "./oauthCallbackRoute.js";
import { getTripLogsRoute, getTripAllLogsRoute,getDriverAllTripsRoute } from "./pipelineRoutes.js";

 const routes = [
     oauthCallbackRoute,
     getAuthUrlRoute, 
     getEnvironmentUrlRoute,
     runJobRoute,
     getLatestJobRunRoute,
     getJobStatusRoute,
     createJobRoute,
     cloneNotebookRoute,
     listNotebookRoute,
     getJobRoute,
     updateJobRoute,
     getTripLogsRoute,
     getTripAllLogsRoute,
     getDriverAllTripsRoute
]

export default routes;