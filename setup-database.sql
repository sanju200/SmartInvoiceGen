-- Database setup script for PostgreSQL
-- Run this in PostgreSQL command line or pgAdmin

-- Create database
CREATE DATABASE smartinvogen;

-- Create user (optional, you can also use postgres user)
CREATE USER smartinvoice_user WITH PASSWORD 'smartinvoice_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE smartinvogen TO smartinvoice_user;

-- Connect to the database
\c smartinvogen;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO smartinvoice_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartinvoice_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smartinvoice_user;

-- Show success message
SELECT 'Database setup completed successfully!' as message;
