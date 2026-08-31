export const Unauthorized = () => (
  <html>
    <head>
      <title>Unauthorized</title>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <meta http-equiv="refresh" content="5;url=/" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      ></link>
    </head>
    <body>
      <div class="container">
        <h1>Unauthorized!</h1>
        <p>
          You will be redirect to <a href="/">homepage</a> in 5 seconds.
        </p>
      </div>
    </body>
  </html>
);
