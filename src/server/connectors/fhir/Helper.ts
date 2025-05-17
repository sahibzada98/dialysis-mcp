// Enhanced Helper Functions
export function formatPatientSearchResults(bundle: any) {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No patients found matching search criteria";
    }
  
    return bundle.entry
      .map((entry: any) => {
        const patient = entry.resource;
        const name = patient.name?.[0];
        const address = patient.address?.[0];
        
        return `Patient ID: ${patient.id}
                Name: ${name?.family}, ${name?.given?.join(' ')}
                DOB: ${patient.birthDate}
                Gender: ${patient.gender}
                Address: ${formatAddress(address)}
                Phone: ${patient.telecom?.find((t: Telecom) => t.system === 'phone')?.value || 'Not provided'}
                -----------------`;
        }).join('\n\n');
}
  
export function formatVitalSigns(bundle: any) {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No vital signs recorded for the specified period";
    }
  
    // Group vitals by date
    const vitalsByDate = new Map();
    
    bundle.entry.forEach((entry: any) => {
      const vital = entry.resource;
      const date = vital.effectiveDateTime.split('T')[0];
      
      if (!vitalsByDate.has(date)) {
        vitalsByDate.set(date, new Map());
      }
      
      const vitalType = vital.code?.coding?.[0]?.display || vital.code?.text;
      const value = `${vital.valueQuantity?.value} ${vital.valueQuantity?.unit}`;
      vitalsByDate.get(date).set(vitalType, value);
    });
  
    // Format output
    return Array.from(vitalsByDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
      .map(([date, vitals]) => {
        const vitalsStr = Array.from(vitals.entries())
          .map(([type, value]:any) => `  ${type}: ${value}`)
          .join('\n');
        return `Date: ${date}\n${vitalsStr}`;
      })
      .join('\n\n');
}
  
export function formatLabResults(bundle: any) {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No lab results found for the specified criteria";
    }
  
    // Group labs by panel/category
    const labsByPanel = new Map();
    
    bundle.entry.forEach((entry: any) => {
      const lab = entry.resource;
      const panel = lab.code?.coding?.[0]?.display || 'Other';
      
      if (!labsByPanel.has(panel)) {
        labsByPanel.set(panel, []);
      }
      
      labsByPanel.get(panel).push({
        date: lab.effectiveDateTime.split('T')[0],
        value: lab.valueQuantity?.value,
        unit: lab.valueQuantity?.unit,
        reference: lab.referenceRange?.[0],
        interpretation: lab.interpretation?.[0]?.coding?.[0]?.code
      });
    });
  
    // Format output with trending indicators
    return Array.from(labsByPanel.entries())
      .map(([panel, results]) => {
        const sortedResults:any = results.sort((a:any, b:any) => b.date.localeCompare(a.date));
        const resultsStr = sortedResults
          .map((result: LabResult) => {
            const trend = calculateTrend(result, sortedResults);
            const interpretation = formatInterpretation(result);
            return `  ${result.date}: ${result.value} ${result.unit} ${interpretation} ${trend}`;
          })
          .join('\n');
        return `${panel}:\n${resultsStr}`;
      })
      .join('\n\n');
}

export function formatCarePlans(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No care plans found";
    }
    return bundle.entry.map((entry: any) => {
      const carePlan = entry.resource;
      return `
        - Category: ${carePlan.category?.[0]?.coding?.[0]?.display || carePlan.category?.[0]?.text || 'Unknown'}
        - Start Date: ${carePlan.period?.start?.split('T')[0] || 'unknown date'}
        - End Date: ${carePlan.period?.end?.split('T')[0] || 'unknown date'}
        - Status: ${carePlan.status}
        - Details: 
            ${carePlan.activity?.map((activity: any) => `
            - Activity: ${activity.detail?.code?.text || activity.detail?.code?.coding?.[0]?.display || 'No details provided'}
            - Status: ${activity.detail?.status || 'unknown status'}
            - Location: ${activity.detail?.location.display || activity.detail?.location?.text || 'No location provided'}
            - Performer: ${activity.detail?.performer?.display || activity.detail?.performer?.reference || 'No performer provided'}`).join('\n')}
        `
    }).join('\n');
}

