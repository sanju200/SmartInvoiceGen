import { Response } from "express";
import { prisma } from "../db";
import { z } from "zod";
import { AuthenticatedRequest } from "../auth";

// Validation schema for company data
const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  cinNumber: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAddress: z.string().optional().nullable(),
  swiftCode: z.string().optional().nullable(),
  remittingBankName: z.string().optional().nullable(),
  remittingCurrency: z.string().optional().nullable(),
  remittingAccountNo: z.string().optional().nullable(),
  remittingSwiftCode: z.string().optional().nullable(),
  remittingIbanNo: z.string().optional().nullable(),
  remittingAbaFedNo: z.string().optional().nullable(),
  // Signing fields
  signatureImage: z.string().optional().nullable(),
  companyStampImage: z.string().optional().nullable(),
  signatoryName: z.string().optional().nullable(),
  signatoryDesignation: z.string().optional().nullable(),
});

// Get global company information (shared across all users)
export async function getCompany(req: AuthenticatedRequest, res: Response) {
  try {
    // Fetch the first (and should be only) company record
    const company = await prisma.company.findFirst();

    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ error: "Failed to fetch company information" });
  }
}

// Create or update global company information
export async function upsertCompany(req: AuthenticatedRequest, res: Response) {
  try {
    // Parse and validate the request body
    const body = req.body;
    const validatedData = companySchema.parse(body) as { 
      name: string; 
      address: string; 
      cinNumber?: string | null; 
      gstNumber?: string | null;
      ifscCode?: string | null;
      bankName?: string | null;
      bankAddress?: string | null;
      swiftCode?: string | null;
      remittingBankName?: string | null;
      remittingCurrency?: string | null;
      remittingAccountNo?: string | null;
      remittingSwiftCode?: string | null;
      remittingIbanNo?: string | null;
      remittingAbaFedNo?: string | null;
      signatureImage?: string | null;
      companyStampImage?: string | null;
      signatoryName?: string | null;
      signatoryDesignation?: string | null;
    };

    // Check if company exists
    const existingCompany = await prisma.company.findFirst();

    let company;
    if (existingCompany) {
      // Update existing company
      company = await prisma.company.update({
        where: { id: existingCompany.id },
        data: validatedData,
      });
    } else {
      // Create new company - we know name and address are required from validation
      company = await prisma.company.create({
        data: validatedData,
      });
    }

    res.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    
    console.error("Error upserting company:", error);
    res.status(500).json({ error: "Failed to save company information" });
  }
}

// Delete global company information (admin only)
export async function deleteCompany(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can delete company information
    if (!req.user!.isAdmin) {
      return res.status(403).json({ error: "Only administrators can delete company information" });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return res.status(404).json({ error: "No company information found" });
    }

    await prisma.company.delete({
      where: { id: company.id },
    });

    res.json({ message: "Company information deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ error: "Failed to delete company information" });
  }
}
