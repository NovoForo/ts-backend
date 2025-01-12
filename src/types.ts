// Categories Table
export interface Category {
	Id: number;
	Name: string;
	Description?: string | null;
	SortOrder: number;
	CreatedAt: number;
	UpdatedAt?: number | null;
  }
  
  // Forums Table
  export interface Forum {
	Id: number;
	Name: string;
	Description?: string | null;
	SortOrder: number;
	CategoryId: number;
	CreatedAt: number;
	UpdatedAt?: number | null;
  }
  
  // Topics Table
  export interface Topic {
	Id: number;
	Title: string;
	IsWithheldForModeratorReview: boolean;
	IsClosedByAuthor: boolean;
	IsLockedByModerator: boolean;
	IsPinned: boolean;
	ForumId: number;
	CreatedAt: number;
	UpdatedAt?: number | null;
  }
  
  // TopicTags Table
  export interface TopicTag {
	Id: number;
	TopicId: number;
	Tag: string;
	CreatedAt: number;
  }
  
  // TopicViews Table
  export interface TopicView {
	Id: number;
	TopicId: number;
	UserId: number;
	CreatedAt: number;
  }
  
  // Posts Table
  export interface Post {
	Id: number;
	Content: string;
	ALFlaggedForReview: boolean;
	IsWithheldForModeratorReview: boolean;
	TopicId: number;
	UserId: number;
	CreatedAt: number;
	UpdatedAt?: number | null;
  }
  
  // PostLikes Table
  export interface PostLike {
	Id: number;
	PostId: number;
	UserId: number;
	CreatedAt: number;
  }
  
  // PostFlags Table
  export interface PostFlag {
	Id: number;
	PostId: number;
	UserId: number;
	CreatedAt: number;
  }
  
  // PostEdits Table
  export interface PostEdit {
	Id: number;
	PostId: number;
	UserId: number;
	OldContent: string;
	NewContent: string;
	CreatedAt: number;
  }
  
  // DirectMessages Table
  export interface DirectMessage {
	Id: number;
	Content: string;
	IsRead: boolean;
	SenderId: number;
	RecipientId: number;
	CreatedAt: number;
  }
  
  // DirectMessageBlocks Table
  export interface DirectMessageBlock {
	Id: number;
	UserId: number;
	BlockedUserId: number;
	CreatedAt: number;
  }
  
  // Notifications Table
  export interface Notification {
	Id: number;
	Content: string;
	IsRead: boolean;
	UserId: number;
	CreatedAt: number;
  }
  
  // UserGroups Table
  export interface UserGroup {
	Id: number;
	Name: string;
	Description?: string | null;
	CreatedAt: number;
	UpdatedAt?: number | null;
  }
  
  // UserGroupMemberships Table
  export interface UserGroupMembership {
	Id: number;
	UserId: number;
	UserGroupId: number;
	CreatedAt: number;
  }
  
  // UserGroupPermissions Table
  export interface UserGroupPermission {
	Id: number;
	UserGroupId: number;
	CanView: boolean;
	CanCreateTopics: boolean;
	CanReply: boolean;
	CanEditOwnPosts: boolean;
	CanEditOthersPosts: boolean;
	CanDeleteOwnPosts: boolean;
	CanDeleteOthersPosts: boolean;
	CanCloseTopics: boolean;
	CanPinTopics: boolean;
	CanLockTopics: boolean;
	CanMoveTopics: boolean;
	CanMergeTopics: boolean;
	CanSplitTopics: boolean;
	CanFlagPosts: boolean;
	CanLikePosts: boolean;
	CanApprovePosts: boolean;
	CanApproveEdits: boolean;
	CanApproveUsers: boolean;
	CanBanUsers: boolean;
	CanLockUsers: boolean;
	CanEditUsers: boolean;
	CanEditGroups: boolean;
	CanEditPermissions: boolean;
	CanEditCategories: boolean;
	CanEditForums: boolean;
	CanEditSettings: boolean;
	CreatedAt: number;
	UpdatedAt?: number | null;
  }
  
  // Users Table
  export interface User {
	Id: number;
	Username: string;
	PasswordHash: string;
	EmailAddress: string;
	HoldPostsForReview: boolean;
	CreatedAt: number;
	UpdatedAt?: number | null;
  }
  