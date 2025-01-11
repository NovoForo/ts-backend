/**
 * This file contains all the types that are used in the application.
 */

interface Category {
	Id: Number,
	Name: String,
	Description: String,
	SortOrder: Number,
	Forums: Forum[],
	CreatedAt: Date,
	UpdatedAt: Date | null
}

interface Forum {
	Id: Number,
	Name: String,
	Description: String,
	SortOrder: Number
    IsReadOnly: Boolean,
	CategoryId: Number,
	Topics: Topic[],
	CreatedAt: Date,
	UpdatedAt: Date | null
}

interface Topic {
	Id: Number,
	Title: String,
	IsWithheldForModeratorReview: Boolean,
    IsClosedByAuthor: Boolean,
    IsLockedByModerator: Boolean,
    IsPinned: Boolean,
	ForumId: Number,
	Posts: Post[],
	CreatedAt: Date,
	UpdatedAt: Date | null,
}

interface Post {
	Id: Number,
	Content: String,
    IsHeldForModeratorReview: Boolean,
	TopicId: Number,
	UserId: Number,
	CreatedAt: Date,
	UpdatedAt: Date | null,
}

interface User {
	Id: Number,
	Username: String,
	PasswordHash: String,
	EmailAddress: String,
	IsModerator: Boolean,
    HoldPostsForReview: Boolean,
    IsLocked: Boolean,
    IsBanned: Boolean,
	IsAdministrator: Boolean,
	CreatedAt: Date,
	UpdatedAt: Date | null,
}