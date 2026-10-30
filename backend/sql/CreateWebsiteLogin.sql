/* Creates the account the website will use to reach SangkapDB.
   1. CHANGE THE PASSWORD below before you run this.
   2. Open a New Query, paste, press Execute (F5). */
USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'sangkap_app')
    CREATE LOGIN sangkap_app WITH PASSWORD = N'ChangeMe-Str0ng-Pass1!', CHECK_POLICY = ON;
GO
USE SangkapDB;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'sangkap_app')
    CREATE USER sangkap_app FOR LOGIN sangkap_app;
ALTER ROLE db_datareader ADD MEMBER sangkap_app;   -- may read
ALTER ROLE db_datawriter ADD MEMBER sangkap_app;   -- may insert/update/delete
GO
SELECT name, type_desc FROM sys.database_principals WHERE name = N'sangkap_app';
