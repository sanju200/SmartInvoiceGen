import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Employee {
  id: string;
  name: string;
  ratePerHour: number;
  hours: number;
  total: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateEmployeeData extends Record<string, unknown> {
  [key: string]: unknown;
  name: string;
  ratePerHour: number;
  hours: number;
  total: number;
  projectId: string;
}

interface BulkCreateEmployeesData extends Record<string, unknown> {
  [key: string]: unknown;
  projectId: string;
  employees: Omit<CreateEmployeeData, 'projectId'>[];
}

interface UpdateEmployeeData extends Record<string, unknown> {
  [key: string]: unknown;
  name?: string;
  ratePerHour?: number;
  hours?: number;
  total?: number;
}

// Get employees for a project
export const useEmployees = (projectId: string) => {
  return useQuery({
    queryKey: ['employees', projectId],
    queryFn: async () => {
      return api.get<Employee[]>(`/employees/${projectId}`);
    },
    enabled: !!projectId,
  });
};

// Import snapshot atomically across all projects
export interface ImportSnapshotItem {
  projectId: string;
  tabName?: string;
  invoiceDate?: string;
  employees: Omit<CreateEmployeeData, 'projectId'>[];
}

export interface ImportSnapshotResponse {
  perProject: Array<{ projectId: string; insertedCount: number }>;
  clearedProjectIds: string[];
}

export const useImportSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { clearOthers?: boolean; items: ImportSnapshotItem[] }) => {
      return api.post<ImportSnapshotResponse>('/employees/import-snapshot', data);
    },
    onSuccess: () => {
      // Invalidate all project-related queries since multiple projects may change
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // It's hard to know which employees queries to invalidate; clear all employees queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => {
      console.error('Error importing snapshot:', error);
    },
  });
};

// Create a single employee
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEmployeeData) => {
      return api.post<Employee>('/employees', data);
    },
    onSuccess: (data) => {
      // Invalidate employees query for the project
      queryClient.invalidateQueries({ queryKey: ['employees', data.projectId] });
      // Invalidate project queries to update totals
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    },
    onError: (error) => {
      console.error('Error creating employee:', error);
    },
  });
};

// Create multiple employees
export const useBulkCreateEmployees = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkCreateEmployeesData) => {
      return api.post<Employee[]>('/employees/bulk', data);
    },
    onSuccess: (data, variables) => {
      // Invalidate employees query for the project
      queryClient.invalidateQueries({ queryKey: ['employees', variables.projectId] });
      // Invalidate project queries to update totals
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
    onError: (error) => {
      console.error('Error creating employees:', error);
    },
  });
};

// Update an employee
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeeData }) => {
      return api.put<Employee>(`/employees/${id}`, data);
    },
    onSuccess: (data) => {
      // Invalidate employees query for the project
      queryClient.invalidateQueries({ queryKey: ['employees', data.projectId] });
      // Invalidate project queries to update totals
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    },
    onError: (error) => {
      console.error('Error updating employee:', error);
    },
  });
};

// Delete an employee
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Get the employee from cache to determine projectId
      const employeesQueries = queryClient.getQueriesData({ queryKey: ['employees'] });
      
      employeesQueries.forEach(([data]) => {
        if (Array.isArray(data)) {
          const employee = data.find((emp: Employee) => emp.id === id);
          if (employee) {
            // Invalidate queries for this project
            queryClient.invalidateQueries({ queryKey: ['employees', employee.projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', employee.projectId] });
          }
        }
      });
    },
    onError: (error) => {
      console.error('Error deleting employee:', error);
    },
  });
};
