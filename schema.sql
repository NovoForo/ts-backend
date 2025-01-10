DROP TABLE IF EXISTS Categories;
CREATE TABLE Categories (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    SortOrder INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    DeletedAt INTEGER
);
INSERT INTO Categories (Name, Description, SortOrder, CreatedAt) VALUES ('General', 'General discussion', 1, strftime('%s', 'now'));

DROP TABLE IF EXISTS Forums;
CREATE TABLE Forums (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    SortOrder INTEGER NOT NULL,
    CategoryId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    DeletedAt INTEGER,
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE CASCADE
);
INSERT INTO Forums (Name, Description, SortOrder, CategoryId, CreatedAt) VALUES ('General Discussion', 'General discussion', 1, 1, strftime('%s', 'now'));

DROP TABLE IF EXISTS Topics;
CREATE TABLE Topics (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    Description TEXT,
    ForumId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    DeletedAt INTEGER,
    FOREIGN KEY (ForumId) REFERENCES Forums(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS Posts;
CREATE TABLE Posts (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    Content TEXT NOT NULL,
    TopicId INTEGER NOT NULL,
    UserId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    DeletedAt INTEGER,
    FOREIGN KEY (TopicId) REFERENCES Topics(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    EmailAddress TEXT NOT NULL UNIQUE,
    IsModerator BOOLEAN NOT NULL DEFAULT 0,
    IsAdministrator BOOLEAN NOT NULL DEFAULT 0,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    DeletedAt INTEGER,
    DisabledAt INTEGER
);
