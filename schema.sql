DROP TABLE IF EXISTS Categories;
CREATE TABLE Categories (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    SortOrder INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER
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
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE CASCADE
);
INSERT INTO Forums (Name, Description, SortOrder, CategoryId, CreatedAt) VALUES ('General Discussion', 'General discussion', 1, 1, strftime('%s', 'now'));

DROP TABLE IF EXISTS Topics;
CREATE TABLE Topics (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    IsWithheldForModeratorReview BOOLEAN NOT NULL DEFAULT 0,
    IsClosedByAuthor BOOLEAN NOT NULL DEFAULT 0,
    IsLockedByModerator BOOLEAN NOT NULL DEFAULT 0,
    IsPinned BOOLEAN NOT NULL DEFAULT 0,
    ForumId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    FOREIGN KEY (ForumId) REFERENCES Forums(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TopicTags (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TopicId INTEGER NOT NULL,
    Tag TEXT NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (TopicId) REFERENCES Topics(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TopicViews (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TopicId INTEGER NOT NULL,
    UserId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (TopicId) REFERENCES Topics(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS Posts;
CREATE TABLE Posts (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Content TEXT NOT NULL,
    ALFlaggedForReview BOOLEAN NOT NULL DEFAULT 0,
    IsWithheldForModeratorReview BOOLEAN NOT NULL DEFAULT 0,
    TopicId INTEGER NOT NULL,
    UserId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    FOREIGN KEY (TopicId) REFERENCES Topics(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS PostLikes;
CREATE TABLE PostLikes (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PostId INTEGER NOT NULL,
    UserId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS PostFlags;
CREATE TABLE PostFlags (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PostId INTEGER NOT NULL,
    UserId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS PostEdits;
CREATE TABLE PostEdits (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PostId INTEGER NOT NULL,
    UserId INTEGER NOT NULL,
    OldContent TEXT NOT NULL,
    NewContent TEXT NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS DirectMessages;
CREATE TABLE DirectMessages (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Content TEXT NOT NULL,
    IsRead BOOLEAN NOT NULL DEFAULT 0,
    SenderId INTEGER NOT NULL,
    RecipientId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (SenderId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (RecipientId) REFERENCES Users(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS DirectMessageBlocks;
CREATE TABLE DirectMessageBlocks (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    BlockedUserId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (BlockedUserId) REFERENCES Users(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS Notifications;
CREATE TABLE Notifications (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Content TEXT NOT NULL,
    IsRead BOOLEAN NOT NULL DEFAULT 0,
    UserId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS UserGroups;
CREATE TABLE UserGroups (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL UNIQUE,
    Description TEXT,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER
);
INSERT INTO UserGroups (Name, Description, CreatedAt) VALUES ('Guests', 'Guests', strftime('%s', 'now'));
INSERT INTO UserGroups (Name, Description, CreatedAt) VALUES ('Users', 'Users', strftime('%s', 'now'));
INSERT INTO UserGroups (Name, Description, CreatedAt) VALUES ('Moderators', 'Moderators', strftime('%s', 'now'));
INSERT INTO UserGroups (Name, Description, CreatedAt) VALUES ('Administrators', 'Administrators', strftime('%s', 'now'));
INSERT INTO UserGroups (Name, Description, CreatedAt) VALUES ('Banned', 'Banned', strftime('%s', 'now'));
INSERT INTO UserGroups (Name, Description, CreatedAt) VALUES ('Locked', 'Locked', strftime('%s', 'now'));

DROP TABLE IF EXISTS UserGroupMemberships;
CREATE TABLE UserGroupMemberships (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    UserGroupId INTEGER NOT NULL,
    CreatedAt INTEGER NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserGroupId) REFERENCES UserGroups(Id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS UserGroupPermissions;
CREATE TABLE UserGroupPermissions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserGroupId INTEGER NOT NULL,
    CanView BOOLEAN NOT NULL DEFAULT 1,
    CanCreateTopics BOOLEAN NOT NULL DEFAULT 1,
    CanReply BOOLEAN NOT NULL DEFAULT 1,
    CanEditOwnPosts BOOLEAN NOT NULL DEFAULT 1,
    CanEditOthersPosts BOOLEAN NOT NULL DEFAULT 0,
    CanDeleteOwnPosts BOOLEAN NOT NULL DEFAULT 1,
    CanDeleteOthersPosts BOOLEAN NOT NULL DEFAULT 0,
    CanCloseTopics BOOLEAN NOT NULL DEFAULT 0,
    CanPinTopics BOOLEAN NOT NULL DEFAULT 0,
    CanLockTopics BOOLEAN NOT NULL DEFAULT 0,
    CanMoveTopics BOOLEAN NOT NULL DEFAULT 0,
    CanMergeTopics BOOLEAN NOT NULL DEFAULT 0,
    CanSplitTopics BOOLEAN NOT NULL DEFAULT 0,
    CanFlagPosts BOOLEAN NOT NULL DEFAULT 1,
    CanLikePosts BOOLEAN NOT NULL DEFAULT 1,
    CanApprovePosts BOOLEAN NOT NULL DEFAULT 0,
    CanApproveEdits BOOLEAN NOT NULL DEFAULT 0,
    CanApproveUsers BOOLEAN NOT NULL DEFAULT 0,
    CanBanUsers BOOLEAN NOT NULL DEFAULT 0,
    CanLockUsers BOOLEAN NOT NULL DEFAULT 0,
    CanEditUsers BOOLEAN NOT NULL DEFAULT 0,
    CanEditGroups BOOLEAN NOT NULL DEFAULT 0,
    CanEditPermissions BOOLEAN NOT NULL DEFAULT 0,
    CanEditCategories BOOLEAN NOT NULL DEFAULT 0,
    CanEditForums BOOLEAN NOT NULL DEFAULT 0,
    CanEditSettings BOOLEAN NOT NULL DEFAULT 0,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER,
    FOREIGN KEY (UserGroupId) REFERENCES UserGroups(Id) ON DELETE CASCADE
);
INSERT INTO UserGroupPermissions (UserGroupId, CanView, CanCreateTopics, CanReply, CanEditOwnPosts, CanDeleteOwnPosts, CanFlagPosts, CanLikePosts, CreatedAt) VALUES (2, 1, 1, 1, 0, 0, 1, 1, strftime('%s', 'now'));

DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    EmailAddress TEXT NOT NULL UNIQUE,
    HoldPostsForReview BOOLEAN NOT NULL DEFAULT 0,
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER
);
