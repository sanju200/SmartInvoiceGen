import { RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { z } from "zod";
import { AuthenticatedRequest } from "../auth";

// Validation schemas
const GenericExcelUploadSchema = z.object({
  fileName: z.string().min(1).max(255).optional(),
  sheetName: z.string().min(1).max(255),
  invoiceDate: z.string().min(1).max(32).optional(),
  headers: z.array(z.string().max(2000)).min(1).max(200),
  rows: z.array(z.array(z.string().max(2000)).max(200)).max(5000),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  isCopy: z.boolean().optional().default(false),
  originalProjectId: z.string().optional(),
  description: z.string().optional(),
  uniqueProjectIdentifier: z.string().min(1),
  customerName: z.string().min(1),
  customerAddress: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  agreementType: z.enum(["SOW", "MSA"]).default("SOW"),
  agreementRef: z.string(),
  poNumber: z.string().optional(),
  invoicePurpose: z.string(),
  currency: z.string().default("EUR"),
  workPeriod: z.string().optional(),
  vatPercentage: z.number().min(0).max(100).optional().default(0),
  taxIdentificationType: z.enum(["VAT", "FISCAL_ID"]).optional(),
  taxNumber: z.string().optional(),
  status: z.string().default("active"),
  paymentDueDays: z.number().int().nonnegative().optional(),
  genericExcelUpload: GenericExcelUploadSchema.optional(),
  genericExcelUploads: z.array(GenericExcelUploadSchema).max(50).optional(),
});

const UpdateProjectSchema = CreateProjectSchema.omit({ genericExcelUpload: true, genericExcelUploads: true }).extend({
  originalProjectId: z.string().nullable().optional(),
}).partial();

// Get all projects for all users
export const getProjects: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        employees: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    let genericProjectIds = new Set<string>();
    let latestGenericByProjectId = new Map<string, { sheetName?: string; createdAt?: string | Date }>();
    let genericSheetCountByProjectId = new Map<string, number>();
    let genericHasDataRowsByProjectId = new Map<string, boolean>();
    try {
      const prismaAny = prisma as unknown as {
        $queryRaw?: (query: unknown) => Promise<unknown>;
      };

      if (prismaAny.$queryRaw) {
        const rows = await prismaAny.$queryRaw(
          Prisma.sql`
            SELECT DISTINCT "projectId"
            FROM "generic_excel_uploads"
          `,
        );

        if (Array.isArray(rows)) {
          genericProjectIds = new Set(
            (rows as Array<{ projectId?: unknown }>).
              map((r) => String(r.projectId ?? ''))
              .filter(Boolean),
          );
        }

        const latestRows = await prismaAny.$queryRaw(
          Prisma.sql`
            SELECT DISTINCT ON ("projectId")
              "projectId",
              "sheetName",
              "createdAt"
            FROM "generic_excel_uploads"
            ORDER BY "projectId", "createdAt" DESC
          `,
        );

        if (Array.isArray(latestRows)) {
          latestGenericByProjectId = new Map(
            (latestRows as Array<{ projectId?: unknown; sheetName?: unknown; createdAt?: unknown }>).
              map((r) => [
                String(r.projectId ?? ''),
                { sheetName: String(r.sheetName ?? ''), createdAt: r.createdAt as unknown as string | Date },
              ] as const)
              .filter(([k, v]) => Boolean(k) && Boolean(v.sheetName)),
          );
        }

        const countRows = await prismaAny.$queryRaw(
          Prisma.sql`
            SELECT "projectId", COUNT(*)::int as "count"
            FROM "generic_excel_uploads"
            GROUP BY "projectId"
          `,
        );

        if (Array.isArray(countRows)) {
          genericSheetCountByProjectId = new Map(
            (countRows as Array<{ projectId?: unknown; count?: unknown }>).
              map((r) => [String(r.projectId ?? ''), Number(r.count ?? 0)] as const)
              .filter(([k]) => Boolean(k)),
          );
        }

        // Check if each project has actual data rows (not just headers or total rows)
        const dataRowsCheckRows = await prismaAny.$queryRaw(
          Prisma.sql`
            SELECT "projectId",
              BOOL_OR(
                jsonb_array_length(rows) > 0 AND
                EXISTS (
                  SELECT 1 FROM jsonb_array_elements(rows) AS row
                  WHERE LOWER(TRIM(row->>0)) NOT IN ('__meta_total__', 'total')
                )
              ) as "hasDataRows"
            FROM "generic_excel_uploads"
            GROUP BY "projectId"
          `,
        );

        if (Array.isArray(dataRowsCheckRows)) {
          for (const row of dataRowsCheckRows as Array<{ projectId?: unknown; hasDataRows?: unknown }>) {
            const pid = String(row.projectId ?? '');
            if (pid) {
              genericHasDataRowsByProjectId.set(pid, Boolean(row.hasDataRows));
            }
          }
        }
      }
    } catch {
      genericProjectIds = new Set();
      latestGenericByProjectId = new Map();
      genericSheetCountByProjectId = new Map();
      genericHasDataRowsByProjectId = new Map();
    }

    res.json(
      projects.map((p) => ({
        ...p,
        hasGenericExcelUpload: genericProjectIds.has(p.id),
        genericExcelHasDataRows: genericHasDataRowsByProjectId.get(p.id) ?? false,
        genericExcelSheetCount: genericSheetCountByProjectId.get(p.id) ?? 0,
        lastImportedTab: (p as unknown as { lastImportedTab?: string | null }).lastImportedTab
          ? (p as unknown as { lastImportedTab?: string | null }).lastImportedTab
          : (latestGenericByProjectId.get(p.id)?.sheetName ?? (p as unknown as { lastImportedTab?: string | null }).lastImportedTab),
        lastImportedAt: (p as unknown as { lastImportedAt?: Date | string | null }).lastImportedAt
          ? (p as unknown as { lastImportedAt?: Date | string | null }).lastImportedAt
          : (latestGenericByProjectId.get(p.id)?.createdAt ?? (p as unknown as { lastImportedAt?: Date | string | null }).lastImportedAt),
      })),
    );
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get project by ID (accessible to all authenticated users)
export const getProjectById: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: {
        id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        employees: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let genericExcelUploads: unknown[] = [];
    try {
      const prismaAny = prisma as unknown as {
        genericExcelUpload?: {
          findMany: (args: unknown) => Promise<unknown[]>;
        };
        $queryRaw?: (query: unknown) => Promise<unknown>;
      };

      if (prismaAny.genericExcelUpload?.findMany) {
        genericExcelUploads = await prismaAny.genericExcelUpload.findMany({
          where: { projectId: id },
          orderBy: { createdAt: 'desc' },
        });
      } else if (prismaAny.$queryRaw) {
        const rows = await prismaAny.$queryRaw(
          Prisma.sql`
            SELECT *
            FROM "generic_excel_uploads"
            WHERE "projectId" = ${id}
            ORDER BY "createdAt" DESC
          `,
        );
        genericExcelUploads = Array.isArray(rows) ? (rows as unknown[]) : [];
      }
    } catch {
      genericExcelUploads = [];
    }

    res.json({
      ...project,
      genericExcelUploads,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Create new project
export const createProject: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = CreateProjectSchema.parse(req.body);

    // Check if a project with the same name already exists (only check original projects, not copies)
    if (!validatedData.isCopy) {
      const existingProject = await prisma.project.findFirst({
        where: {
          name: {
            equals: validatedData.name,
            mode: 'insensitive'
          },
          // Only check against original projects, not copies
          isCopy: {
            not: true
          }
        }
      });

      if (existingProject) {
        return res.status(409).json({
          error: 'A project with this name already exists. Please choose a different name.'
        });
      }
    }

    const { genericExcelUpload, genericExcelUploads, ...rest } = validatedData;

    const allGenericUploads = (genericExcelUploads && genericExcelUploads.length > 0)
      ? genericExcelUploads
      : (genericExcelUpload ? [genericExcelUpload] : []);

    const primaryGenericUpload = genericExcelUpload ?? allGenericUploads[0] ?? null;

    type TxClient = {
      project: {
        create: (args: unknown) => Promise<unknown>;
      };
      genericExcelUpload?: {
        create: (args: unknown) => Promise<unknown>;
      };
      $queryRaw?: (query: unknown) => Promise<unknown>;
    };

    const prismaAny = prisma as unknown as {
      $transaction: <T>(fn: (tx: TxClient) => Promise<T>) => Promise<T>;
    };

    const result = await prismaAny.$transaction(async (tx) => {
      const createdProject = (await tx.project.create({
        data: {
          name: rest.name,
          isCopy: rest.isCopy ?? false,
          originalProjectId: rest.originalProjectId,
          description: rest.description,
          uniqueProjectIdentifier: rest.uniqueProjectIdentifier,
          customerName: rest.customerName,
          customerAddress: rest.customerAddress,
          contactPerson: rest.contactPerson,
          email: rest.email,
          phoneNumber: rest.phoneNumber,
          agreementType: rest.agreementType,
          agreementRef: rest.agreementRef,
          poNumber: rest.poNumber,
          invoicePurpose: rest.invoicePurpose,
          currency: rest.currency,
          workPeriod: rest.workPeriod,
          taxIdentificationType: rest.taxIdentificationType,
          taxNumber: rest.taxNumber,
          status: rest.status,
          paymentDueDays: rest.paymentDueDays,
          ...(primaryGenericUpload
            ? {
              lastImportedAt: new Date(),
              lastImportedTab: primaryGenericUpload.sheetName,
              lastImportedInvoiceDate: primaryGenericUpload.invoiceDate
                ? new Date(primaryGenericUpload.invoiceDate)
                : undefined,
            }
            : {}),
          userId: req.user!.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })) as Record<string, unknown> & { id: string };

      const createdGenericUploads: unknown[] = [];
      if (allGenericUploads.length > 0 && tx.genericExcelUpload?.create) {
        for (const up of allGenericUploads) {
          const created = await tx.genericExcelUpload.create({
            data: {
              projectId: createdProject.id,
              fileName: up.fileName,
              sheetName: up.sheetName,
              headers: up.headers,
              rows: up.rows,
            },
          });
          createdGenericUploads.push(created);
        }
      } else if (allGenericUploads.length > 0 && tx.$queryRaw) {
        for (const up of allGenericUploads) {
          const newId = randomUUID();
          const inserted = await tx.$queryRaw(
            Prisma.sql`
              INSERT INTO "generic_excel_uploads" (
                "id",
                "projectId",
                "fileName",
                "sheetName",
                "headers",
                "rows",
                "createdAt",
                "updatedAt"
              ) VALUES (
                ${newId},
                ${createdProject.id},
                ${up.fileName ?? null},
                ${up.sheetName},
                ${JSON.stringify(up.headers)}::jsonb,
                ${JSON.stringify(up.rows)}::jsonb,
                NOW(),
                NOW()
              )
              RETURNING *
            `,
          );
          const insertedRows = Array.isArray(inserted) ? (inserted as unknown[]) : [];
          if (insertedRows[0]) createdGenericUploads.push(insertedRows[0]);
        }
      }

      return {
        ...createdProject,
        genericExcelUploads: createdGenericUploads,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    // Handle unique constraint violation on uniqueProjectIdentifier
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target ?? []) as unknown as string[] | string;
      const targets = Array.isArray(target) ? target : [target];
      if (targets.includes('uniqueProjectIdentifier')) {
        return res.status(409).json({
          error: 'A project with this Unique Project Identifier already exists. Please use a different identifier.'
        });
      }
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Update project (accessible to all authenticated users)
export const updateProject: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateProjectSchema.parse(req.body);

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Prepare update data, handling tax fields explicitly
    const updateData: Record<string, unknown> = { ...validatedData };

    // Map raw invoiceDate (from preview) to persisted lastImportedInvoiceDate
    const rawInvoiceDate = (req.body as { invoiceDate?: string | Date } | undefined)?.invoiceDate;
    if (rawInvoiceDate) {
      if (rawInvoiceDate instanceof Date) {
        updateData.lastImportedInvoiceDate = rawInvoiceDate;
      } else if (typeof rawInvoiceDate === 'string') {
        const d = new Date(rawInvoiceDate);
        if (!isNaN(d.getTime())) {
          updateData.lastImportedInvoiceDate = d;
        }
      }
    }

    // Handle taxIdentificationType - ensure it's a valid enum value or undefined
    if ('taxIdentificationType' in validatedData) {
      if (validatedData.taxIdentificationType === 'VAT' || validatedData.taxIdentificationType === 'FISCAL_ID') {
        // Keep the valid enum value
        updateData.taxIdentificationType = validatedData.taxIdentificationType;
      } else {
        // Set to undefined if not a valid enum value
        delete updateData.taxIdentificationType;
      }
    }

    // Remove taxNumber if taxIdentificationType is not set
    if (!updateData.taxIdentificationType && 'taxNumber' in updateData) {
      delete updateData.taxNumber;
    }

    // Update project data
    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
    });

    res.json(project);
  } catch (error) {
    // Handle unique constraint violation on uniqueProjectIdentifier during update
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target ?? []) as unknown as string[] | string;
      const targets = Array.isArray(target) ? target : [target];
      if (targets.includes('uniqueProjectIdentifier')) {
        return res.status(409).json({
          error: 'A project with this Unique Project Identifier already exists. Please use a different identifier.'
        });
      }
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete project (any user can delete any project)
export const deleteProject: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.project.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
