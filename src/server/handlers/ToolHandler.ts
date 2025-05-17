import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { FhirClient } from "../connectors/fhir/FhirClient.js"
import { TOOL_DEFINITIONS } from "../constants/tools.js"
import { parseClinicianQuery } from "../../query-parser.js";
import { PubMed } from "../connectors/medical/PubMed.js"
import { ClinicalTrials } from "../connectors/medical/ClinicalTrials.js"
import { FDA } from "../connectors/medical/FDA.js"
import { CacheManager } from "../utils/Cache.js"
import { Auth } from "../utils/Auth.js"
import { AuthConfig} from "../utils/AuthConfig.js"

export class ToolHandler {
  private fhirClient: FhirClient;
  private cache: CacheManager;    
  private pubmedApi: PubMed;
  private trialsApi: ClinicalTrials;
  private fdaApi: FDA;
  private auth!: Auth;
  private authInitialized: boolean = false;
  private authConfig: AuthConfig;
  
  constructor(authConfig:AuthConfig, fhirClient: FhirClient, cache: CacheManager, pubmedApi: PubMed, trialsApi: ClinicalTrials, fdaApi: FDA) {
    this.authConfig = authConfig;
    this.cache = cache;
    this.fhirClient = fhirClient;
    this.pubmedApi = pubmedApi;
    this.trialsApi = trialsApi;
    this.fdaApi = fdaApi;
  }

  register(mcpServer: Server) {
    mcpServer.setRequestHandler(ListToolsRequestSchema, this.handleList);
    mcpServer.setRequestHandler(CallToolRequestSchema, this.handleCall);
  }

  private handleList = async () => ({
    tools: TOOL_DEFINITIONS
  });

  private handleCall = async (request: any) => {
    // Skip patient ID validation for tools that don't require it
    if(request.params?.name != "find_patient" && request.params?.name != "get-drug"
      && request.params?.name != "search-trials" && request.params?.name != "search-pubmed") 
     { 
      if (!request.params?.arguments?.patientId) {
        throw new McpError(ErrorCode.InvalidParams, "patientId is required");
      }
    }

    //initalize auth if not already initialized. this will set up the callback server 
    if(!this.authInitialized) {
      this.auth = new Auth(this.authConfig);
      this.authInitialized = true;
    }
 
    return this.auth.executeWithAuth(async () => {  

      const access_token = await this.auth.ensureValidToken();

      this.fhirClient.setAccessToken(access_token);

      switch (request.params.name) {
        case "clinical_query":
          return await this.handleClinicalQuery(request.params.arguments);
        case "find_patient":
          return await this.fhirClient.findPatient(request.params.arguments);
        case "get_patient_observations":
          return await this.fhirClient.getPatientObservations(request.params.arguments);
        case "get_patient_conditions":
          return await this.fhirClient.getPatientConditions(request.params.arguments);
        case "get_patient_medications":
          return await this.fhirClient.getPatientMedications(request.params.arguments);
        case "get_patient_encounters":
          return await this.fhirClient.getPatientEncounters(request.params.arguments);
        case "get_patient_allergies":
          return await this.fhirClient.getPatientAllergies(request.params.arguments);
        case "get_patient_procedures":
          return await this.fhirClient.getPatientProcedures(request.params.arguments);
        case "get_patient_careteam":
          return await this.fhirClient.getPatientCareTeam(request.params.arguments);
        case "get_patient_careplans":
          return await this.fhirClient.getPatientCarePlans(request.params.arguments);
        case "get_vital_signs":
          return await this.fhirClient.getPatientVitalSigns(request.params.arguments);
        case "get_lab_results":
          return await this.fhirClient.getPatientLabResults(request.params.arguments);
        case "get_medications_history":
          return await this.fhirClient.getMedicationHistory(request.params.arguments);
        case "get_appointments":
          return await this.fhirClient.getPatientAppointments(request.params.arguments);
        // Dialysis-specific tools
        case "get_dialysis_sessions":
          return await this.fhirClient.getDialysisSessions(request.params.arguments);
        case "track_dialysis_metrics":
          return await this.fhirClient.getDialysisMetrics(request.params.arguments);
        case "manage_vascular_access":
          return await this.fhirClient.getVascularAccess(request.params.arguments);
          
        // Dialysis Treatment Planning Tools
        case "schedule_dialysis_session":
          return await this.fhirClient.scheduleDialysisSession(request.params.arguments);
        case "get_dialysis_prescription":
          return await this.fhirClient.getDialysisPrescription(request.params.arguments);
        case "compare_dialysis_modalities":
          return await this.fhirClient.compareDialysisModalities(request.params.arguments);
          
        // Complication Monitoring Tools
        case "track_intradialytic_events":
          return await this.fhirClient.trackIntradialyticEvents(request.params.arguments);
        case "monitor_access_complications":
          return await this.fhirClient.monitorAccessComplications(request.params.arguments);
        case "assess_bleeding_risk":
          return await this.fhirClient.assessBleedingRisk(request.params.arguments);
          
        // Nutritional and Mineral Management Tools
        case "track_dialysis_diet":
          return await this.fhirClient.trackDialysisDiet(request.params.arguments);
        case "manage_mineral_bone_disorder":
          return await this.fhirClient.manageMineralBoneDisorder(request.params.arguments);
        case "calculate_protein_nitrogen_appearance":
          return await this.fhirClient.calculateProteinNitrogenAppearance(request.params.arguments);
          
        // Quality Measures and Outcomes Tools
        case "report_dialysis_quality_metrics":
          return await this.fhirClient.reportDialysisQualityMetrics(request.params.arguments);
        case "predict_hospitalization_risk":
          return await this.fhirClient.predictHospitalizationRisk(request.params.arguments);
        case "analyze_dialysis_population_trends":
          return await this.fhirClient.analyzeDialysisPopulationTrends(request.params.arguments);
        // Medical research tools
        case "search-pubmed":
          return await this.pubmedApi.getArticles(request.params.arguments,this.cache);
        case "search-trials":
          return await this.trialsApi.getTrials(request.params.arguments,this.cache);
        case "get-drug-info":
          return await this.fdaApi.getDrug(request.params.arguments,this.cache);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }
  

  private async handleClinicalQuery(args: any) {
    if (!args.query) {
      throw new McpError(ErrorCode.InvalidParams, "Query is required");
    }

    try {
      const queryParams = await parseClinicianQuery(args.query);
      return await this.fhirClient.executeQuery(queryParams);
    } catch (error) {
      return this.fhirClient.handleError(error);
    }
  }
} 