export function formatImmunizations(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No immunizations found";
    }
    return bundle.entry.map((entry: any) => {
      const immunization = entry.resource;
      return `
      
        - ${immunization.vaccineCode?.coding?.[0]?.display || 'Unknown vaccine'}
        - ${immunization.occurrenceDateTime?.split('T')[0] || 'unknown date'}
        - ${immunization.status}
        `
      }).join('\n');
}

export function formatProcedures(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No procedures found";
    }
    return bundle.entry.map((entry: any) => {
      const procedure = entry.resource;
      return `
        - ${procedure.code?.coding?.[0]?.display || 'Unknown procedure'}
        - Start: ${procedure.performedPeriod?.start?.split('T')[0] || 'unknown date'}
        - End: ${procedure.performedPeriod?.end?.split('T')[0] || 'unknown date'}
        - Status: ${procedure.status}
        `
    }).join('\n')
}

export function formatEncounters(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No encounters found";
    }
    return bundle.entry.map((entry: any) => {
      const encounter = entry.resource;
      //include the date of the encounter and the type of encounter and reason for encounter and status
      return `- ${encounter.period?.start?.split('T')[0] || 'unknown date'}
              - ${encounter.type?.[0]?.coding?.[0]?.display || 'Unknown encounter type'}
              - ${encounter.reasonCode?.[0]?.coding?.[0]?.display || encounter.reasonCode?.[0]?.text || 'Unknown reason for encounter'}
              - ${encounter.status}
              `
    }).join('\n');
}

export function formatAppointments(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No appointments found";
    }
    return bundle.entry.map((entry: any) => {
      const appointment = entry.resource;
      return `- ${appointment.status}
              - ${appointment.appointmentType?.[0]?.coding?.[0]?.display || appointment.appointmentType?.[0]?.text || 'Unknown appointment type'}
              - ${appointment.reasonReference?.[0]?.display || appointment.reasonReference?.[0]?.reference || 'Unknown reason for appointment'}
              - ${appointment.start?.split('T')[0] || 'unknown date'}
              - ${appointment.end?.split('T')[0] || 'unknown date'}
              `
    }).join('\n');
}

// New Analysis Features
export function calculateTrend(current: any, history: any[]) {
    if (history.length < 2) return '';
    
    const currentValue = current.value;
    const previousValue = history[1].value;
    
    if (currentValue === previousValue) return '→';
    if (currentValue > previousValue) return '↑';
    return '↓';
}
  
export function formatInterpretation(result: any) {
    if (!result.reference || !result.value) return '';
    
    const low = result.reference.low?.value;
    const high = result.reference.high?.value;
    const value = result.value;
    
    if (low && value < low) return '⚠️ Below range';
    if (high && value > high) return '⚠️ Above range';
    return '✓ Normal';
}

export function mapCategoryToLoinc(category: string): string | undefined {
    const loincMap:any = {
      'CBC': '58410-2',
      'METABOLIC': '24323-8',
      'LIPIDS': '57698-3',
      'THYROID': '83937-0',
      'URINALYSIS': '24356-8'
      // Add more mappings as needed
    };
    
    return loincMap[category.toUpperCase()];
  }
  
export function formatAddress(address: any): string {
    if (!address) return 'Not provided';
    
    const parts = [
      address.line?.join(' '),
      address.city,
      address.state,
      address.postalCode
    ].filter(Boolean);
    
    return parts.join(', ');
}


// Utility functions
export function calculateTimeframeDate(timeframe: string): string | null {
    const match = timeframe.match(/^(\d+)([my])$/);
    if (!match) return null;
  
    const [, value, unit] = match;
    const date = new Date();
    
    if (unit === 'm') {
      date.setMonth(date.getMonth() - parseInt(value));
    } else if (unit === 'y') {
      date.setFullYear(date.getFullYear() - parseInt(value));
    }
  
    return date.toISOString().split('T')[0];
}
  
export function formatPreventiveProcedures(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No preventive procedures recorded";
    }
  
    const procedures = bundle.entry
      .map((entry: any) => {
        const proc = entry.resource;
        return `- ${proc.code?.coding?.[0]?.display || 'Unknown procedure'} ` +
          `(${proc.performedDateTime?.split('T')[0] || 'unknown date'})`;
      })
      .join('\n');
  
    return procedures;
}
  
