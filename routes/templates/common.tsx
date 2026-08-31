import { FC, PropsWithChildren } from "hono/jsx";

/**
 * @deprecated
 */
export const Layout: FC<PropsWithChildren> = (props) => (
  <html>
    <head>
      <title>D2Starfire</title>
      <script
        dangerouslySetInnerHTML={{
          __html: `
if(!customElements.get('local-time')) {
  customElements.define('local-time', class extends HTMLElement {
      connectedCallback() {
          const datetime = this.getAttribute('datetime');
          if (!datetime) return;
          setTimeout(() => {
              const date = new Date(datetime);
              this.textContent = date.toLocaleString();
          }, 0);
      }
  });
}`,
        }}
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      ></link>
    </head>
    <body>{props.children}</body>
  </html>
);

export const Table = (data: unknown) => (
  <table>
    <tbody>
      {Object.entries(data).map(([key, value]) => (
        <tr>
          <td>{String(key)}</td>
          <td>{String(value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
