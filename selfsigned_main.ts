import fs from "node:fs";
import selfsigned from "selfsigned";

if (!fs.existsSync("key.pem") || fs.existsSync("cert.pem")) {
  console.log("Generating selfsigned certifications!");
  const cert = await selfsigned.generate(
    [{ name: "commonName", value: "127.0.0.1" }],
    {},
  );

  fs.writeFileSync("key.pem", cert.private, "utf-8");
  fs.writeFileSync("cert.pem", cert.cert, "utf-8");
}
