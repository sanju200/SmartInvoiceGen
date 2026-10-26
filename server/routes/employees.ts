import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ratePerHour: z.number(),
  hours: z.number().positive('Hours must be positive'),
  total: z.number(),
  projectId: z.string().min(1, 'Project ID is required')
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  ratePerHour: z.number().optional(),
  hours: z.number().positive('Hours must be positive').optional(),
  total: z.number().optional()
});

const bulkCreateEmployeesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  employees: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    ratePerHour: z.number(),
    hours: z.number().positive('Hours must be positive'),
    total: z.number()
  }))
});

// Snapshot import schema (atomic replace across all projects)
const snapshotImportSchema = z.object({
  clearOthers: z.boolean().optional().default(true),
  items: z.array(z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    tabName: z.string().optional(),
    // Accept invoiceDate as YYYY-MM-DD string (optional)
    invoiceDate: z.string().optional(),
    employees: z.array(z.object({
      name: z.string().min(1, 'Name is required'),
      ratePerHour: z.number(),
      hours: z.number().positive('Hours must be positive'),
      total: z.number()
    }))
  }))
});

// GET /api/employees/:projectId - Get all employees for a project
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = (req as AuthenticatedRequest).user!.id;

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const employees = await prisma.employee.findMany({
      where: {
        projectId
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/employees/import-snapshot - Atomically replace employees across user's projects
router.post('/import-snapshot', authenticateToken, async (req, res) => {
  try {
    const { clearOthers, items } = snapshotImportSchema.parse(req.body);

    // Fetch all projects (accessible to all authenticated users)
    const allProjects = await prisma.project.findMany({
      select: { id: true }
    });
    const allProjectIds = new Set(allProjects.map(p => p.id));

    // Validate provided projectIds exist
    const providedIds = new Set(items.map(i => i.projectId));
    for (const pid of providedIds) {
      if (!allProjectIds.has(pid)) {
        return res.status(404).json({ error: `Project not found: ${pid}` });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Clear employees for projects not included, if requested
      let clearedProjectIds: string[] = [];
      if (clearOthers) {
        const others = [...allProjectIds].filter(id => !providedIds.has(id));
        if (others.length > 0) {
          await tx.employee.deleteMany({ where: { projectId: { in: others } } });
          // Clear import metadata for projects not included
          await tx.project.updateMany({
            where: { id: { in: others } },
            data: {
              lastImportedAt: null,
              lastImportedTab: null,
              lastImportedEmployeeCount: 0,
            },
          });
          clearedProjectIds = others;
        }
      }

      // Replace for each provided project
      const perProject: Array<{ projectId: string; insertedCount: number }> = [];
      for (const item of items) {
        await tx.employee.deleteMany({ where: { projectId: item.projectId } });
        if (item.employees.length > 0) {
          await tx.employee.createMany({
            data: item.employees.map(e => ({
              name: e.name,
              ratePerHour: e.ratePerHour,
              hours: e.hours,
              total: e.total,
              projectId: item.projectId,
            }))
          });
        }
        const count = await tx.employee.count({ where: { projectId: item.projectId } });
        // Update project import metadata (including optional invoice date)
        const projectUpdateData: {
          lastImportedAt: Date;
          lastImportedTab: string | null;
          lastImportedEmployeeCount: number;
          lastImportedInvoiceDate?: Date;
          // Keep workPeriod in sync with imported invoiceDate month/year
          workPeriod?: string;
        } = {
          lastImportedAt: new Date(),
          lastImportedTab: item.tabName ?? null,
          lastImportedEmployeeCount: count,
        };
        if (item.invoiceDate) {
          const parsed = new Date(item.invoiceDate);
          if (!isNaN(parsed.getTime())) {
            projectUpdateData.lastImportedInvoiceDate = parsed;

            // Derive workPeriod label like "March 2025" from the imported invoice date
            const monthLabel = parsed.toLocaleDateString('en-US', { month: 'long' });
            const year = parsed.getFullYear();
            projectUpdateData.workPeriod = `${monthLabel} ${year}`;
          }
        }

        await tx.project.update({
          where: { id: item.projectId },
          data: projectUpdateData,
        });
        perProject.push({ projectId: item.projectId, insertedCount: count });
      }

      return { perProject, clearedProjectIds };
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error importing snapshot:', error);
    res.status(500).json({ error: 'Failed to import snapshot. Please try again.' });
  }
});

// POST /api/employees - Create a new employee
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, ratePerHour, hours, total, projectId } = createEmployeeSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        ratePerHour,
        hours,
        total,
        projectId
      }
    });

    res.status(201).json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/employees/bulk - Replace employees for a project with the provided list
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { projectId, employees } = bulkCreateEmployeesSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Replace semantics: delete existing employees for this project, then insert new ones
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing employees for the project
      await tx.employee.deleteMany({ where: { projectId } });

      // Create new employees (use createMany for efficiency)
      if (employees.length === 0) {
        return [] as typeof employees;
      }

      await tx.employee.createMany({
        data: employees.map((emp) => ({
          name: emp.name,
          ratePerHour: emp.ratePerHour,
          hours: emp.hours,
          total: emp.total,
          projectId,
        })),
      });

      // Return the inserted employees as a list
      const created = await tx.employee.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });
      return created;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error replacing employees:', error);
    res.status(500).json({ error: 'Failed to import employees. Please try again.' });
  }
});

// PUT /api/employees/:id - Update an employee
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;
    const updates = updateEmployeeSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;

    // Verify employee exists and user owns the project
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId
      },
      include: {
        project: true
      }
    });

    if (!employee || employee.project.userId !== userId) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: updates
    });

    res.json(updatedEmployee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/employees/:id - Delete an employee
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;
    const userId = (req as AuthenticatedRequest).user!.id;

    // Verify employee exists and user owns the project
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId
      },
      include: {
        project: true
      }
    });

    if (!employee || employee.project.userId !== userId) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await prisma.employee.delete({
      where: { id: employeeId }
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