export function formatRecentHealthMetrics(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No recent health metrics available";
    }
  
    const metrics = new Map();
    
    bundle.entry.forEach((entry: any) => {
      const obs = entry.resource;
      const type = obs.code?.coding?.[0]?.display || 'Unknown';
      
      if (!metrics.has(type)) {
        metrics.set(type, {
          value: `${obs.valueQuantity?.value || 'No value'} ${obs.valueQuantity?.unit || ''}`,
          date: obs.effectiveDateTime?.split('T')[0] || 'unknown date'
        });
      }
    });
  
    return Array.from(metrics.entries())
      .map(([type, data]: [string, Metric]) => `- ${type}: ${data.value} (${data.date})`)
      .join('\n');
}
  
export function formatChronicConditions(conditions: any[]): string {
    if (!conditions || conditions.length === 0) {
      return "No chronic conditions documented";
    }
  
    return conditions
      .map((entry: any) => {
        const condition = entry.resource;
        return `- ${condition.code?.coding?.[0]?.display || 'Unknown condition'} ` +
          `(onset: ${condition.onsetDateTime?.split('T')[0] || 'unknown'})` +
          `${condition.clinicalStatus?.coding?.[0]?.code === 'active' ? ' - Active' : ''}`;
      })
      .join('\n');
}
  
export function formatDiseaseMetrics(observations: any, conditions: any[]): string {
    if (!observations.entry || !conditions || conditions.length === 0) {
      return "No disease-specific metrics available";
    }
  
    const diseaseMetrics = new Map();
    
    conditions.forEach((condition: any) => {
      const metrics = getRelevantMetrics(observations.entry, condition.resource);
      if (metrics.length > 0) {
        diseaseMetrics.set(
          condition.resource.code?.coding?.[0]?.display || 'Unknown condition',
          metrics
        );
      }
    });
  
    return Array.from(diseaseMetrics.entries())
      .map(([condition, metrics]: [string, string[]]) => 
        `${condition}:\n${metrics.map((m: string) => `  - ${m}`).join('\n')}`)
      .join('\n\n');
}
  
export function getRelevantMetrics(observations: any[], condition: any): string[] {
    // Map conditions to relevant LOINC codes
    const metricMap:any = {
      'Diabetes': ['4548-4', '17856-6'], // HbA1c, Glucose
      'Hypertension': ['8480-6', '8462-4'], // Systolic BP, Diastolic BP
      'Hyperlipidemia': ['2093-3', '2571-8'], // Cholesterol, Triglycerides
    };
  
    const conditionName = condition.code?.coding?.[0]?.display || '';
    const relevantCodes = metricMap[conditionName] || [];
  
    return observations
      .filter((obs: any) => {
        const obsCode = obs.resource.code?.coding?.[0]?.code;
        return relevantCodes.includes(obsCode);
      })
      .map((obs: any) => {
        const value = obs.resource.valueQuantity?.value || 'No value';
        const unit = obs.resource.valueQuantity?.unit || '';
        const date = obs.resource.effectiveDateTime?.split('T')[0] || 'unknown date';
        const name = obs.resource.code?.coding?.[0]?.display || 'Unknown metric';
        return `${name}: ${value} ${unit} (${date})`;
      });
}
  
export function formatCareTeam(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No care team members documented";
    }
  
    return bundle.entry
      .map((entry: any) => {
        const role = entry.resource;
        return `- ${role.practitioner?.display || 'Unknown provider'} ` +
          `(${role.specialty?.[0]?.coding?.[0]?.display || 'Unknown specialty'})` +
          `\n  Contact: ${role.telecom?.[0]?.value || 'Not provided'}`;
      })
      .join('\n');
}
  
export function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
}

export function formatConditions(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No active conditions";
    }
  
    return bundle.entry
      .map((entry: any) => {
        const condition = entry.resource;
        return `
          - Name: ${condition.code?.coding?.[0]?.display || condition.code?.text || 'Unknown Condition'}
          - Code: ${condition.code?.coding?.[0]?.code || 'Unknown'}
          - System: ${condition.code?.coding?.[0]?.system || 'Unknown'}
          - OnSet Date: ${condition.onsetDateTime ? ` (onset: ${condition.onsetDateTime.split('T')[0]})` : ''}
          - Status: ${condition.status}
          `
      })
      .join('\n');
  }
  
