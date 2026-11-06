# Running S.A.N.G.K.A.P. with SQL Server

You need: SQL Server (SQLEXPRESS) with `SangkapDB` created, the `sangkap_app` login
(backend/sql/CreateWebsiteLogin.sql), SQL logins enabled, and TCP/IP on port 1433.

1. Install Node.js (LTS) from https://nodejs.org  - then open a NEW Command Prompt.
2. In Command Prompt, go to this folder:   cd <your directory here>
3. Install the packages:                   npm install
4. Make your settings file:                copy .env.example .env
   Open `.env` in Notepad and set DB_PASSWORD to the password I gave to you jim here :)
5. Start the site:                         npm start
   You should see "Connected to SQL Server." and "running at http://localhost:3000".
6. Open http://localhost:3000 in your browser (not by double-clicking the HTML files).

Test it: register an account, then in SSMS run
    SELECT * FROM SangkapDB.dbo.users;
and your new user appears (password stored as a hash). New recipes appear in dbo.recipes.

