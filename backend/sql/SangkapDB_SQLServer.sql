USE master;
GO
IF DB_ID(N'SangkapDB') IS NOT NULL
BEGIN
    ALTER DATABASE SangkapDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SangkapDB;
END
GO
CREATE DATABASE SangkapDB;
GO
USE SangkapDB;
GO

/* ---------- Users: usernames, emails, passwords ---------- */
CREATE TABLE dbo.users (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    username       NVARCHAR(30)  NOT NULL CONSTRAINT UQ_users_username UNIQUE,
    email          NVARCHAR(120) NOT NULL CONSTRAINT UQ_users_email UNIQUE,
    password_hash  NVARCHAR(300) NOT NULL,        -- hash only, never the plain password
    display_name   NVARCHAR(60)  NOT NULL,
    profile_image  NVARCHAR(500) NOT NULL CONSTRAINT DF_users_img DEFAULT N'',
    role           NVARCHAR(10)  NOT NULL CONSTRAINT DF_users_role DEFAULT N'user',
    created_at     DATETIME2(3)  NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_users_username CHECK (LEN(username) >= 3),
    CONSTRAINT CK_users_role CHECK (role IN (N'user', N'admin'))
);

CREATE TABLE dbo.sessions (
    token       CHAR(64)     NOT NULL PRIMARY KEY,
    user_id     INT          NOT NULL REFERENCES dbo.users(id) ON DELETE CASCADE,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    expires_at  DATETIME2(3) NOT NULL
);

