import { GeneralUser } from "bungie-api-ts/user";
import { getBungieName, UserInfoAndLastSeenDate } from "./d2.ts";
import { Table } from "./tsx-helper.tsx";

export const RequireLoginMessage = () => (
  <pre>This endpoint requires OAuth2 login.</pre>
);

export const UserCard = (u: GeneralUser) => (
  <article>
    <header>
      <h3>
        {getBungieName(
          u.cachedBungieGlobalDisplayName,
          u.cachedBungieGlobalDisplayNameCode,
        )}
      </h3>
    </header>
    {Table(u)}
  </article>
);

export const StaleFriendList = (list: UserInfoAndLastSeenDate[]) => (
  <table>
    <thead>
      <tr>
        <td></td>
        <td>Friend Name</td>
        <td>Last Seen Date</td>
      </tr>
    </thead>
    <tbody>
      {list.map((d, idx) => {
        const isoString = d.lastSeen ? d.lastSeen.toISOString() : undefined;
        return (
          <tr>
            <td>{idx + 1}</td>
            <td>
              {getBungieName(
                d.user.bungieGlobalDisplayName,
                d.user.bungieGlobalDisplayNameCode,
              )}
            </td>
            <td>{isoString ?? "UNKNOWN"}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);
