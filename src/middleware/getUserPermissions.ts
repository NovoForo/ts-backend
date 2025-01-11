import getUserIdFromJwt from "./getUserIdFromJwt"

interface UserForumPermissions {
    CanView: Boolean,
    CanCreateTopics: Boolean,
    CanReply: Boolean,
    CanEditOwnPosts: Boolean,
    CanEditOthersPosts: Boolean,
    CanDeleteOwnPosts: Boolean,
    CanDeleteOthersPosts: Boolean,
    CanCloseTopics: Boolean,
    CanPinTopics: Boolean;
    CanLockTopics: Boolean,
    CanMoveTopics: Boolean,
    CanMergeTopics: Boolean,
    CanSplitTopics: Boolean,
    CanFlagPosts: Boolean,
    CanLikePosts: Boolean,
    CanApprovePosts: Boolean,
    CanApproveEdits: Boolean,
    CanApproveUsers: Boolean,
    CanBanUsers: Boolean,
    CanLockUsers: Boolean,
    CanEditUsers: Boolean,
    CanEditGroups: Boolean,
    CanEditPermissions: Boolean,
    CanEditCategories: Boolean,
    CanEditForums: Boolean,
    CanEditSettings: Boolean,
} 

async function getUserPermissions(request: Request, env: Env): Promise<UserForumPermissions> {
    const userId = await getUserIdFromJwt(request);
    // const user = await env.DB.prepare('SELECT * FROM Users WHERE id = ?').bind(userId).first();
    const userGroupMembershipResult = await env.DB.prepare('SELECT * FROM UserGroupMemberships WHERE UserId = ?').bind(userId).all();
    const userGroupMembership = userGroupMembershipResult.results;

    // Set Initial Permissions
    let CanView = false;
    let CanCreateTopics = false;
    let CanReply = false;
    let CanEditOwnPosts = false;
    let CanEditOthersPosts = false;
    let CanDeleteOwnPosts = false;
    let CanDeleteOthersPosts = false;
    let CanCloseTopics = false;
    let CanPinTopics = false;
    let CanLockTopics = false;
    let CanMoveTopics = false;
    let CanMergeTopics = false;
    let CanSplitTopics = false;
    let CanFlagPosts = false;
    let CanLikePosts = false;
    let CanApprovePosts = false;
    let CanApproveEdits = false;
    let CanApproveUsers = false;
    let CanBanUsers = false;
    let CanLockUsers = false;
    let CanEditUsers = false;
    let CanEditGroups = false;
    let CanEditPermissions = false;
    let CanEditCategories = false;
    let CanEditForums = false;
    let CanEditSettings = false;

    // Iterate through the user's groups and set permissions
    const userGroupMembershipPromises = userGroupMembership.map(async (membership) => {
        // Get the group
        let userGroup = null;
        try {
            userGroup = await env.DB.prepare('SELECT * FROM UserGroups WHERE id = ?').bind(membership.UserGroupId).first();
            // Process userGroup as needed
        } catch (error) {
            console.error('Error fetching user group:', error);
        }

        // Get the group permissions
        let groupPermissions: UserForumPermissions | null = null;
        let groupPermissionsResult = null;
        if (!userGroup || userGroup.Id === undefined || userGroup.Id === null) {
            console.error('Invalid userGroup or missing id:', userGroup);
            groupPermissions = null;
        } else {
            try {
                groupPermissionsResult = await env.DB.prepare('SELECT * FROM UserGroupPermissions WHERE UserGroupId = ?')
                    .bind(userGroup.Id)
                    .all();

                if (!groupPermissionsResult || !groupPermissionsResult.results) {
                    console.error('Invalid result structure:', groupPermissionsResult);
                    groupPermissions = null;
                } else {
                    groupPermissions = groupPermissionsResult.results.length > 0 
                        ? (groupPermissionsResult.results[0] as unknown as UserForumPermissions) 
                        : null;
                }
            } catch (error: any) {
                console.error('Error fetching group permissions:', error.message);
                console.error(error.stack);
                groupPermissions = null;
            }
        }


        // Grant the permission if true
        if (groupPermissions) {
            if (groupPermissions.CanView) {
                CanView = true;
            }

            if (groupPermissions.CanCreateTopics) {
                CanCreateTopics = true;
            }

            if (groupPermissions.CanReply) {
                CanReply = true;
            }

            if (groupPermissions.CanEditOwnPosts) {
                CanEditOwnPosts = true;
            }

            if (groupPermissions.CanEditOthersPosts) {
                CanEditOthersPosts = true;
            }

            if (groupPermissions.CanDeleteOwnPosts) {
                CanDeleteOwnPosts = true;
            }

            if (groupPermissions.CanDeleteOthersPosts) {
                CanDeleteOthersPosts = true;
            }

            if (groupPermissions.CanCloseTopics) {
                CanCloseTopics = true;
            }

            if (groupPermissions.CanPinTopics) {
                CanPinTopics = true;
            }

            if (groupPermissions.CanLockTopics) {
                CanLockTopics = true;
            }

            if (groupPermissions.CanMoveTopics) {
                CanMoveTopics = true;
            }

            if (groupPermissions.CanMergeTopics) {
                CanMergeTopics = true;
            }

            if (groupPermissions.CanSplitTopics) {
                CanSplitTopics = true;
            }

            if (groupPermissions.CanFlagPosts) {
                CanFlagPosts = true;
            }

            if (groupPermissions.CanLikePosts) {
                CanLikePosts = true;
            }

            if (groupPermissions.CanApprovePosts) {
                CanApprovePosts = true;
            }

            if (groupPermissions.CanApproveEdits) {
                CanApproveEdits = true;
            }

            if (groupPermissions.CanApproveUsers) {
                CanApproveUsers = true;
            }

            if (groupPermissions.CanBanUsers) {
                CanBanUsers = true;
            }

            if (groupPermissions.CanLockUsers) {
                CanLockUsers = true;
            }

            if (groupPermissions.CanEditUsers) {
                CanEditUsers = true;
            }

            if (groupPermissions.CanEditGroups) {
                CanEditGroups = true;
            }

            if (groupPermissions.CanEditPermissions) {
                CanEditPermissions = true;
            }

            if (groupPermissions.CanEditCategories) {
                CanEditCategories = true;
            }

            if (groupPermissions.CanEditForums) {
                CanEditForums = true;
            }

            if (groupPermissions.CanEditSettings) {
                CanEditSettings = true;
            }
        }
    });

    await Promise.all(userGroupMembershipPromises);

    return {
        CanView: CanView,
        CanCreateTopics: CanCreateTopics,
        CanReply: CanReply,
        CanEditOwnPosts: CanEditOwnPosts,
        CanEditOthersPosts: CanEditOthersPosts,
        CanDeleteOwnPosts: CanDeleteOwnPosts,
        CanDeleteOthersPosts: CanDeleteOthersPosts,
        CanCloseTopics: CanCloseTopics,
        CanPinTopics: CanPinTopics,
        CanLockTopics: CanLockTopics,
        CanMoveTopics: CanMoveTopics,
        CanMergeTopics: CanMergeTopics,
        CanSplitTopics: CanSplitTopics,
        CanFlagPosts: CanFlagPosts,
        CanLikePosts: CanLikePosts,
        CanApprovePosts: CanApprovePosts,
        CanApproveEdits: CanApproveEdits,
        CanApproveUsers: CanApproveUsers,
        CanBanUsers: CanBanUsers,
        CanLockUsers: CanLockUsers,
        CanEditUsers: CanEditUsers,
        CanEditGroups: CanEditGroups,
        CanEditPermissions: CanEditPermissions,
        CanEditCategories: CanEditCategories,
        CanEditForums: CanEditForums,
        CanEditSettings: CanEditSettings,
    }    
}

export default getUserPermissions;