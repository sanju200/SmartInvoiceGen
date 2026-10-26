import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Hash password helper
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

async function createAdminUser() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin@123'; // Change this to a strong password
  
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: adminEmail,
        password: await hashPassword(adminPassword),
        isAdmin: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('👉 Email:', adminEmail);
    console.log('🔑 Password: Admin@123');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting admin user creation...');
  await createAdminUser();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