/* ---------- Recipes ---------- */
CREATE TABLE dbo.recipes (
    id                 INT IDENTITY(1,1) PRIMARY KEY,
    title              NVARCHAR(120)  NOT NULL,
    description        NVARCHAR(500)  NOT NULL DEFAULT N'',
    image              NVARCHAR(500)  NOT NULL DEFAULT N'',
    category           NVARCHAR(40)   NOT NULL DEFAULT N'',
    cooking_time       INT            NOT NULL CHECK (cooking_time > 0),   -- minutes
    difficulty         NVARCHAR(10)   NOT NULL DEFAULT N'Easy' CHECK (difficulty IN (N'Easy', N'Medium', N'Hard')),
    -- No cascade here (SQL Server forbids multiple cascade paths).
    -- To delete a user, delete or reassign their recipes first.
    author_id          INT            NULL REFERENCES dbo.users(id),
    author_name        NVARCHAR(60)   NOT NULL DEFAULT N'S.A.N.G.K.A.P. Kitchen',
    is_community       BIT            NOT NULL DEFAULT 0,
    base_rating_total  DECIMAL(10,1)  NOT NULL DEFAULT 0,   -- seeded demo ratings
    base_rating_count  INT            NOT NULL DEFAULT 0,
    created_at         DATETIME2(3)   NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.recipe_ingredients (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    recipe_id   INT          NOT NULL REFERENCES dbo.recipes(id) ON DELETE CASCADE,
    name        NVARCHAR(80) NOT NULL,
    importance  NVARCHAR(10) NOT NULL CHECK (importance IN (N'essential', N'important', N'optional')),
    weight      TINYINT      NOT NULL CHECK (weight IN (1,2,3))   -- optional=1 important=2 essential=3
);

CREATE TABLE dbo.recipe_steps (
    recipe_id    INT NOT NULL REFERENCES dbo.recipes(id) ON DELETE CASCADE,
    step_number  INT NOT NULL,
    instruction  NVARCHAR(1000) NOT NULL,
    PRIMARY KEY (recipe_id, step_number)
);

CREATE TABLE dbo.recipe_tags (
    recipe_id  INT          NOT NULL REFERENCES dbo.recipes(id) ON DELETE CASCADE,
    tag        NVARCHAR(30) NOT NULL,
    PRIMARY KEY (recipe_id, tag)
);

/* ---------- Ratings, favorites, basket ---------- */
CREATE TABLE dbo.ratings (
    user_id     INT NOT NULL REFERENCES dbo.users(id)   ON DELETE CASCADE,
    recipe_id   INT NOT NULL REFERENCES dbo.recipes(id) ON DELETE CASCADE,
    rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (user_id, recipe_id)        -- one rating per user per recipe
);

CREATE TABLE dbo.favorites (
    user_id    INT NOT NULL REFERENCES dbo.users(id)   ON DELETE CASCADE,
    recipe_id  INT NOT NULL REFERENCES dbo.recipes(id) ON DELETE CASCADE,
    saved_at   DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE dbo.basket_items (
    user_id     INT          NOT NULL REFERENCES dbo.users(id) ON DELETE CASCADE,
    ingredient  NVARCHAR(80) NOT NULL,
    PRIMARY KEY (user_id, ingredient)
);

CREATE INDEX idx_ingredients_recipe ON dbo.recipe_ingredients(recipe_id);
CREATE INDEX idx_ingredients_name   ON dbo.recipe_ingredients(name);
CREATE INDEX idx_recipes_author     ON dbo.recipes(author_id);
CREATE INDEX idx_ratings_recipe     ON dbo.ratings(recipe_id);
CREATE INDEX idx_sessions_expires   ON dbo.sessions(expires_at);
GO

/* Average rating = seeded demo ratings + real user ratings */
CREATE VIEW dbo.recipe_stats AS
SELECT r.id AS recipe_id,
       r.base_rating_count + COUNT(rt.rating) AS rating_count,
       CASE WHEN r.base_rating_count + COUNT(rt.rating) = 0 THEN 0
            ELSE CAST(ROUND((r.base_rating_total + COALESCE(SUM(CAST(rt.rating AS DECIMAL(10,1))),0))
                 / (r.base_rating_count + COUNT(rt.rating)), 2) AS DECIMAL(4,2)) END AS rating_avg
FROM dbo.recipes r LEFT JOIN dbo.ratings rt ON rt.recipe_id = r.id
GROUP BY r.id, r.base_rating_total, r.base_rating_count;
GO

/* ---------- Demo data (5 users, 30 recipes) ----------
   Demo accounts: maria, andrei, liza, kenji, grace  (password: password123)*/
SET NOCOUNT ON;
SET IDENTITY_INSERT dbo.users ON;
INSERT dbo.users (id,username,email,password_hash,display_name,profile_image,role,created_at) VALUES (1,N'maria',N'maria@sangkap.test',N'scrypt$8cecd9378d0716bd6b05c91e24627529$13fbcb8d6e1199a37dd8ee9ce4fc9c933cc2193fdc12f559743d2852724a620f920b9fdda699a8ee7e82aacca7aed45fb06ebc4ab88c3e1c3d2d8f595992f20d',N'Maria Santos',N'',N'user','2026-07-02T08:00:00.000');
INSERT dbo.users (id,username,email,password_hash,display_name,profile_image,role,created_at) VALUES (2,N'andrei',N'andrei@sangkap.test',N'scrypt$ecbd65686b534bc2a41b88a5f4a7910b$0fab9274f212618335be27f61d25006089b3a3052556f3c35d20ea2e575e1e913e32ddaa1b7cce10e5abdfa2a02f40765f6cdf359e8e0c13b8ac7d17868a917c',N'Andrei Cruz',N'',N'user','2026-07-18T08:00:00.000');
INSERT dbo.users (id,username,email,password_hash,display_name,profile_image,role,created_at) VALUES (3,N'liza',N'liza@sangkap.test',N'scrypt$fae9093769cf2c75fe8493e8c1a935b3$f7d2f686bb0045065dc564037ab31ede58a666f285d5bb515cf447e7dc36f9306b01c5a7aae92c6e6b26a89bd3438ceb6ef612964b3b64f97f1a1169b29ca40c',N'Liza Ramos',N'',N'user','2026-08-05T08:00:00.000');
INSERT dbo.users (id,username,email,password_hash,display_name,profile_image,role,created_at) VALUES (4,N'kenji',N'kenji@sangkap.test',N'scrypt$5cb0fec4ee3e6bfcb8a8ef99bd3d40d5$7a69781c7a29ba73b7aeb4fae2418886fd3c3091756af841582b8d66a376d33afdf54f627dc3fba409b20db5bdb1f34f5595ceb9d3a4419b3e7e3d1b9b2ebd3b',N'Kenji Bautista',N'',N'user','2026-08-19T08:00:00.000');
INSERT dbo.users (id,username,email,password_hash,display_name,profile_image,role,created_at) VALUES (5,N'grace',N'grace@sangkap.test',N'scrypt$ce377976afa960eb5e92159c58122830$82a20ae1b0400a561376bc49e9151ae6a808efd52acd76a969be605d20eb5d63345a933730e50ef682f81ffad233e9a3aa7db75c91908a213500e787b22a03fa',N'Grace Villanueva',N'',N'user','2026-09-01T08:00:00.000');
SET IDENTITY_INSERT dbo.users OFF;
GO



SET IDENTITY_INSERT dbo.recipes ON;
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (1,N'Chicken Adobo',N'Chicken simmered in soy sauce, vinegar and plenty of garlic until the sauce turns glossy.',N'assets/images/manoknaadobo.jpg',N'Chicken',45,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,2016.0,420,'2026-06-04T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (2,N'Pork Adobo',N'Pork belly braised low and slow in vinegar and soy sauce until the fat turns tender.',N'assets/images/PORKNAADBO.jpg',N'Pork',55,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1457.0,310,'2026-06-06T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (3,N'Pork Sinigang',N'A sour tamarind soup loaded with pork and vegetables, best on a rainy afternoon.',N'assets/images/Pork Sinigang.jpg',N'Soup',60,N'Medium',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1339.5,285,'2026-06-08T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (4,N'Chicken Tinola',N'Clear ginger broth with chicken and green papaya. Light, warm and very forgiving.',N'assets/images/Chicken Tinola.jpg',N'Soup',40,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1127.0,245,'2026-06-11T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (5,N'Pancit Bihon',N'Thin rice noodles tossed with chicken and vegetables. The default handaan dish.',N'assets/images/easy-pancit-bihon.jpg',N'Noodles',35,N'Medium',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1654.4,352,'2026-06-14T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (6,N'Tortang Talong',N'Grilled eggplant flattened and fried in egg. Five ingredients, ten pesos of effort.',N'assets/images/Tortang Talong.jpg',N'Egg',20,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,810.0,180,'2026-06-17T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (7,N'Arroz Caldo',N'Thick ginger rice porridge with chicken, topped with toasted garlic and egg.',N'assets/images/Arroz Caldo.jpg',N'Rice',45,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1205.2,262,'2026-06-19T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (8,N'Beef Tapa',N'Sweet and salty cured beef, fried fast and served with garlic rice and egg.',N'assets/images/Beef Tapa.jpg',N'Beef',20,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,943.0,205,'2026-06-22T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (9,N'Ginisang Gulay',N'A plain sauteed vegetable dish that works with whatever is left in the crisper.',N'assets/images/Ginisang Gulay.jpg',N'Vegetable',25,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,610.6,142,'2026-06-25T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (10,N'Chicken Fried Rice',N'Day-old rice fried hard with chicken, egg and garlic. The classic clean-out-the-fridge meal.',N'assets/images/Chicken Fried Rice.jpg',N'Rice',20,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1920.0,400,'2026-06-28T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (11,N'Garlic Fried Rice',N'Sinangag. Rice, garlic, oil, salt. Nothing else, and nothing else is needed.',N'assets/images/Garlic Fried Rice.jpg',N'Rice',10,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1380.0,300,'2026-06-30T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (12,N'Chicken Curry',N'Mild coconut curry with potato and carrot. Filipino-style, not too spicy.',N'assets/images/Chicken Curry.jpg',N'Chicken',50,N'Medium',NULL,N'S.A.N.G.K.A.P. Kitchen',0,877.5,195,'2026-07-02T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (13,N'Vegetable Stir Fry',N'High heat, soy sauce, and whatever vegetables are in the basket. Ready in a quarter hour.',N'assets/images/Vegetable Stir Fry.jpg',N'Vegetable',15,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,726.0,165,'2026-07-05T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (14,N'Simple Shoyu Ramen',N'A weeknight ramen built on soy sauce broth, a soft egg, and instant noodles.',N'assets/images/Simple Shoyu Ramen.jpg',N'Noodles',30,N'Medium',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1035.0,225,'2026-07-08T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (15,N'Teriyaki Chicken',N'Pan-fried chicken glazed in a four-ingredient sauce that thickens on its own.',N'assets/images/Teriyaki Chicken.jpg',N'Chicken',25,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1278.4,272,'2026-07-11T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (16,N'Egg Sandwich',N'Chopped egg, mayonnaise, bread. A ten-minute breakfast or a midnight snack.',N'assets/images/Egg Sandwich.jpg',N'Snack',10,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,520.8,124,'2026-07-13T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (17,N'Tuna Pasta',N'Canned tuna, tomato and garlic turned into a full meal for the price of a snack.',N'assets/images/Tuna Pasta.jpg',N'Pasta',25,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,954.0,212,'2026-07-16T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (18,N'Classic Omelette',N'Eggs beaten with tomato and onion, cooked gently so the centre stays soft.',N'assets/images/Classic Omelette.jpg',N'Egg',10,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,666.5,155,'2026-07-18T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (19,N'Garlic Butter Pasta',N'Three ingredients, twenty minutes, and it still tastes like a restaurant order.',N'assets/images/Garlic Butter Pasta.jpg',N'Pasta',20,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1076.4,234,'2026-07-21T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (20,N'Potato Hash',N'Crisp cubed potatoes with onion and garlic. Good under a fried egg.',N'assets/images/Potato Hash.jpg',N'Vegetable',25,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,495.6,118,'2026-07-23T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (21,N'Egg Fried Rice',N'The two-ingredient dinner. Rice and egg, with garlic and soy sauce doing the rest.',N'assets/images/Egg Fried Rice.jpg',N'Rice',15,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,1206.0,268,'2026-07-26T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (22,N'Chicken Stir Fry',N'Chicken and vegetables cooked fast in one pan with a simple soy glaze.',N'assets/images/Chicken Stir Fry.jpg',N'Chicken',25,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,801.0,178,'2026-07-29T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (23,N'Tomato and Egg Stir Fry',N'Soft scrambled egg folded into sweet cooked tomato. Serve it over hot rice.',N'assets/images/Tomato and Egg Stir Fry.jpg',N'Egg',15,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,598.4,136,'2026-08-01T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (24,N'Tuna Rice Bowl',N'Canned tuna, hot rice and a soft egg in one bowl. Fifteen minutes, one plate to wash.',N'assets/images/Tuna Rice Bowl.jpg',N'Rice',15,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,464.4,108,'2026-08-04T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (25,N'Ginisang Munggo',N'Mung beans simmered soft with garlic, tomato and a little pork for flavour.',N'assets/images/Ginisang Munggo.jpg',N'Soup',45,N'Easy',NULL,N'S.A.N.G.K.A.P. Kitchen',0,655.6,149,'2026-08-07T09:00:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (26,N'Creamy Tuna Macaroni',N'My rainy-day version of macaroni salad, served warm instead of chilled.',N'assets/images/Creamy Tuna Macaroni.webp',N'Pasta',30,N'Easy',1,N'Maria Santos',1,211.6,46,'2026-08-22T10:30:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (27,N'Budget Egg Curry Rice',N'Curry powder, egg and rice. This got me through the last two weeks of the semester.',N'assets/images/Egg Curry and Cumin rice.jpg',N'Rice',25,N'Easy',2,N'Andrei Cruz',1,123.2,28,'2026-08-27T14:10:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (28,N'Tofu Sisig',N'All of the crunch and sourness of sisig without the pork. Works with firm tofu only.',N'assets/images/Tofu Sisig.jpg',N'Vegetable',35,N'Medium',3,N'Liza Ramos',1,159.8,34,'2026-09-02T11:45:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (29,N'Five-Ingredient Chicken Sopas',N'Creamy chicken macaroni soup made with pantry items when the rain will not stop.',N'assets/images/Five-Ingredient Chicken Sopas.jpg',N'Soup',40,N'Easy',4,N'Kenji Bautista',1,94.5,21,'2026-09-06T09:20:00.000');
INSERT dbo.recipes (id,title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community,base_rating_total,base_rating_count,created_at) VALUES (30,N'Leftover Rice Pancake',N'Turns yesterday''s rice into a crisp savoury pancake. Good with ketchup, better with vinegar.',N'assets/images/Leftover Rice Pancake.jpg',N'Snack',15,N'Easy',5,N'Grace Villanueva',1,50.4,12,'2026-09-10T16:05:00.000');
SET IDENTITY_INSERT dbo.recipes OFF;
GO
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (1,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (1,N'soy sauce',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (1,N'vinegar',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (1,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (1,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (1,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (2,N'pork',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (2,N'soy sauce',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (2,N'vinegar',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (2,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (2,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (2,N'bay leaf',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (2,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (3,N'pork',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (3,N'tamarind mix',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (3,N'tomato',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (3,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (3,N'radish',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (3,N'kangkong',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (3,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (4,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (4,N'ginger',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (4,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (4,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (4,N'fish sauce',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (4,N'green papaya',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (4,N'chili leaves',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'noodles',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'soy sauce',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'chicken',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'carrot',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'cabbage',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (5,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (6,N'eggplant',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (6,N'egg',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (6,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (6,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (6,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (7,N'rice',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (7,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (7,N'ginger',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (7,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (7,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (7,N'fish sauce',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (7,N'egg',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (8,N'beef',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (8,N'soy sauce',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (8,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (8,N'vinegar',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (8,N'sugar',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (8,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (9,N'cabbage',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (9,N'carrot',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (9,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (9,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (9,N'tomato',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (9,N'soy sauce',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (9,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (10,N'rice',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (10,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (10,N'egg',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (10,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (10,N'soy sauce',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (10,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (11,N'rice',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (11,N'garlic',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (11,N'oil',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (11,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (11,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (12,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (12,N'curry powder',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (12,N'coconut milk',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (12,N'potato',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (12,N'carrot',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (12,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (12,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (13,N'cabbage',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (13,N'carrot',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (13,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (13,N'soy sauce',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (13,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (13,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (13,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (14,N'noodles',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (14,N'soy sauce',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (14,N'egg',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (14,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (14,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (14,N'pork',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (14,N'spring onion',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (15,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (15,N'soy sauce',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (15,N'sugar',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (15,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (15,N'ginger',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (15,N'vinegar',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (16,N'egg',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (16,N'bread',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (16,N'mayonnaise',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (16,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (16,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (17,N'pasta',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (17,N'tuna',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (17,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (17,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (17,N'tomato',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (17,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (17,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (18,N'egg',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (18,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (18,N'tomato',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (18,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (18,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (18,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (19,N'pasta',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (19,N'garlic',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (19,N'butter',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (19,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (19,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (19,N'parsley',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (20,N'potato',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (20,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (20,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (20,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (20,N'pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (20,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (21,N'rice',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (21,N'egg',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (21,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (21,N'soy sauce',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (21,N'spring onion',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (21,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (22,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (22,N'soy sauce',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (22,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (22,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (22,N'carrot',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (22,N'bell pepper',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (22,N'oil',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (23,N'egg',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (23,N'tomato',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (23,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (23,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (23,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (23,N'sugar',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (24,N'rice',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (24,N'tuna',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (24,N'egg',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (24,N'soy sauce',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (24,N'spring onion',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (24,N'mayonnaise',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (25,N'mung beans',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (25,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (25,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (25,N'tomato',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (25,N'pork',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (25,N'spinach',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (25,N'fish sauce',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (26,N'pasta',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (26,N'tuna',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (26,N'milk',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (26,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (26,N'carrot',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (26,N'cheese',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (27,N'rice',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (27,N'egg',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (27,N'curry powder',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (27,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (27,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (27,N'coconut milk',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (28,N'tofu',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (28,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (28,N'garlic',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (28,N'soy sauce',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (28,N'calamansi',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (28,N'chili',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (28,N'mayonnaise',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (29,N'chicken',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (29,N'macaroni',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (29,N'milk',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (29,N'carrot',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (29,N'onion',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (29,N'cabbage',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (30,N'rice',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (30,N'egg',N'essential',3);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (30,N'flour',N'important',2);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (30,N'spring onion',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (30,N'salt',N'optional',1);
INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (30,N'oil',N'optional',1);
GO
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (1,1,N'Cut the chicken into serving pieces and pat them dry.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (1,2,N'Brown the chicken in a hot pan, then set it aside.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (1,3,N'Saute the garlic and onion until soft and fragrant.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (1,4,N'Return the chicken, pour in the soy sauce and vinegar, and let it boil without stirring for two minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (1,5,N'Lower the heat, cover, and simmer for 30 minutes until the sauce thickens.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (1,6,N'Season with pepper and serve hot with rice.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (2,1,N'Sear the pork pieces in a dry pan until the edges brown.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (2,2,N'Add the garlic and onion and cook until softened.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (2,3,N'Pour in the soy sauce, vinegar and a cup of water with the bay leaf.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (2,4,N'Simmer covered for 40 minutes, stirring once or twice.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (2,5,N'Uncover and reduce the sauce until it coats the pork.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (3,1,N'Boil the pork with onion and tomato until tender, skimming the foam.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (3,2,N'Stir in the tamarind mix and taste for sourness.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (3,3,N'Add the radish and cook until just soft.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (3,4,N'Drop in the kangkong, turn off the heat, and cover for two minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (3,5,N'Season with salt and serve with rice.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (4,1,N'Saute the ginger, garlic and onion until aromatic.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (4,2,N'Add the chicken and cook until the outside turns opaque.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (4,3,N'Season with fish sauce, pour in water, and simmer for 20 minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (4,4,N'Add the green papaya and cook until tender.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (4,5,N'Finish with chili leaves just before serving.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (5,1,N'Soak the rice noodles in water until pliable, then drain.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (5,2,N'Saute the garlic and onion, add the chicken, and cook through.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (5,3,N'Add the carrot and cabbage and stir fry briefly.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (5,4,N'Pour in broth and soy sauce, then bring to a simmer.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (5,5,N'Add the noodles and toss until they absorb the sauce.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (5,6,N'Season with pepper and serve with calamansi on the side.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (6,1,N'Grill or broil the eggplant until the skin blisters, then peel it.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (6,2,N'Flatten the eggplant gently with a fork.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (6,3,N'Beat the eggs with salt and pepper in a shallow dish.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (6,4,N'Soak the eggplant in the egg and fry each side until golden.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (7,1,N'Fry half the garlic until golden and set it aside for topping.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (7,2,N'Saute the remaining garlic with ginger and onion.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (7,3,N'Add the chicken and season with fish sauce.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (7,4,N'Stir in the rice, pour in plenty of water, and simmer for 30 minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (7,5,N'Stir often until thick, then top with boiled egg and toasted garlic.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (8,1,N'Slice the beef thinly against the grain.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (8,2,N'Marinate with soy sauce, garlic, vinegar, sugar and pepper for at least an hour.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (8,3,N'Fry in a hot pan in a single layer until the edges caramelise.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (8,4,N'Serve with garlic rice and a fried egg.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (9,1,N'Saute the garlic, onion and tomato until the tomato breaks down.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (9,2,N'Add the carrot and cook for three minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (9,3,N'Add the cabbage and toss over high heat.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (9,4,N'Season with soy sauce and serve while the vegetables still have bite.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (10,1,N'Break up the cold rice with your hands so no clumps remain.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (10,2,N'Scramble the egg in a hot pan, then set it aside.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (10,3,N'Fry the garlic, add the chicken, and cook until browned.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (10,4,N'Add the rice and press it against the pan to toast.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (10,5,N'Return the egg, season with soy sauce and pepper, and toss.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (11,1,N'Fry the chopped garlic in oil over low heat until pale gold.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (11,2,N'Raise the heat and add the cold rice.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (11,3,N'Toss until every grain is coated and slightly toasted.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (11,4,N'Season with salt and pepper.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (12,1,N'Saute the garlic and onion, then add the chicken.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (12,2,N'Stir in the curry powder and cook until fragrant.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (12,3,N'Pour in the coconut milk and simmer gently.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (12,4,N'Add the potato and carrot and cook until fork tender.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (12,5,N'Taste, adjust the salt, and serve with rice.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (13,1,N'Slice all vegetables to a similar thickness so they cook evenly.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (13,2,N'Heat the oil until it shimmers, then add the garlic and onion.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (13,3,N'Add the carrot first, then the cabbage.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (13,4,N'Splash in the soy sauce and toss for one more minute.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (14,1,N'Boil the eggs for seven minutes, then chill them in cold water.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (14,2,N'Simmer garlic, onion and soy sauce in water for 15 minutes to build the broth.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (14,3,N'Cook the noodles separately so the broth stays clear.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (14,4,N'Assemble the noodles and broth, then top with halved egg, pork and spring onion.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (15,1,N'Cook the chicken skin side down until the skin is crisp.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (15,2,N'Mix the soy sauce, sugar, garlic, ginger and vinegar.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (15,3,N'Pour the sauce into the pan and let it bubble.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (15,4,N'Spoon the glaze over the chicken until it turns shiny and thick.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (15,5,N'Rest for two minutes, slice, and serve over rice.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (16,1,N'Hard boil the eggs, cool them, then peel and chop.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (16,2,N'Mix with mayonnaise, salt and pepper.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (16,3,N'Spread thickly on bread and press the sandwich closed.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (17,1,N'Boil the pasta in salted water until just firm.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (17,2,N'Saute the garlic and onion in oil, then add the tomato.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (17,3,N'Stir in the tuna along with its oil and cook for five minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (17,4,N'Toss the drained pasta in the sauce with a splash of pasta water.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (18,1,N'Beat the eggs with salt and pepper until fully combined.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (18,2,N'Soften the onion and tomato in a little oil.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (18,3,N'Pour in the egg and lower the heat.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (18,4,N'Fold once the edges set but the middle is still glossy.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (19,1,N'Boil the pasta and save a cup of the cooking water.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (19,2,N'Melt the butter over low heat and add the sliced garlic.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (19,3,N'Cook the garlic slowly until it smells sweet, never letting it brown.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (19,4,N'Toss the pasta in the butter with a little pasta water until creamy.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (20,1,N'Dice the potatoes small and dry them with a towel.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (20,2,N'Fry in a single layer without stirring for five minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (20,3,N'Turn, add the onion and garlic, and cook until everything browns.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (20,4,N'Season generously with salt and pepper.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (21,1,N'Beat the eggs and pour them into a very hot oiled pan.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (21,2,N'Add the rice while the egg is still wet so it coats the grains.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (21,3,N'Toss constantly for three minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (21,4,N'Add the garlic and soy sauce, then finish with spring onion.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (22,1,N'Slice the chicken thin so it cooks in minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (22,2,N'Sear the chicken in a hot pan and remove it once browned.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (22,3,N'Stir fry the garlic, onion, carrot and bell pepper.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (22,4,N'Return the chicken, add the soy sauce, and toss until glazed.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (23,1,N'Scramble the eggs until barely set and remove them from the pan.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (23,2,N'Cook the garlic, onion and tomato until saucy.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (23,3,N'Add a pinch of sugar to balance the acidity.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (23,4,N'Fold the eggs back in and turn off the heat immediately.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (24,1,N'Warm the tuna in a pan with a splash of soy sauce.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (24,2,N'Fry an egg with crisp edges and a runny centre.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (24,3,N'Pile hot rice into a bowl and spoon the tuna over it.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (24,4,N'Top with the egg, spring onion and a line of mayonnaise.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (25,1,N'Boil the mung beans until they burst and thicken, about 30 minutes.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (25,2,N'Saute the garlic, onion and tomato in a separate pan with the pork.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (25,3,N'Combine the two pots and season with fish sauce.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (25,4,N'Add the spinach at the very end and serve hot.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (26,1,N'Boil the macaroni until soft, then drain.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (26,2,N'Cook the onion and carrot until soft, then add the tuna.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (26,3,N'Pour in the milk and let it reduce slightly.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (26,4,N'Fold in the macaroni and cheese and serve warm.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (27,1,N'Boil the eggs and set them aside.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (27,2,N'Saute the onion and garlic, then bloom the curry powder in the oil.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (27,3,N'Add a splash of water or coconut milk and simmer into a sauce.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (27,4,N'Halve the eggs, lay them on rice, and spoon the sauce over.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (28,1,N'Press the tofu dry, cube it, and fry until every side is crisp.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (28,2,N'Saute the onion, garlic and chili.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (28,3,N'Return the tofu and season with soy sauce and calamansi.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (28,4,N'Finish with a spoon of mayonnaise off the heat.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (29,1,N'Boil the chicken, then shred it and keep the broth.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (29,2,N'Cook the onion and carrot in a pot, then pour the broth back in.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (29,3,N'Add the macaroni and simmer until tender.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (29,4,N'Stir in the milk and cabbage and heat through without boiling.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (30,1,N'Mash the cold rice with the egg and flour until it holds together.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (30,2,N'Stir in the spring onion and salt.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (30,3,N'Press thin rounds into an oiled pan.');
INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (30,4,N'Fry both sides until deep golden and crisp at the edges.');
GO
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (1,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (1,N'chicken');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (1,N'classic');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (1,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (2,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (2,N'classic');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (2,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (2,N'pork');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (3,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (3,N'pork');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (3,N'soup');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (4,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (4,N'chicken');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (4,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (4,N'soup');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (5,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (5,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (5,N'noodles');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (6,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (6,N'egg');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (6,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (6,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (7,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (7,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (7,N'rice');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (7,N'soup');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (8,N'beef');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (8,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (8,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (9,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (9,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (9,N'healthy');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (9,N'vegetable');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (10,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (10,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (10,N'chicken');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (10,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (10,N'rice');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (11,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (11,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (11,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (11,N'rice');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (12,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (12,N'chicken');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (13,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (13,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (13,N'healthy');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (13,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (13,N'vegetable');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (14,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (14,N'noodles');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (15,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (15,N'chicken');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (15,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (16,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (16,N'egg');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (16,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (16,N'snack');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (17,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (17,N'pasta');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (17,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (18,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (18,N'egg');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (18,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (19,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (19,N'pasta');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (19,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (20,N'breakfast');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (20,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (20,N'vegetable');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (21,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (21,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (21,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (21,N'rice');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (22,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (22,N'chicken');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (22,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (23,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (23,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (23,N'egg');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (23,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (24,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (24,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (24,N'rice');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (25,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (25,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (25,N'healthy');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (25,N'soup');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (26,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (26,N'community');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (26,N'pasta');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (27,N'asian');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (27,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (27,N'community');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (27,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (28,N'community');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (28,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (28,N'vegetable');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (29,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (29,N'community');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (29,N'filipino');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (29,N'soup');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (30,N'budget');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (30,N'community');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (30,N'quick');
INSERT dbo.recipe_tags (recipe_id,tag) VALUES (30,N'snack');
GO
INSERT dbo.favorites (user_id,recipe_id,saved_at) VALUES (1,10,'2026-08-12T10:05:00.000');
INSERT dbo.favorites (user_id,recipe_id,saved_at) VALUES (1,19,'2026-08-13T10:05:00.000');
INSERT dbo.favorites (user_id,recipe_id,saved_at) VALUES (2,1,'2026-08-15T10:05:00.000');
INSERT dbo.favorites (user_id,recipe_id,saved_at) VALUES (3,26,'2026-08-26T10:05:00.000');
GO

/* ---------- Quick checks / examples ---------- */
SELECT COUNT(*) AS users   FROM dbo.users;
SELECT COUNT(*) AS recipes FROM dbo.recipes;
SELECT TOP 5 r.title, s.rating_avg, s.rating_count FROM dbo.recipes r JOIN dbo.recipe_stats s ON s.recipe_id = r.id ORDER BY s.rating_avg DESC;