export function formatMedications(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No active medications";
    }
  
    return bundle.entry
      .map((entry: any) => {
        const med = entry.resource;
        return `
          - ${med.medicationCodeableConcept?.text || 'Unknown Medication'}
          - Dosage: ${med.dosage}
          - Frequency: ${med.frequency}
          - ${med.dosageInstruction?.[0]?.text || 'No dosage instructions'}
          - As Needed: ${med.dosageInstruction?.[0]?.asNeededBoolean || 'Not specified'}
          - Related Condition: ${med.condition || 'Not specified'}
          `
       })
      .join('\n');
}
  
export function formatAllergies(bundle: any): string {
    if (!bundle.entry || bundle.entry.length === 0) {
      return "No known allergies";
    }
  
    return bundle.entry
      .map((entry: any) => {
        const allergy = entry.resource;
        return `
          - ${allergy.code?.coding?.[0]?.display || allergy.code?.text || 'Unknown Allergen'} 
          - ${allergy.type || 'unknown type'}, ${allergy.criticality || 'unknown criticality'}
          `
      })
      .join('\n');
}
  
export function formatPatientSummary(data: any): string {
    if (!data?.patient) {
      return "No patient data available";
    }
  
    const patient = data.patient;
    const name = patient.name?.[0] ?? {};
    
    return `
      - Name: ${name.family ?? 'Unknown'}, ${name.given?.join(' ') ?? 'Unknown'}
      - DOB: ${patient.birthDate ?? 'Unknown'}
      - Gender: ${patient.gender ?? 'Unknown'}
      - Address: ${formatAddress(patient.address?.[0])}
      - Phone: ${patient.telecom?.find((t: Telecom) => t.system === 'phone')?.value ?? 'Not provided'}
      - Age: ${patient.birthDate ? calculateAge(patient.birthDate) : 'Unknown'}
      - Conditions: ${formatConditions(data.conditions ?? [])}
      - Medications: ${formatMedications(data.medications ?? [])}
      - Allergies: ${formatAllergies(data.allergies ?? [])}
      - Immunizations: ${formatImmunizations(data.immunizations ?? [])}
      - Procedures: ${formatProcedures(data.procedures ?? [])}
      - Care Plans: ${formatCarePlans(data.carePlans ?? [])}
      - Lab Results: ${formatLabResults(data.recentLabs ?? [])}
      - Encounters: ${formatEncounters(data.encounters ?? [])}
      - Appointments: ${formatAppointments(data.appointments ?? [])}
    `;
} 
  
export interface LabResult {
    date: string;
    value: number;
    unit: string;
    reference?: {
      low?: { value: number };
      high?: { value: number };
    };
    interpretation?: {
      coding?: Array<{ code: string }>;
    };
}

export interface Telecom {
    system: string;
    value: string;
}

export interface Metric {
  value: string;
  date: string;
}

// Dialysis-specific formatting functions
export function formatDialysisSessions(bundle: any): string {
  if (!bundle.entry || bundle.entry.length === 0) {
    return "No dialysis sessions found for the specified criteria";
  }

  return bundle.entry
    .map((entry: any) => {
      const session = entry.resource;
      
      // Extract basic session information
      const startTime = session.period?.start ? new Date(session.period.start) : null;
      const endTime = session.period?.end ? new Date(session.period.end) : null;
      
      // Calculate duration if both start and end times are available
      let duration = '';
      if (startTime && endTime) {
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        duration = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
      }
      
      // Format the session date and time
      const sessionDate = startTime ? startTime.toISOString().split('T')[0] : 'Unknown date';
      const sessionTime = startTime ? 
        `${startTime.toTimeString().split(' ')[0]} - ${endTime ? endTime.toTimeString().split(' ')[0] : 'ongoing'}` : 
        'Unknown time';
      
      // Extract ultrafiltration volume from observations linked to this procedure
      const ufVolume = session.extension?.find((ext: any) => 
        ext.url === "http://hl7.org/fhir/StructureDefinition/procedure-targetBodySite" &&
        ext.valueReference?.display === "Ultrafiltration volume"
      )?.valueQuantity?.value || 'Not recorded';
      
      const ufUnit = session.extension?.find((ext: any) => 
        ext.url === "http://hl7.org/fhir/StructureDefinition/procedure-targetBodySite" &&
        ext.valueReference?.display === "Ultrafiltration volume"
      )?.valueQuantity?.unit || 'L';
      
      // Extract complications
      const complications = session.complication?.map((comp: any) => 
        comp.coding?.[0]?.display || 'Unknown complication'
      ).join(', ') || 'None recorded';
      
      // Extract location
      const location = session.locationReference?.display || session.location?.display || 'Unknown location';
      
      return `
Session Date: ${sessionDate}
Time: ${sessionTime}
Duration: ${duration || 'Not completed'}
Location: ${location}
Status: ${session.status || 'Unknown status'}
Ultrafiltration Volume: ${ufVolume} ${ufUnit}
Complications: ${complications}
${session.note ? `Notes: ${session.note.map((n: any) => n.text).join(', ')}` : ''}
-------------------`;
    })
    .join('\n');
}

