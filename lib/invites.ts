import db from '@/lib/db';

export async function resolveInvitesForEmail(email: string | null | undefined): Promise<void> {
  if (!email) return;

  const user = await db.user.findFirst({
    where: { email, deletedAt: null, isRegistered: true },
    select: { id: true },
  });
  if (!user) return;

  const invites = await db.groupInvite.findMany({
    where: { email, status: 'pending', group: { deletedAt: null } },
    select: { id: true, groupId: true },
  });
  if (invites.length === 0) return;

  const existingMemberships = await db.groupMember.findMany({
    where: { userId: user.id, groupId: { in: invites.map((i) => i.groupId) } },
    select: { groupId: true },
  });
  const memberGroupIds = new Set(existingMemberships.map((m) => m.groupId));

  await db.$transaction(
    invites
      .filter((invite) => !memberGroupIds.has(invite.groupId))
      .map((invite) =>
        db.groupMember.create({ data: { groupId: invite.groupId, userId: user.id } }),
      ),
  );

  await db.groupInvite.updateMany({
    where: { id: { in: invites.map((i) => i.id) } },
    data: { status: 'joined', resolvedAt: new Date() },
  });
}

export type NoticeItem =
  | { kind: 'group'; inviteId: string; groupName: string; inviterName: string; resolvedAt: Date }
  | { kind: 'friend'; noticeId: string; friendName: string; friendId: string | null; createdAt: Date };

export async function listPendingNotices(
  email: string | null | undefined,
  userId: string,
): Promise<NoticeItem[]> {
  const groupNotices: NoticeItem[] = email
    ? (
        await db.groupInvite.findMany({
          where: { email, status: 'joined', noticeSeenAt: null, group: { deletedAt: null } },
          include: {
            group: { select: { name: true } },
            inviter: { select: { name: true } },
          },
          orderBy: { resolvedAt: 'desc' },
        })
      ).map((invite) => ({
        kind: 'group' as const,
        inviteId: invite.id,
        groupName: invite.group.name,
        inviterName: invite.inviter.name,
        resolvedAt: invite.resolvedAt ?? new Date(),
      }))
    : [];

  const friendNotices: NoticeItem[] = (
    await db.notice.findMany({
      where: { userId, type: 'friend_joined', readAt: null },
      select: { id: true, friendName: true, friendId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  ).map((notice) => ({
    kind: 'friend' as const,
    noticeId: notice.id,
    friendName: notice.friendName,
    friendId: notice.friendId,
    createdAt: notice.createdAt,
  }));

  return [...groupNotices, ...friendNotices];
}
