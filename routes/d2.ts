import {
  BungieMembershipType,
  DestinyComponentType,
  DestinyProfileComponent,
  getProfile,
  PlatformErrorCodes,
} from "bungie-api-ts/destiny2";
import {
  BungieFriend,
  getFriendList,
  PresenceStatus,
} from "bungie-api-ts/social";
import { Hono } from "hono";
import { accepts } from "hono/accepts";
import { AuthenticationError } from "../components/bungie.ts";
import { bungieClient } from "../components/bungie.ts";
import { HonoSpec } from "../main.ts";
import { StaleFriendList } from "./templates/d2.tsx";

const hono: HonoSpec = new Hono();

export default hono;

export function getBungieName(bungieName: string, bungieCode?: number): string {
  return (
    bungieName +
    "#" +
    (bungieCode ? bungieCode.toString().padStart(4, "0") : "????")
  );
}

export type UserInfoAndLastSeenDate = {
  user: BungieFriend;
  profile?: DestinyProfileComponent | null;
  lastSeen: Date | null;
};

hono.get("/stale-friend-list", async (ctx) => {
  const loginAs = ctx.get("loginAs");
  if (!loginAs) throw new AuthenticationError();

  const c = bungieClient({ loginAs, ctx });

  const getFriendListResponse = await getFriendList(c);
  if (getFriendListResponse.ErrorCode !== PlatformErrorCodes.Success) {
    console.debug("Social.GetFriendList", getFriendListResponse);
    return ctx.text("Bungie API returned an error.", 500);
  }

  const { friends } = getFriendListResponse.Response;
  console.debug("Friend List (size)", friends.length);

  const now = new Date();
  const list: UserInfoAndLastSeenDate[] = await Promise.all(
    friends.map(async (f) => {
      const profile =
        f.onlineStatus === PresenceStatus.Online
          ? undefined
          : await getUserProfile(f);
      const lastSeen =
        f.onlineStatus === PresenceStatus.Online
          ? now
          : profile
            ? new Date(profile.dateLastPlayed)
            : null;
      return {
        user: f,
        profile,
        lastSeen,
      } satisfies UserInfoAndLastSeenDate;
    }),
  );

  // sort the list by the rule:
  // a) the nulls shows first.
  // b) the earlier date shows ahead.
  list.sort((a, b) => {
    return (
      (a.lastSeen?.getTime() ?? -Infinity) -
      (b.lastSeen?.getTime() ?? -Infinity)
    );
  });

  const accept = accepts(ctx, {
    header: "Accept",
    supports: ["application/json", "text/html"],
    default: "application/json",
  });

  if (accept === "text/html") {
    return ctx.html(StaleFriendList(list));
  } else {
    return ctx.json(list);
  }

  async function getUserProfile(
    f: BungieFriend,
  ): Promise<DestinyProfileComponent | null> {
    // skip invalid membership types, which will cause error
    if (
      f.lastSeenAsBungieMembershipType === BungieMembershipType.None ||
      f.lastSeenAsBungieMembershipType === BungieMembershipType.BungieNext ||
      f.lastSeenAsBungieMembershipType === BungieMembershipType.All
    ) {
      return null;
    }

    const getProfileResponse = await getProfile(c, {
      membershipType: f.lastSeenAsBungieMembershipType,
      destinyMembershipId: f.lastSeenAsMembershipId,
      components: [DestinyComponentType.Profiles],
    });

    // return null for unavailable users.
    if (getProfileResponse.ErrorCode !== PlatformErrorCodes.Success) {
      console.debug("Destiny2.GetProfile failure", getProfileResponse);
      return null;
    }

    const { profile } = getProfileResponse.Response;
    return profile.data!;
  }
});
