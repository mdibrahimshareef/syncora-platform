import { WorkflowPlan, RiskLevel } from './workflow-schema';

export function calculateToolRisk(toolName: string): RiskLevel {
  switch (toolName) {
    // Read operations
    case 'get_my_work':
    case 'get_project_health':
    case 'get_workspace_insights':
    case 'search':
      return 'LOW';
    
    // Mutations
    case 'create_task':
    case 'update_task':
    case 'assign_task':
    case 'create_project':
    case 'update_project':
      return 'MEDIUM';
    
    // Destructive / High Risk (Currently blocked, but classified here)
    case 'delete_task':
    case 'archive_project':
    case 'bulk_delete':
    case 'update_permissions':
      return 'HIGH';
      
    default:
      // Unknown tools default to HIGH for safety
      return 'HIGH';
  }
}

export function calculatePlanRisk(plan: WorkflowPlan): RiskLevel {
  let highestRisk: RiskLevel = 'LOW';
  
  for (const step of plan.steps) {
    const risk = calculateToolRisk(step.tool);
    // Overwrite LLM's risk with authoritative server risk
    step.risk = risk;
    
    if (risk === 'HIGH') {
      highestRisk = 'HIGH';
    } else if (risk === 'MEDIUM' && highestRisk !== 'HIGH') {
      highestRisk = 'MEDIUM';
    }
  }
  
  // Bulk heuristic (>3 mutations -> HIGH)
  const mutationCount = plan.steps.filter(s => calculateToolRisk(s.tool) !== 'LOW').length;
  if (mutationCount > 3) {
    highestRisk = 'HIGH';
  }
  
  return highestRisk;
}