export function formatDialysisMetrics(bundle: any, metricType: string, format: string): string {
  if (!bundle.entry || bundle.entry.length === 0) {
    return `No ${metricType} metrics found for the specified criteria`;
  }
  
  // Filter observations based on metric type
  const metricCodes: any = {
    'kt-v': ['81883-2'], // LOINC code for Kt/V
    'urr': ['51952-9'],  // LOINC code for Urea reduction ratio
    'fluid-removal': ['76297-2', '3141-9'], // LOINC codes for fluid removal and weight change
    'all': ['81883-2', '51952-9', '76297-2', '3141-9']
  };
  
  const relevantCodes = metricCodes[metricType] || metricCodes['all'];
  
  const filteredEntries = bundle.entry.filter((entry: any) => {
    const coding = entry.resource.code?.coding || [];
    return coding.some((code: any) => relevantCodes.includes(code.code));
  });
  
  if (filteredEntries.length === 0) {
    return `No ${metricType} metrics found for the specified criteria`;
  }
  
  // Sort entries by date (newest first)
  filteredEntries.sort((a: any, b: any) => {
    const dateA = a.resource.effectiveDateTime || '';
    const dateB = b.resource.effectiveDateTime || '';
    return dateB.localeCompare(dateA);
  });
  
  // Format based on requested format
  if (format === 'latest') {
    // Group by metric and show only the latest value for each
    const metricGroups = new Map();
    
    filteredEntries.forEach((entry: any) => {
      const code = entry.resource.code?.coding?.[0]?.code || 'unknown';
      const display = entry.resource.code?.coding?.[0]?.display || 'Unknown metric';
      
      if (!metricGroups.has(code)) {
        metricGroups.set(code, {
          name: display,
          value: entry.resource.valueQuantity?.value || 'No value',
          unit: entry.resource.valueQuantity?.unit || '',
          date: entry.resource.effectiveDateTime?.split('T')[0] || 'unknown date',
          interpretation: formatInterpretation(entry.resource)
        });
      }
    });
    
    return Array.from(metricGroups.values())
      .map((metric: any) => `${metric.name}: ${metric.value} ${metric.unit} (${metric.date}) ${metric.interpretation}`)
      .join('\n');
  }
  else if (format === 'trend') {
    // Group by metric type and show historical trend
    const metricGroups = new Map();
    
    filteredEntries.forEach((entry: any) => {
      const code = entry.resource.code?.coding?.[0]?.code || 'unknown';
      const display = entry.resource.code?.coding?.[0]?.display || 'Unknown metric';
      
      if (!metricGroups.has(code)) {
        metricGroups.set(code, {
          name: display,
          values: []
        });
      }
      
      metricGroups.get(code).values.push({
        value: entry.resource.valueQuantity?.value || 'No value',
        unit: entry.resource.valueQuantity?.unit || '',
        date: entry.resource.effectiveDateTime?.split('T')[0] || 'unknown date'
      });
    });
    
    return Array.from(metricGroups.entries())
      .map(([code, data]: [string, any]) => {
        const values = data.values
          .map((v: any) => `  ${v.date}: ${v.value} ${v.unit}`)
          .join('\n');
        
        return `${data.name}:\n${values}`;
      })
      .join('\n\n');
  }
  else { // summary
    // Calculate statistics for each metric type
    const metricGroups = new Map();
    
    filteredEntries.forEach((entry: any) => {
      const code = entry.resource.code?.coding?.[0]?.code || 'unknown';
      const display = entry.resource.code?.coding?.[0]?.display || 'Unknown metric';
      const value = entry.resource.valueQuantity?.value;
      
      if (!metricGroups.has(code)) {
        metricGroups.set(code, {
          name: display,
          unit: entry.resource.valueQuantity?.unit || '',
          values: [],
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity
        });
      }
      
      const group = metricGroups.get(code);
      
      if (value !== undefined && !isNaN(value)) {
        group.values.push(value);
        group.count++;
        group.sum += value;
        group.min = Math.min(group.min, value);
        group.max = Math.max(group.max, value);
      }
    });
    
    return Array.from(metricGroups.values())
      .map((metric: any) => {
        if (metric.count === 0) {
          return `${metric.name}: No valid values recorded`;
        }
        
        const avg = metric.sum / metric.count;
        return `${metric.name} (${metric.unit}):\n` +
               `  Latest: ${metric.values[0]}\n` +
               `  Average: ${avg.toFixed(2)}\n` +
               `  Range: ${metric.min.toFixed(2)} - ${metric.max.toFixed(2)}\n` +
               `  Measurements: ${metric.count}`;
      })
      .join('\n\n');
  }
}

