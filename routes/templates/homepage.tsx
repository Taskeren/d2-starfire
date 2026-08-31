export const Homepage = (loggedIn: boolean) => (
  <html>
    <head>
      <title>D2 Starfire</title>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      ></link>
      <script
        src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.10/dist/htmx.min.js"
        integrity="sha384-H5SrcfygHmAuTDZphMHqBJLc3FhssKjG7w/CeCpFReSfwBWDTKpkzPP8c+cLsK+V"
        crossorigin="anonymous"
      ></script>
    </head>
    <body>
      <header class="container">
        <nav>
          <ul>
            <li>
              <strong>D2 Starfire</strong>
            </li>
          </ul>
          <ul>
            <li>
              {!loggedIn ? (
                <a href="/auth/login">Log In</a>
              ) : (
                <a href="/auth/logout">Log Out</a>
              )}
            </li>
          </ul>
        </nav>
      </header>
      <main class="container" hx-headers='{"Accept": "text/html"}'>
        <article>
          <header>
            <h3>User Information</h3>
            <p>Fetch the current user information.</p>
          </header>
          <button
            type="button"
            hx-get="/auth/usercard"
            hx-target="#usercard"
            hx-indicator="#usercardloading"
          >
            Load
          </button>
          <div id="usercardloading" class="htmx-indicator" aria-busy="true">
            Connecting Destiny 2 API...
          </div>
          <div id="usercard"></div>
        </article>
        <article>
          <header>
            <h3>Stale Friend List</h3>
            <p>
              List the friend list of the current user, sorted by the last
              played date.
            </p>
          </header>
          <button
            type="button"
            hx-get="/d2/stale-friend-list"
            hx-target="#stalefriendlist"
            hx-indicator="#stalefriendlistloading"
          >
            Load
          </button>
          <div
            id="stalefriendlistloading"
            class="htmx-indicator"
            aria-busy="true"
          >
            Connecting Destiny 2 API...
          </div>
          <div id="stalefriendlist"></div>
        </article>
      </main>
      <footer class="container">
        <hr />
        <p style={{ "text-align": "center" }}>
          2026 &copy; The Genius Warlock (Taskeren).
          <br />
          <small>
            Repository on{" "}
            <a href="https://github.com/Taskeren/d2-starfire">GitHub</a> and
            Hosted on Deno Deploy.
            <br />
            By the way, see <a href="https://activism.taske.ren">Activism Report</a> also.
          </small>
        </p>
      </footer>
    </body>
  </html>
);
