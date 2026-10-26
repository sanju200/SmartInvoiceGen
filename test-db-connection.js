import { PrismaClient } from '@prisma/client';

// Common PostgreSQL connection strings to try
const connectionStrings = [
  "postgresql://postgres:password@localhost:5432/smartinvogen",
  "postgresql://postgres:123456@localhost:5432/smartinvogen", 
  "postgresql://postgres:admin@localhost:5432/smartinvogen",
  "postgresql://postgres:postgres@localhost:5432/smartinvogen",
  "postgresql://postgres:root@localhost:5432/smartinvogen",
  "postgresql://postgres:@localhost:5432/smartinvogen", // No password
];

async function testConnection(url) {
  console.log(`\nTesting: ${url.replace(/:([^:@]+)@/, ':****@')}`);
  
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  
  try {
    await prisma.$connect();
    console.log('✅ Connection successful!');
    
    // Try to query the database
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database query successful:', result[0]?.version?.substring(0, 50) + '...');
    
    await prisma.$disconnect();
    return url;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    await prisma.$disconnect();
    return null;
  }
}

async function findWorkingConnection() {
  console.log('🔍 Testing PostgreSQL connections...\n');
  
  for (const url of connectionStrings) {
    const working = await testConnection(url);
    if (working) {
      console.log(`\n🎉 Found working connection!`);
      console.log(`Add this to your .env file:`);
      console.log(`DATABASE_URL="${working}"`);
      return;
    }
  }
  
  console.log('\n❌ No working connections found.');
  console.log('\n📋 Troubleshooting steps:');
  console.log('1. Make sure PostgreSQL is running: sudo systemctl start postgresql');
  console.log('2. Check if the database exists: psql -U postgres -c "\\l"');
  console.log('3. Create the database: psql -U postgres -c "CREATE DATABASE smartinvogen;"');
  console.log('4. Reset PostgreSQL password if needed');
}

findWorkingConnection().catch(console.error);