export function formatVascularAccess(bundle: any, includeHistory: boolean): string {
  if (!bundle.entry || bundle.entry.length === 0) {
    return "No vascular access information found for the specified criteria";
  }
  
  // Sort by date (newest first) for current access, but chronological for history
  const sortedEntries = [...bundle.entry];
  sortedEntries.sort((a: any, b: any) => {
    const dateA = a.resource.performedDateTime || a.resource.performedPeriod?.start || '';
    const dateB = b.resource.performedDateTime || b.resource.performedPeriod?.start || '';
    return includeHistory ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
  });
  
  // If not including history, only show the most recent access of each type
  const accessEntries = includeHistory ? sortedEntries : 
    sortedEntries.filter((entry: any, index: number, self: any[]) => {
      const accessType = getAccessType(entry.resource);
      return index === self.findIndex((e: any) => getAccessType(e.resource) === accessType);
    });
  
  return accessEntries
    .map((entry: any) => {
      const access = entry.resource;
      const accessType = getAccessType(access);
      const location = access.bodySite?.coding?.[0]?.display || access.bodySite?.text || 'Unknown location';
      const date = access.performedDateTime?.split('T')[0] || 
                  access.performedPeriod?.start?.split('T')[0] || 
                  'Unknown date';
      
      // Get complications if any
      const complications = access.complication?.map((comp: any) => 
        comp.coding?.[0]?.display || comp.text || 'Unknown complication'
      ).join(', ') || 'None recorded';
      
      // Get assessment results if any
      const assessments = access.extension?.filter((ext: any) => 
        ext.url === "http://hl7.org/fhir/StructureDefinition/procedure-followUp"
      ).map((ext: any) => 
        ext.valueCodeableConcept?.coding?.[0]?.display || 
        ext.valueCodeableConcept?.text || 
        'Unknown assessment'
      ).join(', ') || 'No assessment recorded';
      
      return `
Access Type: ${accessType}
Location: ${location}
Creation/Modification Date: ${date}
Status: ${access.status || 'Unknown status'}
${complications !== 'None recorded' ? `Complications: ${complications}` : 'No complications recorded'}
Assessment: ${assessments}
${access.note ? `Notes: ${access.note.map((n: any) => n.text).join(', ')}` : ''}
-------------------`;
    })
    .join('\n');
}

// Helper function to determine access type from procedure codes
function getAccessType(procedure: any): string {
  const coding = procedure.code?.coding || [];
  const code = coding[0]?.code || '';
  const display = coding[0]?.display || '';
  
  // Check for common procedure codes or descriptions
  if (code === '34530-6' || display.toLowerCase().includes('fistula')) {
    return 'Arteriovenous Fistula';
  }
  else if (code === '34532-2' || display.toLowerCase().includes('graft')) {
    return 'Arteriovenous Graft';
  }
  else if (code === '36818' || display.toLowerCase().includes('catheter')) {
    return 'Central Venous Catheter';
  }
  else {
    return display || 'Unknown Access Type';
  }
}

